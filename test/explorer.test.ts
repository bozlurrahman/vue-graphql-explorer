// Unit tests for the query builder and helpers in src/lib/explorer.ts (EXP-08).
import { buildSchema, GraphQLEnumType, GraphQLInt, GraphQLString, Kind, parse, print } from 'graphql';
import type { OperationDefinitionNode } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import {
  coerceArgValue,
  createGraphiQLFetcher,
  defaultArgs,
  defaultGetDefaultFieldNames,
  fillLeafs,
  fuzzyExtractOperationName,
  getDefaultTabState,
  getSelectedOperationName,
  isSubscriptionWithName,
  mergeAst,
  mergeIncrementalResult,
  tryParseJsonObject,
  type IncrementalResult,
} from '../src/lib/explorer';

const schema = buildSchema(`
  input Filter { search: String!, limit: Int }
  type User { id: ID!, name: String, email: String, posts: [Post!]! }
  type Post { title: String!, body: String, views: Int, author: User }
  type Tag { label: String }
  type Query {
    user(id: ID!): User
    users(filter: Filter!, page: Int): [User!]!
    tags: [Tag!]!
  }
  type Subscription { userAdded: User }
`);

const field = (name: string) => schema.getQueryType()!.getFields()[name]!;
const ops = (src: string) => parse(src).definitions as OperationDefinitionNode[];

describe('defaultGetDefaultFieldNames', () => {
  it('prefers id plus email over name', () => {
    expect(defaultGetDefaultFieldNames(schema.getType('User') as any)).toEqual(['id', 'email']);
  });

  it('falls back to the first two leaf fields', () => {
    // Non-null leaf fields (`title: String!`) are skipped, as in upstream GraphiQL.
    expect(defaultGetDefaultFieldNames(schema.getType('Post') as any)).toEqual(['body', 'views']);
  });

  it('falls back to __typename when there is no nullable leaf field', () => {
    expect(defaultGetDefaultFieldNames(schema.getQueryType() as any)).toEqual(['__typename']);
  });
});

describe('fillLeafs', () => {
  it('adds default fields under a selection with no subfields', () => {
    const { result, insertions } = fillLeafs(schema, '{ user(id: 1) }');
    expect(insertions.length).toBe(1);
    expect(print(parse(result!))).toBe('{\n  user(id: 1) {\n    id\n  }\n}');
  });

  it('leaves complete queries alone', () => {
    const query = '{ tags { label } }';
    expect(fillLeafs(schema, query)).toEqual({ insertions: [], result: query });
  });

  it('returns the input when there is no schema or the query does not parse', () => {
    expect(fillLeafs(null, '{ user }').result).toBe('{ user }');
    expect(fillLeafs(schema, '{ user(').result).toBe('{ user(');
  });
});

describe('defaultArgs', () => {
  const scalarDefault = (_f: unknown, _a: unknown, type: any) =>
    type.name === 'Int' ? { kind: Kind.INT, value: '0' } : { kind: Kind.STRING, value: '' };

  it('fills required arguments only', () => {
    const args = defaultArgs(field('user'), scalarDefault as any);
    expect(args.map(a => a.name.value)).toEqual(['id']);
  });

  it('builds required input object fields', () => {
    const [filter] = defaultArgs(field('users'), scalarDefault as any);
    expect(filter!.name.value).toBe('filter');
    expect(filter!.value.kind).toBe(Kind.OBJECT);
    expect((filter!.value as any).fields.map((f: any) => f.name.value)).toEqual(['search']);
  });

  it('adds optional arguments the caller asks for', () => {
    const args = defaultArgs(field('users'), scalarDefault as any, (_f, arg) => arg.name === 'page');
    expect(args.map(a => a.name.value)).toEqual(['filter', 'page']);
  });
});

