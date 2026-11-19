// Credential headers never reach localStorage (EXP-06). Tabs ("persist headers") and history keep the other
// headers. Host credentials belong in the `headers` prop, which is never stored.

// Header names that carry credentials: exact names, plus anything that looks like a token, key or secret.
const CREDENTIAL_NAMES = new Set(['authorization', 'proxy-authorization', 'cookie', 'set-cookie']);
const CREDENTIAL_PATTERN = /token|secret|passw(or)?d|api[-_]?key|session|auth|jwt|bearer|credential/i;

export function isCredentialHeader(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return CREDENTIAL_NAMES.has(lower) || CREDENTIAL_PATTERN.test(lower);
}

/**
 * Removes credential headers from the header editor text (a JSON object).
 * Returns null when nothing is left, and also when the text is not a JSON object: it cannot be filtered,
 * so it is not stored at all.
 */
export function stripCredentialHeaders(headersText: string | null | undefined): string | null {
  if (!headersText || !headersText.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(headersText);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const kept = Object.fromEntries(Object.entries(parsed).filter(([name]) => !isCredentialHeader(name)));
  if (Object.keys(kept).length === 0) return null;
  // Unchanged text keeps the user's formatting.
  return Object.keys(kept).length === Object.keys(parsed).length ? headersText : JSON.stringify(kept, null, 2);
}
