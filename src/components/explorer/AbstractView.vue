<!-- nuxt/components/gql/explorer/AbstractView.vue -->
<template>
  <div :class="`graphiql-explorer-${props.implementingType.name}`">
    <span :style="{ cursor: 'pointer' }" @click="selection ? removeFragment() : addFragment()">
      <Checkbox :checked="!!selection" :style-config="ctx.styleConfig.value" />
      <span :style="{ color: ctx.styleConfig.value.colors.atom }">{{ props.implementingType.name }}</span>
    </span>
    <div v-if="selection" :style="{ marginLeft: 16 }">
      <FieldView
        v-for="fieldName in sortedFields"
        :key="fieldName"
        :field="fields[fieldName]!"
        :selections="childSelections"
        :definition="props.definition"
        :implementing-type="props.implementingType"
        :available-fragments="props.availableFragments"
        @modify-selections="modifyChildSelections"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Kind, type DefinitionNode, type GraphQLObjectType, type InlineFragmentNode } from 'graphql';
import { computed } from 'vue';
import { useExplorerContext } from '~/composables/useExplorerContext';
import type { AvailableFragments, Selections } from '~/lib/explorer';
import Checkbox from './Checkbox.vue';
import FieldView from './FieldView.vue';

export type AbstractViewProps = {
  implementingType: GraphQLObjectType;
  selections: Selections;
  definition: DefinitionNode;
  availableFragments: AvailableFragments;
};

const props = defineProps<AbstractViewProps>();
const emit = defineEmits<{ 'modify-selections': [selections: Selections] }>();

const ctx = useExplorerContext();
let _previousSelection: InlineFragmentNode | null = null;

const selection = computed(
  () =>
    props.selections.find(
      s => s.kind === Kind.INLINE_FRAGMENT && s.typeCondition?.name.value === props.implementingType.name,
    ) as InlineFragmentNode | null,
);

const fields = props.implementingType.getFields();
const sortedFields = computed(() => Object.keys(fields).sort());
const childSelections = computed(() => selection.value?.selectionSet?.selections || []);

function addFragment() {
  emit('modify-selections', [
    ...props.selections,
    _previousSelection || {
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: { kind: Kind.NAME, value: props.implementingType.name },
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: ctx.getDefaultFieldNames(props.implementingType).map(fieldName => ({
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: fieldName },
        })),
      },
    },
  ] as Selections);
}

function removeFragment() {
  const thisSel = _getSelection();
  _previousSelection = thisSel;
  emit(
    'modify-selections',
    props.selections.filter(s => s !== thisSel),
  );
}

function _getSelection(): InlineFragmentNode | null {
  const sel = props.selections.find(
    s => s.kind === Kind.INLINE_FRAGMENT && s.typeCondition?.name.value === props.implementingType.name,
  );
  return sel?.kind === Kind.INLINE_FRAGMENT ? sel : null;
}
function modifyChildSelections(selections: Selections) {
  const thisSel = _getSelection();
  const newDoc = props.selections.map(s =>
    s === thisSel
      ? {
          directives: s.directives,
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: { kind: Kind.NAME, value: props.implementingType.name },
          },
          selectionSet: { kind: Kind.SELECTION_SET, selections },
        }
      : s,
  ) as Selections;
  emit('modify-selections', newDoc);
}
</script>
