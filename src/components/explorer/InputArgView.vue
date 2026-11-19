<!-- nuxt/components/gql/explorer/InputArgView.vue -->
<template>
  <AbstractArgView
    :arg-value="argValue"
    :arg="props.arg"
    :parent-field="props.parentField"
    :definition="props.definition"
    :object-value="props.objectValue"
    :selection="props.selection"
    :selections="props.selections"
    @add-arg="addArg"
    @remove-arg="removeArg"
    @set-arg-fields="modifyChildFields"
    @set-arg-value="setArgValue"
  />
</template>

<script setup lang="ts">
import {
  isInputObjectType,
  isLeafType,
  Kind,
  type DefinitionNode,
  type FieldNode,
  type GraphQLArgument,
  type GraphQLInputField,
  type GraphQLObjectType,
  type ObjectFieldNode,
  type ObjectValueNode,
  type ValueNode,
  type VariableDefinitionNode,
} from 'graphql';
import { computed } from 'vue-demi';
import { useExplorerContext } from '../../composables/useExplorerContext';
import { coerceArgValue, defaultInputObjectFields, unwrapInputType, type Field, type Selections } from '../../lib/explorer';
import AbstractArgView from './AbstractArgView.vue';

export type InputArgViewProps = {
  arg: GraphQLArgument;
  objectValue: ObjectValueNode;
  selection: FieldNode;
  parentField: Field;
  definition: DefinitionNode;
  selections: Selections;
  implementingType?: GraphQLObjectType;
};

const props = defineProps<InputArgViewProps>();
const emit = defineEmits<{
  'modify-fields': [fields: ObjectFieldNode[]];
}>();

const ctx = useExplorerContext();
let previousArgSelection: ObjectFieldNode | null = null;

const argSelection = computed(
  () => props.objectValue.fields.find(f => f.name.value === props.arg.name) as ObjectFieldNode | undefined,
);

const argValue = computed(() => argSelection.value?.value || null);

function addArg() {
  const { getDefaultScalarArgValue, makeDefaultArg } = ctx;
  const { arg, parentField, objectValue } = props;
  const argType = unwrapInputType(arg.type);

  let argSel: ObjectFieldNode | null = null;

  if (previousArgSelection) {
    argSel = previousArgSelection;
  } else if (isInputObjectType(argType)) {
    const fields = argType.getFields();
    argSel = {
      kind: Kind.OBJECT_FIELD,
      name: { kind: Kind.NAME, value: arg.name },
      value: {
        kind: Kind.OBJECT,
        fields: defaultInputObjectFields(
          getDefaultScalarArgValue,
          parentField,
          Object.keys(fields)
            .map(k => fields[k])
            .filter((f): f is GraphQLInputField => f !== undefined),
          makeDefaultArg.value,
        ),
      },
    };
  } else if (isLeafType(argType)) {
    argSel = {
      kind: Kind.OBJECT_FIELD,
      name: { kind: Kind.NAME, value: arg.name },
      value: getDefaultScalarArgValue(parentField, arg, argType),
    };
  }

  if (!argSel) {
    console.error('Unable to add arg for argType', argType);
    return;
  }

  emit('modify-fields', [...(objectValue.fields || []), argSel]);
}

function removeArg() {
  const argSel = getArgSelection();
  previousArgSelection = argSel ?? null;
  emit(
    'modify-fields',
    props.objectValue.fields.filter(f => f !== argSel),
  );
}

function setArgValue(event: Event | ValueNode | VariableDefinitionNode | null) {
  const argSel = getArgSelection();
  if (!argSel) {
    console.error('Missing arg objectValue when setting arg value');
    return;
  }

  const argType = unwrapInputType(props.arg.type);

  const settingToVariable = event && 'kind' in event && event.kind === 'VariableDefinition';
  const settingToLiteralValue = event && 'kind' in event && typeof event.kind === 'string';
  const settingToNull = event == null;
  const handleable = isLeafType(argType) || settingToVariable || settingToNull || settingToLiteralValue;

  if (!handleable) {
    console.warn('Unable to handle non-leaf types in InputArgView.setArgValue', event);
    return;
  }

  let value: ValueNode = { kind: Kind.NULL };

  if (settingToNull) {
    value = { kind: Kind.NULL };
  } else if (settingToVariable) {
    value = (event as VariableDefinitionNode).variable;
  } else if (settingToLiteralValue) {
    value = event as ValueNode;
  } else if (event instanceof Event && event.target instanceof HTMLInputElement) {
    value = coerceArgValue(argType, event.target.value);
  }

  emit(
    'modify-fields',
    (props.objectValue.fields || []).map(f => (f === argSel ? { ...f, value } : f)),
  );
}

function modifyChildFields(fields: ReadonlyArray<ObjectFieldNode>) {
  emit(
    'modify-fields',
    props.objectValue.fields.map(f =>
      f.name.value === props.arg.name ? { ...f, value: { kind: Kind.OBJECT, fields } } : f,
    ),
  );
}

function getArgSelection(): ObjectFieldNode | undefined {
  return props.objectValue.fields.find(f => f.name.value === props.arg.name);
}
</script>
