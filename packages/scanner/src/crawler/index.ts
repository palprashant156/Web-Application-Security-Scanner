import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { ScannerHttpClient } from '../http/client';

export interface CrawlerOptions {
  maxDepth?: number;
  maxPages?: number;
  concurrency?: number;
}

export interface CrawlResult {
  pages: string[];
  forms: { url: string; action: string; method: string; inputs: string[] }[];
  parameters: { url: string; param: string }[]; // A parameter discovered on a URL
  endpoints: string[];
  requestsMade: number;
}

export class Crawler {
  private maxDepth: number;
  private maxPages: number;
  private concurrency: number;
  private client: ScannerHttpClient;
  
  private visitedUrls = new Set<string>();
  private pages: string[] = [];
  private forms: CrawlResult['forms'] = [];
  private parameters: Set<string> = new Set();
  private endpoints: Set<string> = new Set();
  private requestsMade = 0;

  constructor(client: ScannerHttpClient, options: CrawlerOptions = {}) {
    this.client = client;
    this.maxDepth = options.maxDepth || 3;
    this.maxPages = options.maxPages || 20; // Keep small for safe testing
    this.concurrency = options.concurrency || 2;
  }

  /**
   * Normalize a URL to avoid duplicate crawls
   * Strips fragments (#) and standardizes slashes
   */
  public normalizeUrl(urlStr: string, baseUrlStr: string): string | null {
    try {
      const url = new URL(urlStr, baseUrlStr);
      // Strip fragment
      url.hash = '';
      return url.toString();
    } catch {
      return null;
    }
  }

  /**
   * Check if a URL belongs to the same origin (scope)
   */
  public isSameScope(urlStr: string, targetOrigin: string): boolean {
    try {
      const url = new URL(urlStr);
      const target = new URL(targetOrigin);
      return url.origin === target.origin;
    } catch {
      return false;
    }
  }

  public async crawl(startUrl: string): Promise<CrawlResult> {
    const targetOrigin = new URL(startUrl).origin;
    const limit = pLimit(this.concurrency);
    
    let currentDepthUrls = [this.normalizeUrl(startUrl, startUrl)!];
    this.visitedUrls.add(currentDepthUrls[0]);
    this.endpoints.add(currentDepthUrls[0]);

    for (let depth = 0; depth <= this.maxDepth; depth++) {
      if (currentDepthUrls.length === 0 || this.pages.length >= this.maxPages) break;

      const nextDepthUrls = new Set<string>();

      const fetchPromises = currentDepthUrls.map(url => limit(async () => {
        if (this.pages.length >= this.maxPages) return;
        
        try {
          this.requestsMade++;
          const response = await this.client.get(url);
          this.pages.push(url);

          // Extract URL Query parameters
          try {
            const parsedUrl = new URL(url);
            parsedUrl.searchParams.forEach((_, key) => {
              this.parameters.add(JSON.stringify({ url: parsedUrl.origin + parsedUrl.pathname, param: key }));
            });
          } catch (e) {}

          // Only parse HTML
          const contentType = response.headers['content-type'];
          const contentTypeStr = typeof contentType === 'string' ? contentType : 
                                 (Array.isArray(contentType) ? contentType[0] : '');

          if (typeof response.data === 'string' && contentTypeStr.includes('text/html')) {
            const $ = cheerio.load(response.data);

            // Extract Links
            $('a').each((_, el) => {
              const href = $(el).attr('href');
              if (href) {
                const normalized = this.normalizeUrl(href, url);
                if (normalized && this.isSameScope(normalized, targetOrigin)) {
                  this.endpoints.add(normalized); // It's an endpoint even if we don't crawl it
                  if (!this.visitedUrls.has(normalized)) {
                    this.visitedUrls.add(normalized);
                    nextDepthUrls.add(normalized);
                  }
                }
              }
            });

            // Extract Forms
            $('form').each((_, el) => {
              const action = $(el).attr('action') || url;
              const method = ($(el).attr('method') || 'GET').toUpperCase();
              const inputs: string[] = [];
              
              $(el).find('input, select, textarea').each((_, inputEl) => {
                const name = $(inputEl).attr('name');
                if (name) inputs.push(name);
              });

              const normalizedAction = this.normalizeUrl(action, url);
              if (normalizedAction && this.isSameScope(normalizedAction, targetOrigin)) {
                this.forms.push({
                  url,
                  action: normalizedAction,
                  method,
                  inputs
                });
                
                // Add action to endpoints and possibly crawl if it's a GET form
                this.endpoints.add(normalizedAction);
                if (method === 'GET' && !this.visitedUrls.has(normalizedAction)) {
                   this.visitedUrls.add(normalizedAction);
                   nextDepthUrls.add(normalizedAction);
                }
              }
            });
          }
        } catch (error) {
          // Ignore fetch errors during crawl (e.g. 404s)
        }
      }));

      await Promise.all(fetchPromises);
      currentDepthUrls = Array.from(nextDepthUrls);
    }

    return {
      pages: this.pages,
      forms: this.forms,
      parameters: Array.from(this.parameters).map(p => JSON.parse(p)),
      endpoints: Array.from(this.endpoints),
      requestsMade: this.requestsMade
    };
  }
}
