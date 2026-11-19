import { describe, expect, it } from 'vitest';
import { isCredentialHeader, stripCredentialHeaders } from '../src/lib/credentials';
import { serializeTabState } from '../src/lib/explorer';

describe('isCredentialHeader', () => {
  it.each([
    'Authorization',
    'authorization',
    'Cookie',
    'Set-Cookie',
    'Proxy-Authorization',
    'x-access-token',
    'X-API-Key',
    'api_key',
    'x-client-secret',
    'password',
    'X-Session-Id',
    'x-auth',
    'jwt',
  ])('flags %s', name => {
    expect(isCredentialHeader(name)).toBe(true);
  });

  it.each(['Content-Type', 'Accept', 'x-request-id', 'x-playground', 'Accept-Language'])('keeps %s', name => {
    expect(isCredentialHeader(name)).toBe(false);
  });
});

describe('stripCredentialHeaders', () => {
  it('removes credential headers and keeps the rest', () => {
    const out = stripCredentialHeaders('{"Authorization":"Bearer abc","x-request-id":"1"}');
    expect(JSON.parse(out!)).toEqual({ 'x-request-id': '1' });
  });

  it('returns null when only credentials are left out', () => {
    expect(stripCredentialHeaders('{"Authorization":"Bearer abc"}')).toBeNull();
  });

  it('keeps the original text when nothing is removed', () => {
    const text = '{ "x-request-id": "1" }';
    expect(stripCredentialHeaders(text)).toBe(text);
  });

  it('drops text that is not a JSON object, because it cannot be filtered', () => {
    expect(stripCredentialHeaders('{"Authorization": "Bearer abc",')).toBeNull();
    expect(stripCredentialHeaders('["Authorization"]')).toBeNull();
    expect(stripCredentialHeaders('')).toBeNull();
    expect(stripCredentialHeaders(null)).toBeNull();
  });
});

describe('serializeTabState', () => {
  const tabState = {
    activeTabIndex: 0,
    tabs: [
      {
        id: '1',
        hash: 'h',
        title: 'T',
        query: '{ a }',
        variables: null,
        headers: '{"Authorization":"Bearer abc","x-request-id":"1"}',
        operationName: null,
        response: '{"data":{"token":"secret"}}',
      },
    ],
  };

  it('never stores headers unless asked, and never the response', () => {
    const tab = JSON.parse(serializeTabState(tabState as any, false)).tabs[0];
    expect(tab.headers).toBeNull();
    expect(tab.response).toBeNull();
  });

  it('stores only non-credential headers when asked', () => {
    const tab = JSON.parse(serializeTabState(tabState as any, true)).tabs[0];
    expect(JSON.parse(tab.headers)).toEqual({ 'x-request-id': '1' });
    expect(tab.response).toBeNull();
  });
});
