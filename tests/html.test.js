import { describe, expect, it } from 'vitest';

import { escapeHtml } from '../src/utils/html.js';

describe('HTML utilities', () => {
  it('escapes characters with special meaning in HTML', () => {
    expect(escapeHtml(`<a href="/search?q=rock&roll">It's effective</a>`)).toBe(
      '&lt;a href=&quot;/search?q=rock&amp;roll&quot;&gt;It&#039;s effective&lt;/a&gt;',
    );
  });

  it('converts non-string values before escaping them', () => {
    expect(escapeHtml(25)).toBe('25');
    expect(escapeHtml(null)).toBe('null');
  });
});
