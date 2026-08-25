import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { FormScannerContext, FormScannerModule } from '../engine/types';

export class CsrfScanner implements FormScannerModule {
  name = 'CSRF';

  run(context: FormScannerContext): Finding[] {
    const findings: Finding[] = [];
    
    // We only care about state-changing methods
    if (context.method === 'GET' || context.method === 'HEAD' || context.method === 'OPTIONS') {
      return findings;
    }

    // Look for common CSRF token input names
    const csrfIndicators = ['csrf', 'token', 'authenticity_token', '_csrf', 'xsrf'];
    
    const hasCsrfToken = context.inputs.some(input => 
      csrfIndicators.some(indicator => input.toLowerCase().includes(indicator))
    );

    if (!hasCsrfToken) {
      findings.push({
        id: uuidv4(),
        title: 'Missing CSRF Token in Form',
        category: 'Broken Access Control',
        severity: 'MEDIUM',
        status: 'POTENTIAL',
        description: `The form targeting ${context.action} uses a state-changing method (${context.method}) but does not appear to contain a CSRF token.`,
        impact: 'If the application relies solely on session cookies for authentication, attackers may be able to forge requests on behalf of authenticated users.',
        evidence: `Form Action: ${context.action}\nMethod: ${context.method}\nInputs detected: ${context.inputs.join(', ')}`,
        recommendation: 'Implement Anti-CSRF tokens for all state-changing requests, and consider using SameSite=Lax or Strict for session cookies.',
        affectedUrl: context.url,
        affectedParameter: context.action,
        scannerModule: this.name,
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'],
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  }
}