describe('coerceArgValue', () => {
  it('coerces scalars to the matching value node', () => {
    expect(coerceArgValue(GraphQLInt, '42')).toEqual({ kind: Kind.INT, value: '42' });
    expect(coerceArgValue(GraphQLString, 'hi')).toEqual({ kind: Kind.STRING, value: 'hi' });
  });

  it('falls back to the first enum value for unknown input', () => {
    const color = new GraphQLEnumType({ name: 'Color', values: { RED: {}, BLUE: {} } });
    expect(coerceArgValue(color, 'BLUE')).toEqual({ kind: Kind.ENUM, value: 'BLUE' });
    expect(coerceArgValue(color, 'PINK')).toEqual({ kind: Kind.ENUM, value: 'RED' });
  });
});

describe('mergeAst', () => {
  it('inlines fragments and merges duplicate fields', () => {
    const doc = parse('{ user(id: 1) { id ...F } } fragment F on User { id name }');
    const merged = print(mergeAst(doc, schema));
    expect(merged).not.toContain('fragment');
    expect(merged.match(/\bid\b(?!:)/g)?.length).toBe(1); // the two `id` fields merge into one
    expect(merged).toContain('name');
  });
});

describe('getSelectedOperationName', () => {
  it('keeps the selected name when it still exists', () => {
    expect(getSelectedOperationName(undefined, 'B', ops('query A { a } query B { b }'))).toBe('B');
  });

  it('follows the position when the selected operation is renamed', () => {
    const prev = ops('query A { a } query B { b }');
    expect(getSelectedOperationName(prev, 'B', ops('query A { a } query C { b }'))).toBe('C');
  });

  it('defaults to the first operation', () => {
    expect(getSelectedOperationName(undefined, undefined, ops('query A { a } query B { b }'))).toBe('A');
    expect(getSelectedOperationName(undefined, 'A', [])).toBeUndefined();
  });
});

describe('fuzzyExtractOperationName', () => {
  it.each([
    ['query GetUser { user }', 'GetUser'],
    ['mutation  Save($a: Int) { save }', 'Save'],
    ['subscription OnAdd { userAdded }', 'OnAdd'],
    ['{ user }', null],
  ])('%s', (src, name) => {
    expect(fuzzyExtractOperationName(src)).toBe(name);
  });
});

describe('isSubscriptionWithName', () => {
  const doc = parse('query A { tags { label } } subscription B { userAdded { id } }');

  it('matches only a subscription with that name', () => {
    expect(isSubscriptionWithName(doc, 'B')).toBe(true);
    expect(isSubscriptionWithName(doc, 'A')).toBe(false);
    expect(isSubscriptionWithName(doc, 'C')).toBe(false);
  });
});

describe('tryParseJsonObject', () => {
  const opts = { errorMessageParse: 'Bad JSON', errorMessageType: 'Not an object' };

  it('parses objects and treats blank input as undefined', () => {
    expect(tryParseJsonObject({ json: '{"a":1}', ...opts })).toEqual({ a: 1 });
    expect(tryParseJsonObject({ json: '  ', ...opts })).toBeUndefined();
    expect(tryParseJsonObject({ json: undefined, ...opts })).toBeUndefined();
  });

  it('throws the given messages', () => {
    expect(() => tryParseJsonObject({ json: '{', ...opts })).toThrow(/^Bad JSON: /);
    expect(() => tryParseJsonObject({ json: '[1]', ...opts })).toThrow('Not an object');
  });
});

describe('getDefaultTabState', () => {
  it('starts with one tab holding the default query', () => {
    const state = getDefaultTabState({ defaultQuery: '{ tags { label } }', storedState: null });
    expect(state.activeTabIndex).toBe(0);
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]!.query).toBe('{ tags { label } }');
  });

  it('ignores stored state that is not valid tab state', () => {
    const state = getDefaultTabState({ defaultQuery: '{ a }', storedState: '{"tabs":"nope"}' });
    expect(state.tabs[0]!.query).toBe('{ a }');
  });
});

