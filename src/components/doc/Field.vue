<!-- components/gql/doc/Field.vue -->
<template>
  <div class="graphiql-doc-explorer-item">
    <div>
      <FieldLink :field="field" />
      <template v-if="args.length > 0">
        <span>(</span>
        <span>
          <template v-for="arg in args" :key="arg.name">
            <div v-if="args.length > 1" class="graphiql-doc-explorer-argument-multiple">
              <Argument :arg="arg" inline />
            </div>
            <Argument v-else :arg="arg" inline />
          </template>
        </span>
        <span>)</span>
      </template>
      <span>:</span>
      <TypeLink :type="field.type" />
      <DefaultValue :field="field" />
    </div>
    <MarkdownContent v-if="field.description" type="description" only-show-first-child :markdown="field.description" />
    <DeprecationReason :reason="field.deprecationReason" />
  </div>
</template>

<script setup lang="ts">
import type { GraphQLArgument } from 'graphql';
import { computed } from 'vue';
import type { ExplorerFieldDef } from '../../lib/explorer';
import Argument from './Argument.vue';
import DefaultValue from './DefaultValue.vue';
import DeprecationReason from './DeprecationReason.vue';
import FieldLink from './FieldLink.vue';
import MarkdownContent from './MarkdownContent.vue';
import TypeLink from './TypeLink.vue';

const props = defineProps<{
  field: ExplorerFieldDef;
}>();

const args = computed<GraphQLArgument[]>(() =>
  'args' in props.field ? props.field.args.filter((arg: any) => !arg.deprecationReason) : [],
);
</script>
