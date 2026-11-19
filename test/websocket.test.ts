// EXP-05: both websocket protocols, end to end. One local server speaks `graphql-ws` (graphql-transport-ws) on
// /graphql and `subscriptions-transport-ws` on /legacy, like the intelli server. The explorer's real fetcher
// (useExplorerFetcher) talks to it through Node's global WebSocket.
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { parse } from 'graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { useExplorerFetcher } from '../src/composables/useExplorerFetcher';
import { createExplorerStores, disposeExplorerStores, runWithExplorerStores } from '../src/stores/registry';
import type { GraphqlExplorerProps, WsProtocol } from '../src/types/public';

// The server side loads through `require`, so graphql-ws, subscriptions-transport-ws and the schema share the
// CommonJS `graphql` (the ESM copy Vitest gives this file would be a second realm).
const require = createRequire(import.meta.url);
const { buildSchema, execute, subscribe } = require('graphql') as typeof import('graphql');
const { useServer } = require('graphql-ws/use/ws') as typeof import('graphql-ws/use/ws');
const { SubscriptionServer } = require('subscriptions-transport-ws') as typeof import('subscriptions-transport-ws');
const { WebSocketServer } = require('ws') as typeof import('ws');

const schema = buildSchema(`
  type Query { ok: Boolean }
  type Subscription {
    count(to: Int!): Int
    whoami: String
    secret: String
  }
`);

let active = 0; // subscriptions running on the server
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rootValue = {
  count: async function* ({ to }: { to: number }) {
    active++;
    try {
      for (let i = 1; i <= to; i++) {
        yield { count: i };
        await sleep(5);
      }
    } finally {
      active--;
    }
  },
  whoami: async function* (_args: unknown, ctx: { auth?: string; editor?: string }) {
    yield { whoami: `${ctx.auth ?? 'anonymous'} / ${ctx.editor ?? '-'}` };
  },
  secret: async function* (_args: unknown, ctx: { auth?: string }) {
    if (!ctx.auth) throw new Error('Unauthorized');
    yield { secret: 'ok' };
  },
};

const contextFrom = (params: Record<string, unknown> | undefined) => ({
  auth: params?.Authorization as string | undefined,
  editor: params?.['x-editor'] as string | undefined,
});

let server: Server;
let base = '';

beforeAll(async () => {
  server = createServer();
  const modern = new WebSocketServer({ noServer: true });
  const legacy = new WebSocketServer({ noServer: true });
  useServer({ schema, roots: { subscription: rootValue }, context: ctx => contextFrom(ctx.connectionParams) }, modern);
  SubscriptionServer.create(
    { schema, execute, subscribe, rootValue, onConnect: (params: Record<string, unknown>) => contextFrom(params) },
    legacy,
  );
  server.on('upgrade', (req, socket, head) => {
    const wss = req.url === '/legacy' ? legacy : modern;
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

function explorerFetcher(props: Partial<GraphqlExplorerProps> & { wsProtocol: WsProtocol }) {
  const registry = createExplorerStores({
    url: 'http://127.0.0.1/graphql',
    wsUrl: props.wsProtocol === 'subscriptions-transport-ws' ? `${base}/legacy` : `${base}/graphql`,
    ...props,
  });
  const fetcher = registry.scope.run(() => runWithExplorerStores(registry, () => useExplorerFetcher()))!;
  return { fetcher, dispose: () => disposeExplorerStores(registry) };
}

async function subscribeTo(
  fetcher: ReturnType<typeof explorerFetcher>['fetcher'],
  query: string,
  headers?: Record<string, string>,
) {
  const documentAST = parse(query);
  const operationName = (documentAST.definitions[0] as any).name.value;
  const result = await fetcher({ query, operationName }, { documentAST, headers });
  return (result as AsyncIterable<any>)[Symbol.asyncIterator]();
}

async function collect(iterator: AsyncIterator<any>, max = 10) {
  const values: any[] = [];
  for (let step = await iterator.next(); !step.done; step = await iterator.next()) {
    values.push(step.value);
    if (values.length >= max) break;
  }
  return values;
}

async function waitFor(check: () => boolean, ms = 1000) {
  const end = Date.now() + ms;
  while (!check() && Date.now() < end) await sleep(5);
  return check();
}

describe.each<WsProtocol>(['graphql-ws', 'subscriptions-transport-ws'])('wsProtocol %s', wsProtocol => {
  it('streams every value, then completes', async () => {
    const { fetcher, dispose } = explorerFetcher({ wsProtocol });
    const values = await collect(await subscribeTo(fetcher, 'subscription C { count(to: 3) }'));
    expect(values).toEqual([{ data: { count: 1 } }, { data: { count: 2 } }, { data: { count: 3 } }]);
    dispose();
  });

  it('sends host headers and header-editor headers as connection params', async () => {
    const { fetcher, dispose } = explorerFetcher({
      wsProtocol,
      headers: async () => ({ Authorization: 'Bearer t1' }),
    });
    const values = await collect(await subscribeTo(fetcher, 'subscription W { whoami }', { 'x-editor': 'e1' }));
    if (wsProtocol === 'graphql-ws') {
      expect(values).toEqual([{ data: { whoami: 'Bearer t1 / e1' } }]);
    } else {
      // The legacy client opens one socket per URL with the host headers only (header-editor headers are
      // per request, and its connection params are fixed when the socket opens).
      expect(values).toEqual([{ data: { whoami: 'Bearer t1 / -' } }]);
    }
    dispose();
  });

  it('delivers a resolver error as a result with errors', async () => {
    const { fetcher, dispose } = explorerFetcher({ wsProtocol });
    const iterator = await subscribeTo(fetcher, 'subscription S { secret }');
    const outcome = await collect(iterator).then(
      values => ({ values }),
      error => ({ error }),
    );
    const text = JSON.stringify(outcome, (_k, v) => (v instanceof Error ? v.message : v));
    expect(text).toContain('Unauthorized');
    dispose();
  });

  it('stops the server-side subscription when the iterator is closed', async () => {
    const { fetcher, dispose } = explorerFetcher({ wsProtocol });
    const iterator = await subscribeTo(fetcher, 'subscription C { count(to: 1000) }');
    expect((await iterator.next()).value).toEqual({ data: { count: 1 } });
    expect(active).toBe(1);

    await iterator.return?.();
    expect(await waitFor(() => active === 0)).toBe(true);
    dispose();
  });
});
