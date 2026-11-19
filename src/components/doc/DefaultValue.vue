<!-- components/gql/doc/DefaultValue.vue -->
<template>
  <template v-if="'defaultValue' in field && field.defaultValue !== undefined">
    <template v-if="ast">
      <span>=</span>
      <span class="graphiql-doc-explorer-default-value">{{ print(ast) }}</span>
    </template>
  </template>
</template>

<script setup lang="ts">
import { astFromValue, print } from 'graphql';
import { computed } from 'vue';
import type { ExplorerFieldDef } from '~/lib/explorer';

const props = defineProps<{
  field: ExplorerFieldDef;
}>();

const ast = computed(() => {
  if ('defaultValue' in props.field && props.field.defaultValue !== undefined) {
    try {
      return astFromValue(props.field.defaultValue, props.field.type) ?? null;
    } catch (e) {
      console.warn('Failed to convert default value to AST', e);
      return null;
    }
  }
  return null;
});
</script>
<style>
.graphiql-doc-explorer-default-value {
  color: hsl(var(--color-success));
}
</style>
