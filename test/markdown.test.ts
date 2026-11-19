// Schema descriptions are untrusted server text; renderMarkdown must never pass HTML through.
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/lib/markdown';

describe('renderMarkdown', () => {
  it.each([
    ['<img src=x onerror=alert(1)>', '<p>&lt;img src=x onerror=alert(1)&gt;</p>'],
    ['<script>alert(1)</script>', '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'],
    ['[x](javascript:alert(1))', '<p>[x](javascript:alert(1))</p>'],
    ['[x](JaVaScRiPt:alert(1))', '<p>[x](JaVaScRiPt:alert(1))</p>'],
    ['[x](data:text/html,<b>)', '<p>[x](data:text/html,&lt;b&gt;)</p>'],
    ['`<b>`', '<p><code>&lt;b&gt;</code></p>'],
    ['```\n<script>x</script>\n```', '<pre><code>&lt;script&gt;x&lt;/script&gt;</code></pre>'],
  ])('escapes %s', (input, expected) => {
    expect(renderMarkdown(input)).toBe(expected);
  });

  it('cannot break out of a link attribute', () => {
    const html = renderMarkdown('[x](https://a.example/"onmouseover="alert(1))');
    expect(html).not.toContain('onmouseover="');
    expect(html).toContain('href="https://a.example/&quot;onmouseover=&quot;alert(1"');
  });

  it('renders the supported subset', () => {
    expect(
      renderMarkdown('First **bold** and *em* and _em_.\n\nSee [docs](https://example.com/a?b=1&c=2) or `code`.'),
    ).toBe(
      '<p>First <strong>bold</strong> and <em>em</em> and <em>em</em>.</p>' +
        '<p>See <a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">docs</a> or <code>code</code>.</p>',
    );
  });

  it('keeps snake_case words intact', () => {
    expect(renderMarkdown('use application_deleted or guard_name')).toBe(
      '<p>use application_deleted or guard_name</p>',
    );
  });

  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
  });
});
