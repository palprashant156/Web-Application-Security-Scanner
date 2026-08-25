import { describe, it, expect } from 'vitest';
import { Crawler } from '../src/crawler';
import { ScannerHttpClient } from '../src/http/client';

describe('Crawler', () => {
  it('should normalize URLs by stripping fragments', () => {
    // Mock client isn't needed just to test normalizeUrl
    const crawler = new Crawler(new ScannerHttpClient());
    const normalized = crawler.normalizeUrl('http://example.com/page#section', 'http://example.com');
    expect(normalized).toBe('http://example.com/page');
  });

  it('should enforce scope validation', () => {
    const crawler = new Crawler(new ScannerHttpClient());
    expect(crawler.isSameScope('http://example.com/api', 'http://example.com')).toBe(true);
    expect(crawler.isSameScope('https://example.com/api', 'http://example.com')).toBe(false); // Different protocol
    expect(crawler.isSameScope('http://other.com/api', 'http://example.com')).toBe(false);
  });
});
