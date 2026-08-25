import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScannerContext, ScannerModule } from '../engine/types';

export class InfoDisclosureScanner implements ScannerModule {
  name = 'InfoDisclosure';

  run(context: ScannerContext): Finding[] {
    const findings: Finding[] = [];
    const headers = context.response.headers;
    const bodyString = context.bodyString;
    const url = context.url;

    const createFinding = (
      title: string,
      severity: Finding['severity'],
      description: string,
      evidence: string,
      recommendation: string
    ): Finding => ({
      id: uuidv4(),
      title,
      category: 'Information Disclosure',
      severity,
      status: 'CONFIRMED', // Header/body presence is factual
      description,
      impact: 'Provides attackers with valuable information about the backend technology stack, facilitating targeted attacks.',
      evidence: `Target URL: ${url}\n${evidence}`,
      recommendation,
      affectedUrl: url,
      scannerModule: this.name,
      references: ['https://cwe.mitre.org/data/definitions/200.html'],
      timestamp: new Date().toISOString(),
    });

    // 1. Check Server Header
    if (headers['server']) {
      findings.push(createFinding(
        'Server Version Disclosure',
        'INFO',
        'The server reveals its software and version information via the Server header.',
        `Server: ${headers['server']}`,
        'Configure the web server to suppress or obfuscate the Server header.'
      ));
    }

    // 2. Check X-Powered-By Header
    if (headers['x-powered-by']) {
      findings.push(createFinding(
        'Framework Disclosure (X-Powered-By)',
        'INFO',
        'The server reveals the application framework via the X-Powered-By header.',
        `X-Powered-By: ${headers['x-powered-by']}`,
        'Disable the X-Powered-By header in your application framework configuration.'
      ));
    }

    // 3. Check for Stack Traces in Body
    const stackTraceSignatures = [
      'at Error (native)',
      'at node:internal/',
      'java.lang.Exception:',
      'Traceback (most recent call last):',
      'System.Web.HttpException'
    ];

    for (const signature of stackTraceSignatures) {
      if (bodyString.includes(signature)) {
        findings.push(createFinding(
          'Stack Trace Disclosure',
          'HIGH',
          'The application leaked an internal stack trace in the HTTP response body.',
          `Found signature: "${signature}" in response body`,
          'Implement generic error handling and disable verbose error messages in production.'
        ));
        break; // One stack trace finding is enough
      }
    }

    // 4. Check for Directory Listing
    if (bodyString.includes('<title>Index of /') && bodyString.toLowerCase().includes('parent directory')) {
      findings.push(createFinding(
        'Directory Listing Enabled',
        'MEDIUM',
        'The server appears to have directory listing enabled, exposing file and folder structures.',
        'Found "Index of /" and "parent directory" in response body',
        'Disable directory browsing/listing in your web server configuration.'
      ));
    }

    return findings;
  }
}
