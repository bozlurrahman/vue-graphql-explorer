<!-- Public component. Owns one store registry per explorer instance (no Pinia, no shared state). -->
<script setup lang="ts">
import { onBeforeUnmount, provide } from 'vue-demi';
import GraphiQLInterface from './GraphiQLInterface.vue';
import { createExplorerStores, disposeExplorerStores, ExplorerStoresKey } from '../stores/registry';

// Temporary props until EXP-04 (headers, fetcher, wsProtocol, storageKey, defaultQuery).
defineProps<{
  url: string;
  wsUrl?: string;
}>();

const stores = createExplorerStores();
provide(ExplorerStoresKey, stores);
onBeforeUnmount(() => disposeExplorerStores(stores));
</script>

<template>
  <GraphiQLInterface :url="url" :ws-url="wsUrl" />
</template>
