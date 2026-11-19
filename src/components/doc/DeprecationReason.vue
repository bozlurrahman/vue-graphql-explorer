<!-- components/gql/doc/DeprecationReason.vue -->
<template>
  <div v-if="reason" class="graphiql-doc-explorer-deprecation">
    <div class="graphiql-doc-explorer-deprecation-label">Deprecated</div>
    <MarkdownContent type="deprecation" :only-show-first-child="preview" :markdown="reason" />
  </div>
</template>

<script setup lang="ts">
import MarkdownContent from './MarkdownContent.vue';

defineProps<{
  reason?: string | null;
  preview?: boolean;
}>();
</script>
<style>
.graphiql-doc-explorer-deprecation {
  background-color: hsla(var(--color-warning), var(--alpha-background-light));
  border: 1px solid hsl(var(--color-warning));
  border-radius: var(--px-4);
  color: hsl(var(--color-warning));
  padding: var(--px-8);
}

.graphiql-doc-explorer-deprecation-label {
  font-size: var(--font-size-hint);
  font-weight: var(--font-weight-medium);
}
</style>
