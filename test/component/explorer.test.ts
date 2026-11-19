// @vitest-environment happy-dom
// Component tests for <GraphqlExplorer> (EXP-08). The same file runs on Vue 3 (`npm test`, VTU v2) and on
// Vue 2.7 (`npm run test:vue2`, VTU v1); `#mount` is the per-version adapter.
import { buildSchema, introspectionFromSchema } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { version } from 'vue';
import { flushPromises, mountExplorer, vueMajor } from '#mount';
import { GraphqlExplorer } from '../../src/index';
import type { FetcherParams, FetcherOpts } from '../../src/index';

const schema = buildSchema(`
  type Tag { label: String }
  type Query {
    """<img src="x" onerror="window.__xss = 1">**Tags**"""
    tags: [Tag!]!
  }
`);

function mockFetcher() {
  return vi.fn(async (params: FetcherParams, _opts?: FetcherOpts) => {
    if (params.operationName === 'IntrospectionQuery') return { data: introspectionFromSchema(schema) };
    return { data: { tags: [{ label: 'hadith' }] } };
  });
}

async function settle() {
  for (let i = 0; i < 5; i++) await flushPromises();
}

let unmount: (() => void) | undefined;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
});

async function mountWith(props: Record<string, unknown>) {
  const mounted = mountExplorer(GraphqlExplorer, props);
  unmount = mounted.unmount;
  await settle();
  return mounted.wrapper;
}

describe(`<GraphqlExplorer> on Vue ${vueMajor}`, () => {
  it('mounts and loads the schema through the fetcher', async () => {
    const fetcher = mockFetcher();
    const wrapper = await mountWith({ url: '/graphql', fetcher, defaultQuery: '{ tags { label } }' });

    expect(wrapper.find('.graphiql-container').exists()).toBe(true);
    expect(fetcher.mock.calls.some(([p]) => p.operationName === 'IntrospectionQuery')).toBe(true);
  });

  it('runs the query and shows the response', async () => {
    const fetcher = mockFetcher();
    const wrapper = await mountWith({
      url: '/graphql',
      fetcher,
      headers: () => ({ Authorization: 'Bearer test' }),
      defaultQuery: 'query Tags { tags { label } }',
    });

    await wrapper.find('.execute-btn').trigger('click');
    await settle();

    const run = fetcher.mock.calls.find(([p]) => p.operationName !== 'IntrospectionQuery');
    expect(run).toBeTruthy();
    expect(run![0].query).toContain('tags');
    expect(run![1]?.headers).toMatchObject({ Authorization: 'Bearer test' });

    const response = wrapper.find('.graphiql-response textarea').element as unknown as HTMLTextAreaElement;
    expect(JSON.parse(response.value)).toEqual({ data: { tags: [{ label: 'hadith' }] } });
  });

  it('never writes the Authorization header to localStorage', async () => {
    const wrapper = await mountWith({
      url: '/graphql',
      fetcher: mockFetcher(),
      headers: { Authorization: 'Bearer secret' },
      defaultQuery: '{ tags { label } }',
    });
    await wrapper.find('.execute-btn').trigger('click');
    await settle();

    const stored = Object.keys(localStorage)
      .map(k => localStorage.getItem(k))
      .join('\n');
    expect(stored).not.toContain('Bearer secret');
  });

  it('shows a subscription error in the response pane', async () => {
    const fetcher = vi.fn(async (params: FetcherParams) => {
      if (params.operationName === 'IntrospectionQuery') return { data: introspectionFromSchema(schema) };
      return (async function* () {
        yield { data: { tags: [] } };
        throw new Error('Socket closed with event 4403 Forbidden');
      })();
    });
    const wrapper = await mountWith({ url: '/graphql', fetcher, defaultQuery: 'query Tags { tags { label } }' });

    await wrapper.find('.execute-btn').trigger('click');
    await settle();

    const response = wrapper.find('.graphiql-response textarea').element as unknown as HTMLTextAreaElement;
    expect(response.value).toContain('4403 Forbidden');
  });

  it('toggles the doc explorer', async () => {
    const wrapper = await mountWith({ url: '/graphql', fetcher: mockFetcher(), defaultQuery: '{ tags { label } }' });
    const button = wrapper.find('button[aria-label="Documentation"]');
    expect(button.exists()).toBe(true);

    const visible = () => wrapper.find('.graphiql-plugin-pane .documentation').exists();
    expect(visible()).toBe(false);

    await button.trigger('click');
    await settle();
    expect(visible()).toBe(true);
    expect(wrapper.find('.graphiql-plugin').text()).toContain('Query');

    await button.trigger('click');
    await settle();
    expect(visible()).toBe(false);
  });
});

describe('untrusted schema text', () => {
  it('shows a description with HTML as text, never as markup', async () => {
    const wrapper = await mountWith({ url: '/graphql', fetcher: mockFetcher(), defaultQuery: '{ tags { label } }' });
    await wrapper.find('button[aria-label="Documentation"]').trigger('click');
    await settle();
    await wrapper.find('.graphiql-plugin a.graphiql-doc-explorer-type-name').trigger('click'); // Query
    await settle();

    const docs = wrapper.find('.graphiql-plugin');
    expect(docs.text()).toContain('<img src="x"');
    expect(docs.find('img').exists()).toBe(false);
    expect(docs.html()).toContain('<strong>Tags</strong>');
    expect((window as any).__xss).toBeUndefined();
  });
});

// Guards the per-version config: this run really uses the Vue major its adapter claims.
it('runs on the expected Vue version', () => {
  expect(version.startsWith(`${vueMajor}.`)).toBe(true);
});
