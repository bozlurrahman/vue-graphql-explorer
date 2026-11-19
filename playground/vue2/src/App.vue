<template>
  <div style="height: 100%">
    <GraphqlExplorer
      :url="url"
      :ws-protocol="wsProtocol"
      :headers="headers"
      storage-key="playground"
      :default-query="defaultQuery"
    />
  </div>
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer/vue2';

// Proxied by vite.config.ts to the local intelli-app-operations server.
const url = import.meta.env.VITE_GRAPHQL_URL ?? '/graphql';

// ?ws=legacy switches subscriptions to subscriptions-transport-ws.
const wsProtocol =
  new URLSearchParams(window.location.search).get('ws') === 'legacy' ? 'subscriptions-transport-ws' : 'graphql-ws';

// Host headers: sent with every request and as websocket connection params. A real host passes its token here.
const headers = () => ({ 'x-playground': 'vue2' });
const defaultQuery = '# Playground default query\nquery Playground { __typename }\n';
</script>
