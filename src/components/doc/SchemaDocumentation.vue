<!-- components/gql/doc/SchemaDocumentation.vue -->
<template>
  <MarkdownContent
    type="description"
    :markdown="schema.description || 'A GraphQL schema provides a root type for each kind of operation.'"
  ></MarkdownContent>
  <ExplorerSection title="Root Types">
    <div v-if="queryType">
      <span class="graphiql-doc-explorer-root-type">query:</span>

      <TypeLink :type="queryType" />
    </div>
    <div v-if="mutationType">
      <span class="graphiql-doc-explorer-root-type">mutation:</span>

      <TypeLink :type="mutationType" />
    </div>
    <div v-if="subscriptionType">
      <span class="graphiql-doc-explorer-root-type">subscription:</span>

      <TypeLink :type="subscriptionType" />
    </div>
  </ExplorerSection>
  <ExplorerSection title="All Schema Types">
    <div v-if="typeMap">
      <div v-for="type in allTypes" :key="type.name">
        <TypeLink :type="type" />
      </div>
    </div>
  </ExplorerSection>
</template>

<script setup lang="ts">
import type { GraphQLSchema } from 'graphql';
import { computed } from 'vue';
import ExplorerSection from './ExplorerSection.vue';
import MarkdownContent from './MarkdownContent.vue';
import TypeLink from './TypeLink.vue';

const props = defineProps<{
  schema: GraphQLSchema;
}>();

const queryType = computed(() => props.schema.getQueryType());
const mutationType = computed(() => props.schema.getMutationType?.());
const subscriptionType = computed(() => props.schema.getSubscriptionType?.());
const typeMap = computed(() => props.schema.getTypeMap());

const ignoreTypesInAllSchema = computed(() => [
  queryType.value?.name,
  mutationType.value?.name,
  subscriptionType.value?.name,
]);

const allTypes = computed(() =>
  Object.values(typeMap.value).filter(
    type => !ignoreTypesInAllSchema.value.includes(type.name) && !type.name.startsWith('__'),
  ),
);
</script>

<!-- <style src="./schema-documentation.css" scoped></style> -->
<style scoped>
.graphiql-doc-explorer-root-type {
  color: hsl(var(--color-info));
}
</style>
