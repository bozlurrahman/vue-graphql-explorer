<!-- components/gql/doc/EnumValue.vue -->
<template>
  <div class="graphiql-doc-explorer-item">
    <div class="graphiql-doc-explorer-enum-value">{{ value.name }}</div>
    <MarkdownContent v-if="value.description" type="description" :markdown="value.description" />
    <MarkdownContent v-if="value.deprecationReason" type="deprecation" :markdown="value.deprecationReason" />
  </div>
</template>

<script setup lang="ts">
import type { GraphQLEnumValue } from 'graphql';
import MarkdownContent from './MarkdownContent.vue';

defineProps<{
  value: GraphQLEnumValue;
}>();
</script>
<style scoped>
.graphiql-doc-explorer-enum-value {
  color: hsl(var(--color-info));
}
</style>
