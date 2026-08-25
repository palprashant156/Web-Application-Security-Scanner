import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScannerContext, ScannerModule } from '../engine/types';

export class SecurityHeadersScanner implements ScannerModule {
  name = 'SecurityHeaders';

  run(context: ScannerContext): Finding[] {
    const findings: Finding[] = [];
    const headers = context.response.headers;
    const url = context.url;

    const createFinding = (
      title: string,
      severity: Finding['severity'],
      description: string,
      recommendation: string,
      status: Finding['status'] = 'POTENTIAL'
    ): Finding => ({
      id: uuidv4(),
      title,
      category: 'Security Misconfiguration',
      severity,
      status,
      description,
      impact: 'Reduces the defense-in-depth posture of the application.',
      evidence: `Target URL: ${url}`,
      recommendation,
      affectedUrl: url,
      scannerModule: this.name,
      references: ['https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html'],
      timestamp: new Date().toISOString(),
    });

    if (!headers['content-security-policy']) {
      findings.push(createFinding(
        'Missing Content-Security-Policy',
        'MEDIUM',
        'The target response does not include a Content-Security-Policy (CSP) header.',
        'Configure a CSP appropriate for the application to mitigate Cross-Site Scripting (XSS) and data injection attacks.'
      ));
    }

    if (url.startsWith('https') && !headers['strict-transport-security']) {
      findings.push(createFinding(
        'Missing Strict-Transport-Security (HSTS)',
        'MEDIUM',
        'The target response over HTTPS is missing the HSTS header.',
        'Ensure HSTS is enforced to protect against protocol downgrade attacks.'
      ));
    }

    if (headers['x-content-type-options'] !== 'nosniff') {
      findings.push(createFinding(
        'Missing or Misconfigured X-Content-Type-Options',
        'LOW',
        'The X-Content-Type-Options header is either missing or not set to "nosniff".',
        'Set X-Content-Type-Options: nosniff to prevent MIME-sniffing attacks.'
      ));
    }

    if (!headers['x-frame-options'] && !headers['content-security-policy']?.includes('frame-ancestors')) {
      findings.push(createFinding(
        'Missing Clickjacking Protection',
        'LOW',
        'The response does not set X-Frame-Options or CSP frame-ancestors.',
        'Set X-Frame-Options to DENY or SAMEORIGIN, or use CSP frame-ancestors to prevent clickjacking.'
      ));
    }

    if (!headers['referrer-policy']) {
      findings.push(createFinding(
        'Missing Referrer-Policy',
        'INFO',
        'The Referrer-Policy header is missing, which may leak sensitive URLs to third parties.',
        'Set Referrer-Policy to strict-origin-when-cross-origin or similar safe default.'
      ));
    }

    if (!headers['permissions-policy']) {
      findings.push(createFinding(
        'Missing Permissions-Policy',
        'INFO',
        'The Permissions-Policy header is not present.',
        'Use Permissions-Policy to explicitly disable access to powerful browser features.'
      ));
    }

    return findings;
  }
}
