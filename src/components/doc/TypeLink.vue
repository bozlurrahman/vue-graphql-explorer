<!-- components/gql/doc/TypeLink.vue -->
<template>
  <span v-if="isNonNullType(type)">
    <TypeLink :type="type.ofType" />
    <span>!</span>
  </span>
  <span v-else-if="isListType(type)">
    <span>[</span>
    <TypeLink :type="type.ofType" />
    <span>]</span>
  </span>
  <a
    v-else
    class="graphiql-doc-explorer-type-name"
    href="#"
    @click.prevent="docStore.push({ name: type.name, def: type })"
  >
    {{ type.name }}
  </a>
</template>

<script setup lang="ts">
import type { GraphQLType } from 'graphql';
import { isListType, isNonNullType } from 'graphql';

defineProps<{
  type: GraphQLType;
}>();
const docStore = useDocumentationStore();
</script>
<style>
a.graphiql-doc-explorer-type-name {
  color: hsl(var(--color-warning));
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus {
    outline: hsl(var(--color-warning)) auto 1px;
  }
}
</style>
