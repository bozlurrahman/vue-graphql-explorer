<!-- nuxt/components/gql/explorer/FieldView.vue -->
<template>
  <div v-if="props.field" :class="fieldClass">
    <span
      :title="props.field.description || undefined"
      :style="fieldSpanStyles"
      :data-field-name="props.field.name"
      :data-field-type="type?.name"
      @click="handleUpdateSelections"
      @mouseenter="displayFieldActions = true"
      @mouseleave="displayFieldActions = false"
    >
      <span v-if="isObjectType(type)">
        <div v-html="selection ? ctx.styleConfig.value.arrowOpen : ctx.styleConfig.value.arrowClosed"></div>
      </span>
      <Checkbox v-else :checked="!!selection" :style-config="ctx.styleConfig.value" />
      <span :style="{ color: ctx.styleConfig.value.colors.property }" class="graphiql-explorer-field-view">
        {{ props.field.name }}
      </span>
      <button
        v-if="displayFieldActions && containsMeaningfulSubSelection"
        type="button"
        class="toolbar-button"
        title="Extract selections into a new reusable fragment"
        :style="actionButtonStyles"
        @click.stop="extractFragment"
      >
        <span>…</span>
      </button>
    </span>

    <div v-if="selection && args.length" class="graphiql-explorer-graphql-arguments" :style="{ marginLeft: '16px' }">
      <ArgView
        v-for="arg in args"
        :key="arg.name"
        :parent-field="props.field"
        :arg="arg"
        :selection="selection"
        :definition="props.definition"
        :selections="props.selections"
        :implementing-type="isObjectType(type) ? type : undefined"
        @modify-arguments="modifyArguments"
      />
    </div>

    <div
      v-if="selection && (isObjectType(type) || isInterfaceType(type) || isUnionType(type))"
      :style="{ marginLeft: '16px' }"
    >
      <template v-if="applicableFragments && applicableFragments.length">
        <FragmentView
          v-for="(applicableFragment, index) in applicableFragments"
          :key="index"
          :fragment="applicableFragment"
          :selections="childSelections"
          @modify-selections="modifyChildSelections"
        />
      </template>
      <FieldView
        v-for="fieldName in sortedFields"
        :key="fieldName"
        :field="fields[fieldName]"
        :selections="childSelections"
        :definition="props.definition"
        :available-fragments="props.availableFragments"
        @modify-selections="modifyChildSelections"
      />
      <template v-if="isInterfaceType(type) || isUnionType(type)">
        <AbstractView
          v-for="possibleType in possibleTypes"
          :key="possibleType.name"
          :implementing-type="possibleType"
          :selections="childSelections"
          :definition="props.definition"
          :available-fragments="props.availableFragments"
          @modify-selections="modifyChildSelections"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getNamedType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  Kind,
  type ArgumentNode,
  type DefinitionNode,
  type FieldNode,
  type GraphQLArgument,
  type GraphQLFieldMap,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import { computed, ref } from 'vue-demi';
import { useExplorerContext } from '../../composables/useExplorerContext';
import { defaultArgs, unwrapOutputType, type AvailableFragments, type Field, type Selections } from '../../lib/explorer';
import AbstractView from './AbstractView.vue';
import ArgView from './ArgView.vue';
import Checkbox from './Checkbox.vue';
import FragmentView from './FragmentView.vue';
import { useSchemaStore } from '../../stores/schema';

export type FieldViewProps = {
  field: Field;
  selections: Selections;
  definition: DefinitionNode;
  availableFragments: AvailableFragments;
};

const props = defineProps<FieldViewProps>();
const emit = defineEmits<{
  'modify-selections': [selections: Selections];
}>();

const ctx = useExplorerContext();
const schemaStore = useSchemaStore();
const displayFieldActions = ref(false);
let _previousSelection: SelectionNode | null = null;

const selection = computed(
  () => props.selections.find(s => s.kind === 'Field' && s.name.value === props.field?.name) as FieldNode | null,
);

const type = computed(() => unwrapOutputType(props.field?.type));
const possibleTypes = computed(() => schemaStore.schema?.getPossibleTypes(type.value as any) ?? []);
const args = computed(() => {
  const argsCopy = [...(props.field?.args ?? [])];
  return argsCopy.sort((a: GraphQLArgument, b: GraphQLArgument) => a.name.localeCompare(b.name));
});

