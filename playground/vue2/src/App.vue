<template>
  <div style="height: 100%">
    <GraphqlExplorer :url="url" />
  </div>
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer/vue2';

// Proxied by vite.config.ts to the local intelli-app-operations server.
const url = import.meta.env.VITE_GRAPHQL_URL ?? '/graphql';
</script>
