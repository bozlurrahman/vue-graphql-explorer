<!-- nuxt/components/gql/explorer/ArgView.vue -->
<template>
  <AbstractArgView
    :arg-value="argValue || null"
    :arg="props.arg"
    :parent-field="props.parentField"
    :definition="props.definition"
    :selection="props.selection"
    :selections="props.selections"
    :implementing-type="props.implementingType"
    @add-arg="addArg"
    @remove-arg="removeArg"
    @set-arg-fields="setArgFields"
    @set-arg-value="setArgValue"
  />
</template>

<script setup lang="ts">
import {
  isInputObjectType,
  isLeafType,
  Kind,
  type ArgumentNode,
  type DefinitionNode,
  type FieldNode,
  type GraphQLArgument,
  type GraphQLInputField,
  type GraphQLObjectType,
  type ObjectFieldNode,
  type ValueNode,
  type VariableDefinitionNode,
} from 'graphql';
import { computed, ref } from 'vue';
import { useExplorerContext } from '~/composables/useExplorerContext';
import { coerceArgValue, defaultInputObjectFields, unwrapInputType, type Field, type Selections } from '~/lib/explorer';
import AbstractArgView from './AbstractArgView.vue';

type ArgViewProps = {
  parentField: Field;
  arg: GraphQLArgument;
  selection: FieldNode;
  definition: DefinitionNode;
  implementingType?: GraphQLObjectType;
  selections: Selections;
};

const props = defineProps<ArgViewProps>();
const emit = defineEmits<{
  'modify-arguments': [args: ArgumentNode[]];
}>();

const ctx = useExplorerContext();
const previousArgSelection = ref<ArgumentNode | null>(null);
const argSelection = computed(() => props.selection.arguments?.find(a => a.name.value === props.arg.name) ?? null);
const argValue = computed<ValueNode | null>(() => argSelection.value?.value ?? null);

function getArgSelection(): ArgumentNode | null {
  return props.selection.arguments?.find(arg => arg.name.value === props.arg.name) ?? null;
}

function removeArg() {
  const current = getArgSelection();
  previousArgSelection.value = current;
  emit(
    'modify-arguments',
    (props.selection.arguments || []).filter(arg => arg !== current),
  );
}

function addArg() {
  const { getDefaultScalarArgValue, makeDefaultArg } = ctx;
  const { arg, parentField } = props;
  const argType = unwrapInputType(arg.type);

  let newArg: ArgumentNode | null = null;

  if (previousArgSelection.value) {
    newArg = previousArgSelection.value;
  } else if (isInputObjectType(argType)) {
    const fields = argType.getFields();
    newArg = {
      kind: Kind.ARGUMENT,
      name: { kind: Kind.NAME, value: arg.name },
      value: {
        kind: Kind.OBJECT,
        fields: defaultInputObjectFields(
          getDefaultScalarArgValue,
          parentField,
          Object.values(fields).filter((f): f is GraphQLInputField => Boolean(f)),
          makeDefaultArg.value,
        ),
      },
    };
  } else if (isLeafType(argType)) {
    newArg = {
      kind: Kind.ARGUMENT,
      name: { kind: Kind.NAME, value: arg.name },
      value: getDefaultScalarArgValue(parentField, arg, argType),
    };
  }

  if (!newArg) {
    console.error('Unable to add arg for argType', argType);
    return;
  }

  emit('modify-arguments', [...(props.selection.arguments || []), newArg]);
}

function setArgValue(event: Event | ValueNode | VariableDefinitionNode | null) {
  const current = getArgSelection();
  if (!current) {
    console.error('Missing arg selection when setting arg value');
    return;
  }

  const argType = unwrapInputType(props.arg.type);
  const isVariable = event && typeof event === 'object' && 'kind' in event && event.kind === 'VariableDefinition';
  const isLiteral = event && typeof event === 'object' && 'kind' in event && typeof event.kind === 'string';
  const isNull = event == null;

  if (!(isLeafType(argType) || isVariable || isLiteral || isNull)) {
    console.warn('Unsupported type in setArgValue');
    return;
  }

  let value: ValueNode = { kind: Kind.NULL };

  if (isNull) {
    value = { kind: Kind.NULL };
  } else if (event && typeof event === 'object' && 'target' in event && event.target instanceof HTMLInputElement) {
    value = coerceArgValue(argType, event.target.value);
  } else if (isVariable) {
    value = (event as VariableDefinitionNode).variable;
  } else if (isLiteral) {
    value = event as ValueNode;
  }

  emit(
    'modify-arguments',
    (props.selection.arguments || []).map(a => (a === current ? { ...a, value } : a)),
  );
}

function setArgFields(fields: ReadonlyArray<ObjectFieldNode>) {
  const current = getArgSelection();
  if (!current) {
    console.error('Missing arg selection when setting arg fields');
    return;
  }

  emit(
    'modify-arguments',
    (props.selection.arguments || []).map(a => (a === current ? { ...a, value: { kind: Kind.OBJECT, fields } } : a)),
  );
}
</script>
