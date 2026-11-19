// src/stores/schema.ts
import type { GraphQLError, GraphQLSchema } from 'graphql';
import { buildClientSchema, getIntrospectionQuery } from 'graphql';
import { defineExplorerStore, type ExplorerStore } from './registry';
import { ref, shallowRef } from 'vue-demi';

function schemaStoreSetup() {
  const schema = shallowRef<GraphQLSchema | null>(null);
  const isFetching = ref(false);
  const fetchError = ref<string | null>(null);
  const validationErrors = ref<GraphQLError[]>([]);

  // =============== REAL INTROSPECTION ===============
  const introspect = async (url: string) => {
    if (schema.value || isFetching.value) return;

    isFetching.value = true;
    fetchError.value = null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: getIntrospectionQuery(),
          operationName: 'IntrospectionQuery',
        }),
      });

      const result = await response.json();

      if (result.data?.__schema) {
        schema.value = buildClientSchema(result.data);
        console.log('✅ Schema loaded successfully');
      } else {
        throw new Error('Invalid introspection response');
      }
    } catch (err: any) {
      fetchError.value = err.message || 'Failed to load schema';
      console.error('Schema fetch failed:', err);
    } finally {
      isFetching.value = false;
    }
  };

  return {
    schema,
    isFetching,
    fetchError,
    introspect,
    validationErrors,
  };
}

export const useSchemaStore: () => ExplorerStore<ReturnType<typeof schemaStoreSetup>> = defineExplorerStore(
  'schema',
  schemaStoreSetup,
);