const fields = computed<GraphQLFieldMap<any, any>>(() => {
  if (isObjectType(type.value) || isInterfaceType(type.value)) return type.value.getFields();
  return {};
});

const childSelections = computed(() => selection.value?.selectionSet?.selections || []);
const sortedFields = computed(() => Object.keys(fields.value).sort());

const applicableFragments = computed(() => {
  return isObjectType(type.value) || isInterfaceType(type.value) || isUnionType(type.value)
    ? (props.availableFragments[type.value.name] ?? null)
    : null;
});

const containsMeaningfulSubSelection = computed(
  () => isObjectType(type.value) && childSelections.value.filter(s => s.kind !== 'FragmentSpread').length > 0,
);

const fieldClass = computed(() => `graphiql-explorer-node graphiql-explorer-${props.field?.name}`);

const fieldSpanStyles = {
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '16px',
  userSelect: 'none' as const,
};

const actionButtonStyles = computed(() => ctx.styleConfig.value.styles.actionButtonStyle);

function getSelection(): FieldNode | null {
  const sel = props.selections.find(s => s.kind === 'Field' && props.field?.name === s.name.value);
  return sel?.kind === 'Field' ? sel : null;
}

function addAllFieldsToSelections(rawSubfields: GraphQLFieldMap<any, any>) {
  const subFields: FieldNode[] = Object.keys(rawSubfields).map(fieldName => ({
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: fieldName },
    arguments: [],
  }));

  const subSelectionSet: SelectionSetNode = { kind: Kind.SELECTION_SET, selections: subFields };

  const nextSelections: SelectionNode[] = [
    ...props.selections.filter(s => (s.kind === 'InlineFragment' ? true : s.name.value !== props.field?.name)),
    {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: props.field?.name ?? '' },
      arguments: props.field ? defaultArgs(props.field, ctx.getDefaultScalarArgValue, ctx.makeDefaultArg.value) : [],
      selectionSet: subSelectionSet,
    },
  ];

  emit('modify-selections', nextSelections);
}

function addFieldToSelections() {
  const nextSelections = [
    ...props.selections,
    _previousSelection || {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: props.field?.name ?? '' },
      arguments: props.field ? defaultArgs(props.field, ctx.getDefaultScalarArgValue, ctx.makeDefaultArg.value) : [],
    },
  ];
  emit('modify-selections', nextSelections as Selections);
}

function handleUpdateSelections(event: MouseEvent) {
  const sel = getSelection();
  if (sel && !event.altKey) {
    removeFieldFromSelections();
  } else {
    const fieldType = getNamedType(props.field?.type);
    const rawSubfields = isObjectType(fieldType) ? fieldType.getFields() : null;
    if (rawSubfields && event.altKey) addAllFieldsToSelections(rawSubfields);
    else addFieldToSelections();
  }
}

function removeFieldFromSelections() {
  _previousSelection = getSelection();
  emit(
    'modify-selections',
    props.selections.filter(s => s !== _previousSelection),
  );
}

function modifyArguments(argumentNodes: ArgumentNode[]) {
  const sel = getSelection();
  if (!sel) {
    console.error('Missing selection when setting arguments', argumentNodes);
    return;
  }
  const updatedSelection = props.selections.map(s =>
    s === sel
      ? ({
          alias: sel?.alias,
          arguments: argumentNodes,
          directives: sel.directives,
          kind: Kind.FIELD,
          name: sel?.name,
          selectionSet: sel?.selectionSet,
        } as SelectionNode)
      : s,
  ) as Selections;

  emit('modify-selections', updatedSelection);
}

function modifyChildSelections(selections: Selections) {
  emit(
    'modify-selections',
    props.selections.map(s => {
      if (s.kind === 'Field' && props.field?.name === s.name.value) {
        return {
          alias: s.alias,
          arguments: s.arguments,
          directives: s.directives,
          kind: Kind.FIELD,
          name: s.name,
          selectionSet: { kind: Kind.SELECTION_SET, selections },
        };
      }
      return s;
    }) as Selections,
  );
}

function extractFragment(event: MouseEvent) {
  event.stopPropagation();
}
</script>
