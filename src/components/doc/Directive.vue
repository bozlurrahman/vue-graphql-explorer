<!-- components/gql/doc/Directive.vue -->
<template>
  <span class="graphiql-doc-explorer-directive">@{{ directive.name.value }}</span>
</template>

<script setup lang="ts">
import type { DirectiveNode } from 'graphql';

defineProps<{
  directive: DirectiveNode;
}>();
</script>
<style>
.graphiql-doc-explorer-directive {
  color: hsl(var(--color-secondary));
}
</style>
