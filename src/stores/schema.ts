// src/stores/schema.ts
import type { GraphQLError, GraphQLSchema } from 'graphql';
import { buildClientSchema, getIntrospectionQuery } from 'graphql';
import { defineExplorerStore, type ExplorerStore } from './registry';
import { ref, shallowRef } from 'vue-demi';
import type { Fetcher } from '../lib/explorer';
import { isAsyncIterable } from '../lib/iterator';

function schemaStoreSetup() {
  const schema = shallowRef<GraphQLSchema | null>(null);
  const isFetching = ref(false);
  const fetchError = ref<string | null>(null);
  const validationErrors = ref<GraphQLError[]>([]);

  // Introspection goes through the explorer's fetcher, so host headers (for example Authorization) apply.
  const introspect = async (fetcher: Fetcher, { force = false }: { force?: boolean } = {}) => {
    if (isFetching.value || (schema.value && !force)) return;

    isFetching.value = true;
    fetchError.value = null;

    try {
      let result: any = await fetcher({ query: getIntrospectionQuery(), operationName: 'IntrospectionQuery' });
      if (isAsyncIterable(result)) {
        const first = await (result as AsyncIterable<unknown>)[Symbol.asyncIterator]().next();
        result = first.value;
      }

      if (result?.data?.__schema) {
        schema.value = buildClientSchema(result.data);
      } else {
        const message = result?.errors?.[0]?.message;
        throw new Error(message ? `Introspection failed: ${message}` : 'Invalid introspection response');
      }
    } catch (err: any) {
      fetchError.value = err?.message || 'Failed to load schema';
    } finally {
      isFetching.value = false;
    }
  };

  const reset = () => {
    schema.value = null;
    fetchError.value = null;
    validationErrors.value = [];
  };

  return {
    schema,
    isFetching,
    fetchError,
    introspect,
    reset,
    validationErrors,
  };
}

export const useSchemaStore: () => ExplorerStore<ReturnType<typeof schemaStoreSetup>> = defineExplorerStore(
  'schema',
  schemaStoreSetup,
);
