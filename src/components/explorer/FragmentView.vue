<!-- nuxt/components/gql/explorer/FragmentView.vue -->
<template>
  <div :class="`graphiql-explorer-${props.fragment.name.value}`">
    <span :style="{ cursor: 'pointer' }" @click="selection ? removeFragment() : addFragment()">
      <Checkbox :checked="!!selection" :style-config="ctx.styleConfig.value" />
      <span
        :style="{ color: ctx.styleConfig.value.colors.def }"
        :class="`graphiql-explorer-${props.fragment.name.value}`"
      >
        {{ props.fragment.name.value }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { Kind, type FragmentDefinitionNode, type FragmentSpreadNode } from 'graphql';
import { computed } from 'vue';
import { useExplorerContext } from '../../composables/useExplorerContext';
import type { Selections } from '../../lib/explorer';
import Checkbox from './Checkbox.vue';

export type FragmentViewProps = {
  fragment: FragmentDefinitionNode;
  selections: Selections;
};

const props = defineProps<FragmentViewProps>();
const emit = defineEmits<{
  'modify-selections': [selections: Selections];
}>();

const ctx = useExplorerContext();

const selection = computed(
  () =>
    props.selections.find(
      s => s.kind === 'FragmentSpread' && s.name.value === props.fragment.name.value,
    ) as FragmentSpreadNode | null,
);

function addFragment() {
  emit('modify-selections', [
    ...props.selections,
    { kind: Kind.FRAGMENT_SPREAD, name: props.fragment.name },
  ] as Selections);
}

function removeFragment() {
  emit(
    'modify-selections',
    props.selections.filter(s => !(s.kind === 'FragmentSpread' && s.name.value === props.fragment.name.value)),
  );
}
</script>
<style scoped>
span {
  display: inline-block;
}
</style>
