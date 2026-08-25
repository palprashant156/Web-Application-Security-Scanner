import { describe, it, expect } from 'vitest';
import { InfoDisclosureScanner } from '../src/checks/info-disclosure';
import { ScannerContext } from '../src/engine/types';

describe('InfoDisclosureScanner', () => {
  it('should detect stack traces in body', () => {
    const scanner = new InfoDisclosureScanner();
    const context = {
      url: 'http://example.com',
      bodyString: '<html><body>Error: java.lang.Exception: Null pointer</body></html>',
      response: { headers: {} }
    } as unknown as ScannerContext;
    
    const findings = scanner.run(context);
    expect(findings.length).toBe(1);
    expect(findings[0].title).toBe('Stack Trace Disclosure');
    expect(findings[0].severity).toBe('HIGH');
  });

  it('should detect server headers', () => {
    const scanner = new InfoDisclosureScanner();
    const context = {
      url: 'http://example.com',
      bodyString: '',
      response: {
        headers: {
          'server': 'Apache/2.4.41 (Ubuntu)'
        }
      }
    } as unknown as ScannerContext;
    
    const findings = scanner.run(context);
    expect(findings.length).toBe(1);
    expect(findings[0].title).toBe('Server Version Disclosure');
    expect(findings[0].severity).toBe('INFO');
  });
});
