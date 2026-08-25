import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScannerContext, ScannerModule } from '../engine/types';

export class CorsScanner implements ScannerModule {
  name = 'CORS';

  run(context: ScannerContext): Finding[] {
    const findings: Finding[] = [];
    const headers = context.response.headers;
    const url = context.url;

    const allowOrigin = headers['access-control-allow-origin'];
    const allowCredentials = headers['access-control-allow-credentials'];

    if (!allowOrigin) {
      return findings;
    }

    const createFinding = (
      title: string,
      severity: Finding['severity'],
      description: string,
      recommendation: string
    ): Finding => ({
      id: uuidv4(),
      title,
      category: 'Security Misconfiguration',
      severity,
      status: 'POTENTIAL',
      description,
      impact: 'Allows malicious websites to read sensitive data from authenticated users.',
      evidence: `Target URL: ${url}\nAccess-Control-Allow-Origin: ${allowOrigin}\nAccess-Control-Allow-Credentials: ${allowCredentials || 'Not Set'}`,
      recommendation,
      affectedUrl: url,
      scannerModule: this.name,
      references: ['https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#cross-origin-resource-sharing-cors'],
      timestamp: new Date().toISOString(),
    });

    const isWildcard = allowOrigin === '*';
    const isCredentialsAllowed = allowCredentials === 'true';

    if (isWildcard && isCredentialsAllowed) {
      findings.push(createFinding(
        'Insecure CORS Policy (Wildcard with Credentials)',
        'HIGH',
        'The CORS policy allows any origin (*) and also allows credentials. This is technically forbidden by modern browsers but indicates a severely misconfigured server.',
        'Never use the wildcard (*) origin when Access-Control-Allow-Credentials is true. Specify trusted origins explicitly.'
      ));
    } else if (isWildcard) {
      findings.push(createFinding(
        'Overly Permissive CORS Policy',
        'INFO',
        'The CORS policy allows any origin (*). This is acceptable for public unauthenticated APIs, but dangerous if the endpoint handles sensitive data.',
        'If this endpoint handles sensitive data, restrict Access-Control-Allow-Origin to trusted domains.'
      ));
    }

    return findings;
  }
}
