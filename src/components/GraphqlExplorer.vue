<!-- Public component. Owns one store registry per explorer instance (no Pinia, no shared state). -->
<script setup lang="ts">
import { onBeforeUnmount, provide } from 'vue-demi';
import GraphiQLInterface from './GraphiQLInterface.vue';
import type { Fetcher } from '../lib/explorer';
import { createExplorerStores, disposeExplorerStores, ExplorerStoresKey } from '../stores/registry';
import type { GraphqlExplorerProps, HeadersOption, WsProtocol } from '../types/public';

// Same as GraphqlExplorerProps (src/types/public.ts); the Vue 2.7 compiler needs it declared in this file.
interface Props {
  url: string;
  wsUrl?: string;
  wsProtocol?: WsProtocol;
  headers?: HeadersOption;
  fetcher?: Fetcher;
  storageKey?: string;
  defaultQuery?: string;
}

const props = withDefaults(defineProps<Props>(), {
  wsUrl: undefined,
  wsProtocol: 'graphql-ws',
  headers: undefined,
  fetcher: undefined,
  storageKey: 'graphiql',
  defaultQuery: undefined,
});

// The stores read the reactive props object directly, so prop changes reach them.
const stores = createExplorerStores(props as GraphqlExplorerProps);
provide(ExplorerStoresKey, stores);
onBeforeUnmount(() => disposeExplorerStores(stores));
</script>

<template>
  <GraphiQLInterface />
</template>
