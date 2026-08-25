import { describe, it, expect } from 'vitest';
import { CorsScanner } from '../src/checks/cors';
import { ScannerContext } from '../src/engine/types';

describe('CorsScanner', () => {
  it('should flag wildcard with credentials', () => {
    const scanner = new CorsScanner();
    const context = {
      url: 'http://example.com',
      bodyString: '',
      response: {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-credentials': 'true'
        }
      }
    } as unknown as ScannerContext;
    
    const findings = scanner.run(context);
    expect(findings.length).toBe(1);
    expect(findings[0].title).toContain('Insecure CORS Policy');
    expect(findings[0].severity).toBe('HIGH');
  });

  it('should ignore missing CORS headers', () => {
    const scanner = new CorsScanner();
    const context = {
      url: 'http://example.com',
      bodyString: '',
      response: { headers: {} }
    } as unknown as ScannerContext;
    
    const findings = scanner.run(context);
    expect(findings.length).toBe(0);
  });
});
