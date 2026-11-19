// src/stores/execution.ts
import type { ExecutionResult, FragmentDefinitionNode } from 'graphql';
import { print } from 'graphql';
import { getFragmentDependenciesForAST } from 'graphql-language-service';
import { defineStore } from 'pinia';
import type { Observable } from 'subscriptions-transport-ws';
import { ref } from 'vue';
import {
  formatError,
  formatResult,
  mergeIncrementalResult,
  tryParseJsonObject,
  type Fetcher,
  type UnSubscribable,
} from '~/lib/explorer';
import { isAsyncIterable } from '~/lib/iterator';
import { useEditorStore } from './editor';
import { useHistoryStore } from './history';

function isObservable(value: unknown): value is Observable<ExecutionResult> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'subscribe' in value &&
    typeof (value as any).subscribe === 'function'
  );
}

export const useExecutionStore = defineStore('execution', () => {
  const isFetching = ref(false);
  const isSubscribed = ref(false);
  const operationName = ref<string | null>(null);
  const fetcher = ref<Fetcher | null>(null);
  const subscription = ref<UnSubscribable | null>(null);
  const queryIdCounter = ref<number>(0);

  function init(options: { fetcher: Fetcher; operationName?: string }): void {
    fetcher.value = options.fetcher;
    operationName.value = options.operationName ?? null;
  }

  function stop(): void {
    if (!subscription.value && !isFetching.value) {
      console.warn('[stop] nothing running — ignoring');
      return;
    }
    queryIdCounter.value++;
    subscription.value?.unsubscribe();
    subscription.value = null;
    isFetching.value = false;
    isSubscribed.value = false;
  }

  async function run(_operationName?: string): Promise<void> {
    if (!fetcher.value) {
      console.error('[ExecutionStore] Store not initialized. Call `init({ fetcher })` first.');
      return;
    }
    if (isFetching.value) {
      console.warn('[run] already fetching — ignoring');
      return;
    }
    if (subscription.value) {
      stop();
      return;
    }

    isFetching.value = true;
    const runId = ++queryIdCounter.value;

    const editor = useEditorStore();
    const history = useHistoryStore();

    const setResponse = (value: string) => {
      editor.responseEditor?.setValue(value);
      editor.updateActiveTabValues({ response: value });
    };

    let query = editor.queryEditor?.getValue() ?? '';

    let variables: Record<string, unknown> | undefined;
    try {
      variables = tryParseJsonObject({
        json: editor.variableEditor?.getValue(),
        errorMessageParse: 'Variables are invalid JSON',
        errorMessageType: 'Variables are not a JSON object.',
      });
    } catch (error) {
      setResponse(error instanceof Error ? error.message : String(error));
      isFetching.value = false;
      return;
    }

    let headers: Record<string, unknown> | undefined;
    try {
      headers = tryParseJsonObject({
        json: editor.headerEditor?.getValue(),
        errorMessageParse: 'Headers are invalid JSON',
        errorMessageType: 'Headers are not a JSON object.',
      });
    } catch (error) {
      setResponse(error instanceof Error ? error.message : String(error));
      isFetching.value = false;
      return;
    }

    const documentAST = editor.activeParsedQuery;
    if (editor.externalFragments.size > 0 && documentAST) {
      const deps = getFragmentDependenciesForAST(documentAST, editor.externalFragments);
      if (deps.length > 0) {
        query += '\n' + deps.map((n: FragmentDefinitionNode) => print(n)).join('\n');
      }
    }

    setResponse('');

    const opName = _operationName ?? operationName.value ?? editor.queryEditor?.operationName ?? undefined;

    history.addToHistory({
      query,
      variables: editor.variableEditor?.getValue(),
      headers: editor.headerEditor?.getValue(),
      operationName: opName,
    });

    // ── Incremental result accumulator ────────────────────────────────────
    const fullResponse: ExecutionResult = {};

    const handleResponse = (result: ExecutionResult): void => {
      if (runId !== queryIdCounter.value) return; // stale — drop

      const maybeMultipart: ExecutionResult[] | false = Array.isArray(result)
        ? result
        : typeof result === 'object' && result !== null && 'hasNext' in result
          ? [result]
          : false;

      if (maybeMultipart) {
        for (const part of maybeMultipart) {
          mergeIncrementalResult(fullResponse as any, part as any);
        }
        setResponse(formatResult(fullResponse));
      } else {
        setResponse(formatResult(result));
      }
    };

    // ── Execute ───────────────────────────────────────────────────────────
    try {
      const fetchResult = fetcher.value({ query, variables, operationName: opName }, { headers, documentAST });
      const value = await Promise.resolve(fetchResult);

      if (runId !== queryIdCounter.value) {
        isFetching.value = false;
        return;
      }

      if (isObservable(value)) {
        subscription.value = value.subscribe({
          next(result) {
            handleResponse(result);
          },
          error(error: Error) {
            isFetching.value = false;
            if (error) setResponse(formatError(error));
            subscription.value = null;
            isSubscribed.value = false;
          },
          complete() {
            isFetching.value = false;
            subscription.value = null;
            isSubscribed.value = false;
          },
        });
        isSubscribed.value = true;
        isFetching.value = false;
      } else if (isAsyncIterable(value)) {
        // ── AsyncIterable (graphql-ws, @defer, @stream) ───────────────────
        const iterator = (value as AsyncIterable<ExecutionResult>)[Symbol.asyncIterator]();

        subscription.value = {
          unsubscribe: () => {
            // console.log('[stop] closing iterator');
            iterator.return?.();
          },
        };
        isSubscribed.value = true;
        isFetching.value = false;

        try {
          let step = await iterator.next();
          while (!step.done) {
            if (runId !== queryIdCounter.value) break; // stop() was called
            handleResponse(step.value);
            step = await iterator.next();
          }
        } catch (err) {
          console.error('[AsyncIterable] closed or errored:', err);
        } finally {
          isFetching.value = false;
          subscription.value = null;
          isSubscribed.value = false;
        }
      } else {
        // ── Plain single result ───────────────────────────────────────────
        isFetching.value = false;
        handleResponse(value as ExecutionResult);
      }
    } catch (error) {
      isFetching.value = false;
      setResponse(formatError(error));
      subscription.value = null;
      isSubscribed.value = false;
    }
  }

  return {
    isFetching,
    isSubscribed,
    operationName,
    init,
    run,
    stop,
  };
});
