<!-- components/gql/doc/Arguments.vue -->
<template>
  <ExplorerSection v-if="args.length > 0" title="Arguments">
    <Argument v-for="arg in args" :key="arg.name" :arg="arg" />
  </ExplorerSection>
  <template v-if="deprecatedArgs.length > 0">
    <template v-if="showDeprecated || args.length === 0">
      <ExplorerSection title="Deprecated Arguments">
        <Argument v-for="arg in deprecatedArgs" :key="arg.name" :arg="arg" />
      </ExplorerSection>
    </template>
    <button v-else type="button" @click="showDeprecated = true">Show Deprecated Arguments</button>
  </template>
</template>

<script setup lang="ts">
import type { GraphQLArgument } from 'graphql';
import { computed, ref } from 'vue';
import type { ExplorerFieldDef } from '../../lib/explorer';
import Argument from './Argument.vue';
import ExplorerSection from './ExplorerSection.vue';

const props = defineProps<{
  field: ExplorerFieldDef;
}>();

const showDeprecated = ref(false);
const deprecatedArgs = ref<GraphQLArgument[]>([]);

const args = computed<GraphQLArgument[]>(() => {
  const result: GraphQLArgument[] = [];
  const deprecated: GraphQLArgument[] = [];
  if ('args' in props.field) {
    for (const argument of props.field.args) {
      if (argument.deprecationReason) {
        deprecated.push(argument);
      } else {
        result.push(argument);
      }
    }
  }
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  deprecatedArgs.value = deprecated;
  return result;
});
</script>
<style scoped>
.graphiql-doc-explorer-argument {
  & > * + * {
    margin-top: var(--px-12);
  }
}

.graphiql-doc-explorer-argument-name {
  color: hsl(var(--color-secondary));
}

.graphiql-doc-explorer-argument-deprecation {
  background-color: hsla(var(--color-warning), var(--alpha-background-light));
  border: 1px solid hsl(var(--color-warning));
  border-radius: var(--border-radius-4);
  color: hsl(var(--color-warning));
  padding: var(--px-8);
}

.graphiql-doc-explorer-argument-deprecation-label {
  font-size: var(--font-size-hint);
  font-weight: var(--font-weight-medium);
}
</style>
