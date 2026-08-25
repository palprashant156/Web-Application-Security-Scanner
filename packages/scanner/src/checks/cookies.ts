import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScannerContext, ScannerModule } from '../engine/types';

export class CookieSecurityScanner implements ScannerModule {
  name = 'CookieSecurity';

  run(context: ScannerContext): Finding[] {
    const findings: Finding[] = [];
    const setCookieHeaders = context.response.headers['set-cookie'];

    if (!setCookieHeaders) {
      return findings;
    }

    const createFinding = (
      title: string,
      severity: Finding['severity'],
      description: string,
      recommendation: string,
      cookieName: string
    ): Finding => ({
      id: uuidv4(),
      title,
      category: 'Security Misconfiguration',
      severity,
      status: 'POTENTIAL',
      description,
      impact: 'Increases the risk of session hijacking or Cross-Site Request Forgery (CSRF).',
      evidence: `Cookie Name: ${cookieName}\nTarget URL: ${context.url}`,
      recommendation,
      affectedUrl: context.url,
      affectedParameter: cookieName,
      scannerModule: this.name,
      references: ['https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies'],
      timestamp: new Date().toISOString(),
    });

    setCookieHeaders.forEach(cookieStr => {
      // Split by ';' to isolate attributes, taking the first part as the name=value
      const parts = cookieStr.split(';').map(p => p.trim());
      const nameValue = parts[0];
      const cookieName = nameValue.split('=')[0];

      // We mask the value by not logging the whole cookieStr
      const attributes = parts.slice(1).map(a => a.toLowerCase());

      const hasHttpOnly = attributes.includes('httponly');
      const hasSecure = attributes.includes('secure');
      const hasSameSite = attributes.some(a => a.startsWith('samesite=strict') || a.startsWith('samesite=lax'));

      if (!hasHttpOnly) {
        findings.push(createFinding(
          'Cookie Missing HttpOnly Flag',
          'HIGH',
          `The cookie '${cookieName}' does not have the HttpOnly flag set.`,
          'Set the HttpOnly flag to prevent client-side scripts from accessing the cookie, mitigating XSS risks.',
          cookieName
        ));
      }

      if (context.url.startsWith('https') && !hasSecure) {
        findings.push(createFinding(
          'Cookie Missing Secure Flag',
          'MEDIUM',
          `The cookie '${cookieName}' does not have the Secure flag set on an HTTPS connection.`,
          'Set the Secure flag to ensure the cookie is only transmitted over encrypted connections.',
          cookieName
        ));
      }

      if (!hasSameSite) {
        findings.push(createFinding(
          'Cookie Missing SameSite Flag',
          'MEDIUM',
          `The cookie '${cookieName}' does not have a secure SameSite attribute (Strict or Lax).`,
          'Set SameSite=Strict or SameSite=Lax to protect against Cross-Site Request Forgery (CSRF) attacks.',
          cookieName
        ));
      }
    });

    return findings;
  }
}
