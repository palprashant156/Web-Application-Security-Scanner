import { ScannerHttpClient, HttpClientConfig } from '../http/client';
import { ScannerContext, ScannerModule, ActiveScannerModule, ActiveScannerContext, FormScannerModule, FormScannerContext } from './types';
import { SecurityHeadersScanner } from '../checks/headers';
import { CookieSecurityScanner } from '../checks/cookies';
import { CorsScanner } from '../checks/cors';
import { InfoDisclosureScanner } from '../checks/info-disclosure';
import { XssScanner } from '../checks/xss';
import { SqliScanner } from '../checks/sqli';
import { CsrfScanner } from '../checks/csrf';
import { AuthScanner } from '../checks/auth';
import { RateLimitScanner } from '../checks/rate-limit';
import { Crawler, CrawlerOptions, CrawlResult } from '../crawler';
import { Finding } from '@webguard/shared';

export interface ScannerEngineConfig {
  http?: HttpClientConfig;
  crawler?: CrawlerOptions;
}

export interface ScanResult {
  findings: Finding[];
  stats: CrawlResult;
}

export class ScannerEngine {
  private client: ScannerHttpClient;
  private passiveModules: ScannerModule[];
  private activeModules: ActiveScannerModule[];
  private formModules: FormScannerModule[];
  private crawlerOptions?: CrawlerOptions;

  constructor(config?: ScannerEngineConfig) {
    this.client = new ScannerHttpClient(config?.http);
    this.crawlerOptions = config?.crawler;
    
    // Register passive scanner modules
    this.passiveModules = [
      new SecurityHeadersScanner(),
      new CookieSecurityScanner(),
      new CorsScanner(),
      new InfoDisclosureScanner(),
      new AuthScanner(),
      new RateLimitScanner(this.client)
    ];

    // Register active scanner modules
    this.activeModules = [
      new XssScanner(),
      new SqliScanner()
    ];

    // Register form scanner modules
    this.formModules = [
      new CsrfScanner()
    ];
  }

  /**
   * Run a full scan (Crawler -> Passive -> Active)
   */
  public async runFullScan(targetUrl: string, cancellationToken?: { isCancelled: boolean }): Promise<ScanResult> {
    let allFindings: Finding[] = [];
    
    // 1. Crawl the target
    if (this.crawlerOptions) {
      this.crawlerOptions.cancellationToken = cancellationToken;
    } else {
      this.crawlerOptions = { cancellationToken };
    }
    const crawler = new Crawler(this.client, this.crawlerOptions);
    const crawlStats = await crawler.crawl(targetUrl);

    // 2. Run passive checks on all discovered endpoints
    for (const endpoint of crawlStats.endpoints) {
      if (cancellationToken?.isCancelled) break;
      try {
        const response = await this.client.get(endpoint);
        const bodyString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        const context: ScannerContext = { url: endpoint, response, bodyString, cancellationToken };
        
        for (const module of this.passiveModules) {
          if (cancellationToken?.isCancelled) break;
          try {
            const findings = await module.run(context);
            allFindings = allFindings.concat(findings);
          } catch (e) {
            console.error(`Passive module ${module.name} failed on ${endpoint}:`, e);
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${endpoint} for passive scanning:`, e);
      }
    }

    // 3. Run active checks on all discovered parameters
    for (const paramData of crawlStats.parameters) {
      if (cancellationToken?.isCancelled) break;
      const context: ActiveScannerContext = {
        url: paramData.url,
        parameter: paramData.param,
        client: this.client,
        cancellationToken
      };

      for (const module of this.activeModules) {
        if (cancellationToken?.isCancelled) break;
        try {
          const findings = await module.run(context);
          allFindings = allFindings.concat(findings);
        } catch (e) {
          console.error(`Active module ${module.name} failed on ${paramData.url} (${paramData.param}):`, e);
        }
      }
    }

    // 4. Run form modules on all discovered forms
    for (const formData of crawlStats.forms) {
       if (cancellationToken?.isCancelled) break;
       const context: FormScannerContext = {
         ...formData,
         cancellationToken
       };
       for (const module of this.formModules) {
         if (cancellationToken?.isCancelled) break;
         try {
           const findings = await module.run(context);
           allFindings = allFindings.concat(findings);
         } catch (e) {
           console.error(`Form module ${module.name} failed on ${formData.url}:`, e);
         }
       }
    }

    return {
      findings: allFindings,
      stats: crawlStats
    };
  }
}

export * from '../http/client';
export * from './types';
export * from '../crawler';
export * from '../checks/headers';
export * from '../checks/cookies';
export * from '../checks/cors';
export * from '../checks/info-disclosure';
export * from '../checks/xss';
export * from '../checks/sqli';
export * from '../checks/csrf';
export * from '../checks/auth';
export * from '../checks/rate-limit';
