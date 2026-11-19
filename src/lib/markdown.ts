// Renders schema descriptions and deprecation reasons. They come from the GraphQL server, so they are untrusted:
// everything is HTML-escaped first, then a small markdown subset is turned back into tags. No raw HTML passes
// through, and links only keep http(s) and mailto URLs.
//
// Supported: paragraphs (blank line), fenced code (```), `inline code`, **bold**, *italic* / _italic_,
// [text](url). Anything else shows as plain text.

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

function renderInline(escaped: string): string {
  // Inline code first; its content is protected from the other rules by placeholders (U+E000, a private-use
  // character, removed from the input so only these placeholders contain it).
  const codes: string[] = [];
  let out = escaped.replace(/\uE000/g, '').replace(/`([^`\n]+)`/g, (_m, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\uE000${codes.length - 1}\uE000`;
  });

  // The text is already escaped, so `url` cannot contain `"` or `<`; it still must use a safe scheme.
  // `&amp;` is decoded only for the scheme test.
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) =>
    SAFE_URL.test(url.replace(/&amp;/g, '&'))
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : m,
  );
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');

  return out.replace(/\uE000(\d+)\uE000/g, (_m, i: string) => codes[Number(i)] ?? '');
}

export function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const blocks: string[] = [];
  const parts = markdown.replace(/\r\n?/g, '\n').split(/^```[^\n]*\n?/m);

  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      // Inside a fence.
      blocks.push(`<pre><code>${escapeHtml(part.replace(/\n$/, ''))}</code></pre>`);
      return;
    }
    for (const paragraph of part.split(/\n{2,}/)) {
      const text = paragraph.trim();
      if (text) blocks.push(`<p>${renderInline(escapeHtml(text)).replace(/\n/g, '<br>')}</p>`);
    }
  });

  return blocks.join('');
}
