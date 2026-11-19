// EXP-07: the package must import and server-render without a DOM (Nuxt 2 / Nuxt 3+ SSR). The host still mounts
// it client-side only, but importing it, or a stray render on the server, must not throw.
// Vitest runs in the `node` environment, so `window`, `document` and `localStorage` do not exist here.
// The Vue 2.7 build has its own check: `npm run test:ssr:vue2` (scripts/ssr-check-vue2.mjs).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import type { GraphqlExplorerProps } from '../src/index';

async function render(props: GraphqlExplorerProps) {
  const { GraphqlExplorer } = await import('../src/index');
  return renderToString(createSSRApp({ render: () => h(GraphqlExplorer, props) }));
}

describe('SSR safety', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof localStorage).toBe('undefined');
  });

  it('imports the public entry', async () => {
    const mod = await import('../src/index');
    expect(mod.GraphqlExplorer).toBeTruthy();
    expect(typeof mod.createGraphiQLFetcher).toBe('function');
  });

  it('renders to a string with every public prop set', async () => {
    const html = await render({
      url: '/graphql',
      wsUrl: '/graphql',
      wsProtocol: 'graphql-ws',
      headers: () => ({ Authorization: 'Bearer test' }),
      storageKey: 'ssr-test',
      defaultQuery: '{ __typename }',
    });
    expect(html).toContain('graphiql-container');
    expect(html).not.toContain('Bearer test');
  });

  it('renders when the browser blocks localStorage', async () => {
    // Sandboxed iframes and disabled cookies make reading `window.localStorage` throw a SecurityError.
    const blocked = {
      addEventListener: () => {},
      removeEventListener: () => {},
      get localStorage(): Storage {
        throw new Error('SecurityError: storage blocked');
      },
    };
    vi.stubGlobal('window', blocked);
    const html = await render({ url: '/graphql' });
    expect(html).toContain('graphiql-container');
  });
});
