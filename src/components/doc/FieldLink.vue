<!-- components/gql/doc/FieldLink.vue -->
<template>
  <a class="graphiql-doc-explorer-field-name" href="#" @click.prevent="push">
    {{ field.name }}
  </a>
</template>

<script setup lang="ts">
import type { ExplorerFieldDef } from '../../lib/explorer';

const props = defineProps<{
  field: ExplorerFieldDef;
}>();

const docStore = useDocumentationStore();

function push() {
  docStore.push({ name: props.field.name, def: props.field });
}
</script>
<style scoped>
a.graphiql-doc-explorer-field-name {
  color: hsl(var(--color-info));
  text-decoration: none;
}
</style>
