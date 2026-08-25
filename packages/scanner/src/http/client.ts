import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { URL } from 'url';

export interface HttpClientConfig {
  timeoutMs?: number;
  maxResponseSizeBytes?: number;
  allowLocalhost?: boolean; // For development testing
}

export class ScannerHttpClient {
  private client: AxiosInstance;
  private maxResponseSize: number;
  private allowLocalhost: boolean;

  constructor(config: HttpClientConfig = {}) {
    this.maxResponseSize = config.maxResponseSizeBytes || 5 * 1024 * 1024; // 5MB default
    this.allowLocalhost = config.allowLocalhost ?? true; // Default true for our lab

    this.client = axios.create({
      timeout: config.timeoutMs || 5000,
      maxContentLength: this.maxResponseSize,
      validateStatus: () => true, // We want to inspect all status codes, even 4xx and 5xx
      // Do not follow redirects automatically so we can inspect them if needed
      maxRedirects: 0, 
    });
  }

  /**
   * Validates a URL for basic SSRF protection.
   * Rejects cloud metadata, private IPs (unless allowLocalhost is true for lab).
   */
  private validateUrl(targetUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      throw new Error('Invalid URL format');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}. Only http and https are allowed.`);
    }

    const hostname = parsed.hostname;

    // Basic Cloud Metadata Check (AWS, GCP, Azure, DigitalOcean)
    if (hostname === '169.254.169.254') {
      throw new Error('SSRF Protection: Access to cloud metadata endpoints is forbidden.');
    }

    // Localhost override for our development lab
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && !this.allowLocalhost) {
      throw new Error('SSRF Protection: Access to localhost is forbidden in this environment.');
    }

    return parsed;
  }

  /**
   * Make a controlled GET request
   */
  public async get(url: string): Promise<AxiosResponse> {
    this.validateUrl(url);
    try {
      return await this.client.get(url);
    } catch (error: any) {
      // Axios throws if response exceeds maxContentLength
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out');
      }
      if (error.message.includes('maxContentLength')) {
         throw new Error(`Response exceeded maximum size of ${this.maxResponseSize} bytes`);
      }
      throw new Error(`HTTP Request failed: ${error.message}`);
    }
  }
}
