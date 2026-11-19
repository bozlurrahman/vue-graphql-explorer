<template>
  <div style="height: 100%">
    <GraphqlExplorer :url="url" />
  </div>
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer/vue2';

// Local intelli-app-operations server. The `url` prop arrives in EXP-04.
const url = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:30011/graphql';
</script>