describe('mergeIncrementalResult', () => {
  it('merges deferred data at its path', () => {
    const result: IncrementalResult = { data: { user: { id: '1' } }, hasNext: true };
    mergeIncrementalResult(result, {
      incremental: [{ path: ['user'], data: { name: 'Ann' } }],
      hasNext: false,
    });
    expect(result.data).toEqual({ user: { id: '1', name: 'Ann' } });
  });

  it('appends streamed items to a list', () => {
    const result: IncrementalResult = { data: { tags: [{ label: 'a' }] }, hasNext: true };
    mergeIncrementalResult(result, {
      incremental: [{ path: ['tags', 1], items: [{ label: 'b' }] }],
      hasNext: false,
    });
    expect(result.data).toEqual({ tags: [{ label: 'a' }, { label: 'b' }] });
  });
});

describe('createGraphiQLFetcher', () => {
  function mockFetch(body: unknown) {
    return vi.fn(async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }));
  }

  it('posts JSON with the option and per-request headers', async () => {
    const fetch = mockFetch({ data: { tags: [] } });
    const fetcher = createGraphiQLFetcher({
      url: '/graphql',
      fetch: fetch as any,
      headers: { 'x-app': 'a' },
      enableIncrementalDelivery: false,
    });
    const result = await fetcher({ query: '{ tags { label } }', operationName: null }, { headers: { 'x-req': 'r' } });

    expect(result).toEqual({ data: { tags: [] } });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/graphql');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json', 'x-app': 'a', 'x-req': 'r' });
    expect(JSON.parse(String(init.body))).toEqual({ query: '{ tags { label } }', operationName: null });
  });

  it('yields a single JSON response from the multipart fetcher', async () => {
    const fetcher = createGraphiQLFetcher({ url: '/graphql', fetch: mockFetch({ data: { a: 1 } }) as any });
    const result = await fetcher({ query: '{ a }', operationName: null });
    const chunks: unknown[] = [];
    for await (const chunk of result as AsyncIterable<unknown>) chunks.push(chunk);
    expect(chunks).toEqual([{ data: { a: 1 } }]);
  });

  it('sends introspection through the simple fetcher', async () => {
    const fetch = mockFetch({ data: { __schema: {} } });
    const fetcher = createGraphiQLFetcher({ url: '/graphql', fetch: fetch as any });
    const result = await fetcher({
      query: 'query IntrospectionQuery { __schema { queryType { name } } }',
      operationName: 'IntrospectionQuery',
    });
    expect(result).toEqual({ data: { __schema: {} } });
  });

  it('rejects subscriptions when no websocket option is set', async () => {
    const fetcher = createGraphiQLFetcher({ url: '/graphql', fetch: mockFetch({}) as any });
    const documentAST = parse('subscription S { userAdded { id } }');
    await expect(fetcher({ query: print(documentAST), operationName: 'S' }, { documentAST })).rejects.toThrow(
      /not properly configured for websocket subscriptions/,
    );
  });

  it('routes subscriptions to the legacy client', async () => {
    // Values arrive in later tasks, as from a socket.
    const request = vi.fn(() => ({
      subscribe(sink: { next: (v: unknown) => void; complete: () => void }) {
        setTimeout(() => sink.next({ data: { userAdded: { id: '1' } } }), 0);
        setTimeout(() => sink.complete(), 5);
        return { unsubscribe() {} };
      },
    }));
    const fetcher = createGraphiQLFetcher({ url: '/graphql', fetch: mockFetch({}) as any, legacyClient: { request } });
    const documentAST = parse('subscription S { userAdded { id } }');
    const result = await fetcher({ query: print(documentAST), operationName: 'S' }, { documentAST });
    const values: unknown[] = [];
    for await (const value of result as AsyncIterable<unknown>) values.push(value);

    expect(request).toHaveBeenCalledOnce();
    expect(values).toEqual([{ data: { userAdded: { id: '1' } } }]);
  });
});
