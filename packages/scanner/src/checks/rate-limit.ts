import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScannerContext, ScannerModule } from '../engine/types';
import { ScannerHttpClient } from '../http/client';

export class RateLimitScanner implements ScannerModule {
  name = 'RateLimiting';
  private client: ScannerHttpClient;

  constructor(client: ScannerHttpClient) {
    this.client = client;
  }

  async run(context: ScannerContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    // We only test rate limiting on a specific subset of endpoints to avoid flooding the whole app.
    // In a real scanner, we might only test login, registration, or API routes.
    // For this lab, if it's the root API or a login page, we'll test it.
    const isApiOrLogin = context.url.includes('/api/') || context.url.includes('login');
    
    if (!isApiOrLogin) return findings;

    let rateLimited = false;
    let maxRequests = 15;
    
    for (let i = 0; i < maxRequests; i++) {
      try {
        const response = await this.client.get(context.url);
        if (response.status === 429) {
          rateLimited = true;
          break;
        }
      } catch (e: any) {
        if (e.message.includes('429')) {
          rateLimited = true;
          break;
        }
      }
    }

    if (!rateLimited) {
      findings.push({
        id: uuidv4(),
        title: 'Lack of Rate Limiting Observed',
        category: 'Security Misconfiguration',
        severity: 'INFO',
        status: 'POTENTIAL',
        description: `No effective rate limiting (e.g., HTTP 429 Too Many Requests) was observed during a burst of ${maxRequests} requests.`,
        impact: 'Lack of rate limiting can lead to brute-force attacks on authentication endpoints or Denial of Service (DoS) conditions.',
        evidence: `Target URL: ${context.url}\nRequests fired: ${maxRequests}\nHTTP 429: Not Observed`,
        recommendation: 'Implement rate limiting based on IP address or API token to prevent abuse.',
        affectedUrl: context.url,
        scannerModule: this.name,
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html'],
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  }
}
