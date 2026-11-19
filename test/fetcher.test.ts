// Unit tests for the prop helpers behind useExplorerFetcher (EXP-08).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveHeaders, resolveWsUrl } from '../src/composables/useExplorerFetcher';

describe('resolveHeaders', () => {
  it('accepts nothing, an object, a function or an async function', async () => {
    expect(await resolveHeaders(undefined)).toEqual({});
    expect(await resolveHeaders({ a: '1' })).toEqual({ a: '1' });
    expect(await resolveHeaders(() => ({ b: '2' }))).toEqual({ b: '2' });
    expect(await resolveHeaders(async () => ({ c: '3' }))).toEqual({ c: '3' });
  });

  it('calls the function on every request, so a refreshed token is used', async () => {
    let token = 'old';
    const headers = () => ({ Authorization: `Bearer ${token}` });
    expect(await resolveHeaders(headers)).toEqual({ Authorization: 'Bearer old' });
    token = 'new';
    expect(await resolveHeaders(headers)).toEqual({ Authorization: 'Bearer new' });
  });
});

describe('resolveWsUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses wsUrl when given', () => {
    expect(resolveWsUrl({ url: '/graphql', wsUrl: 'wss://api.example/graphql' })).toBe('wss://api.example/graphql');
  });

  it('returns an empty string on the server', () => {
    expect(resolveWsUrl({ url: '/graphql' })).toBe('');
  });

  it.each([
    ['https://app.example/admin', '/graphql', 'wss://app.example/graphql'],
    ['http://localhost:3001/', '/graphql', 'ws://localhost:3001/graphql'],
    ['https://app.example/', 'http://api.example/graphql', 'ws://api.example/graphql'],
  ])('page %s, url %s -> %s', (href, url, expected) => {
    vi.stubGlobal('window', { location: { href } });
    expect(resolveWsUrl({ url })).toBe(expected);
  });
});
