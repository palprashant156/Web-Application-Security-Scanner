import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScannerContext, ScannerModule } from '../engine/types';

export class AuthScanner implements ScannerModule {
  name = 'Authentication';

  run(context: ScannerContext): Finding[] {
    const findings: Finding[] = [];
    
    // Check if the page contains login-like forms but is served over HTTP
    const isLoginEndpoint = context.url.toLowerCase().includes('login') || 
                            context.url.toLowerCase().includes('signin');
    
    const isHttp = context.url.startsWith('http://');

    if (isLoginEndpoint && isHttp) {
      findings.push({
        id: uuidv4(),
        title: 'Authentication Over Unencrypted Channel (HTTP)',
        category: 'Identification and Authentication Failures',
        severity: 'HIGH',
        status: 'CONFIRMED',
        description: `An authentication endpoint (${context.url}) is being served over unencrypted HTTP.`,
        impact: 'Credentials sent over this connection can be intercepted by network attackers via Man-In-The-Middle (MITM) attacks.',
        evidence: `Target URL: ${context.url}`,
        recommendation: 'Ensure all authentication endpoints and the entire application are served exclusively over HTTPS.',
        affectedUrl: context.url,
        scannerModule: this.name,
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html'],
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  }
}
