<!-- components/gql/doc/Argument.vue -->
<template>
  <div v-if="!inline" class="graphiql-doc-explorer-argument">
    <span>
      <span class="graphiql-doc-explorer-argument-name">{{ arg.name }}:</span>

      <TypeLink :type="arg.type" />
      <DefaultValue v-if="showDefaultValue" :field="arg" />
    </span>
    <MarkdownContent v-if="arg.description" type="description" :markdown="arg.description" />
    <div v-if="arg.deprecationReason" class="graphiql-doc-explorer-argument-deprecation">
      <div class="graphiql-doc-explorer-argument-deprecation-label">Deprecated</div>
      <MarkdownContent type="deprecation" :markdown="arg.deprecationReason" />
    </div>
  </div>
  <span v-else>
    <span class="graphiql-doc-explorer-argument-name">{{ arg.name }}:</span>

    <TypeLink :type="arg.type" />
    <DefaultValue v-if="showDefaultValue" :field="arg" />
  </span>
</template>

<script setup lang="ts">
import type { GraphQLArgument } from 'graphql';
import DefaultValue from './DefaultValue.vue';
import MarkdownContent from './MarkdownContent.vue';
import TypeLink from './TypeLink.vue';

defineProps<{
  arg: GraphQLArgument;
  showDefaultValue?: boolean;
  inline?: boolean;
}>();
</script>

<style scoped>
.graphiql-doc-explorer-argument-name {
  color: hsl(var(--color-secondary));
}
</style>
