import { describe, it, expect } from 'vitest';
import { CookieSecurityScanner } from '../src/checks/cookies';
import { ScannerContext } from '../src/engine/types';

describe('CookieSecurityScanner', () => {
  it('should detect missing HttpOnly', () => {
    const scanner = new CookieSecurityScanner();
    const context = {
      url: 'http://example.com',
      bodyString: '',
      response: {
        headers: {
          'set-cookie': ['session=123; Secure']
        }
      }
    } as unknown as ScannerContext;
    
    const findings = scanner.run(context);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].title).toContain('HttpOnly');
  });
});
