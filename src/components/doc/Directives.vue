<!-- components/gql/doc/Directives.vue -->
<template>
  <ExplorerSection v-if="directives.length > 0" title="Directives">
    <div v-for="directive in directives" :key="directive.name.value">
      <Directive :directive="directive" />
    </div>
  </ExplorerSection>
</template>

<script setup lang="ts">
import type { DirectiveNode } from 'graphql';
import type { ExplorerFieldDef } from '../../lib/explorer';
import Directive from './Directive.vue';
import ExplorerSection from './ExplorerSection.vue';

const props = defineProps<{
  field: ExplorerFieldDef;
}>();

const directives = (props.field.astNode?.directives || []) as DirectiveNode[];
</script>
