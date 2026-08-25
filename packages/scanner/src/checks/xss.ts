import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ActiveScannerContext, ActiveScannerModule } from '../engine/types';

export class XssScanner implements ActiveScannerModule {
  name = 'ReflectedXSS';

  async run(context: ActiveScannerContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const marker = `wgtest${Math.floor(Math.random() * 100000)}`;
    
    try {
      const url = new URL(context.url);
      url.searchParams.set(context.parameter, marker);
      
      const response = await context.client.get(url.toString());
      const bodyString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      if (bodyString.includes(marker)) {
        findings.push({
          id: uuidv4(),
          title: 'Reflected Input (Potential XSS)',
          category: 'Input Validation',
          severity: 'MEDIUM',
          status: 'POTENTIAL',
          description: `The input provided in the '${context.parameter}' parameter was reflected directly in the HTTP response.`,
          impact: 'If the application does not properly sanitize or encode this input before rendering it in HTML, it may be vulnerable to Cross-Site Scripting (XSS).',
          evidence: `Injected payload: ${marker}\nReflected in response body.`,
          recommendation: 'Ensure all user-supplied input is contextually encoded (e.g., HTML entity encoding) before being rendered in the browser.',
          affectedUrl: context.url,
          affectedParameter: context.parameter,
          scannerModule: this.name,
          references: ['https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'],
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      // Ignore network errors during active scanning
    }
    
    return findings;
  }
}
