<!-- nuxt/components/gql/explorer/AbstractArgView.vue -->

<script setup lang="ts">
import {
  isEnumType,
  isInputObjectType,
  isLeafType,
  isRequiredArgument,
  isScalarType,
  Kind,
  parseType,
  print,
  visit,
  type ArgumentNode,
  type DefinitionNode,
  type DocumentNode,
  type ExecutableDefinitionNode,
  type FieldNode,
  type GraphQLArgument,
  type GraphQLObjectType,
  type ObjectFieldNode,
  type OperationDefinitionNode,
  type SelectionNode,
  type ValueNode,
  type VariableDefinitionNode,
} from 'graphql';
import { computed, ref } from 'vue';
import { useExplorerContext } from '~/composables/useExplorerContext';
import { coerceArgValue, DEFAULT_QUERY, unwrapInputType, type Field, type Selections } from '~/lib/explorer';
import Checkbox from './Checkbox.vue';
import InputArgView from './InputArgView.vue';
import ScalarInput from './ScalarInput.vue';

interface AbstractArgViewProps {
  argValue: ValueNode | null;
  arg: GraphQLArgument;
  parentField: Field;
  definition: DefinitionNode;
  selection: FieldNode;
  selections: Selections;
  implementingType?: GraphQLObjectType;
}

const props = defineProps<AbstractArgViewProps>();
const emit = defineEmits<{
  'add-arg': [];
  'remove-arg': [];
  'set-arg-value': [event: Event | ValueNode | VariableDefinitionNode | null];
  'set-arg-fields': [fields: ReadonlyArray<ObjectFieldNode>];
}>();

const ctx = useExplorerContext();
const editorStore = useEditorStore();
const displayArgActions = ref(false);
const argType = computed(() => unwrapInputType(props.arg.type));

const inputComponent = computed(() => {
  const { argValue } = props;
  if (!argValue) return null;

  if (argValue.kind === 'Variable') {
    return { type: 'variable' as const, value: `$${argValue.name.value}` };
  }

  if (isScalarType(argType.value)) {
    if (argType.value.name === 'Boolean') {
      return {
        type: 'boolean' as const,
        value: argValue.kind === Kind.BOOLEAN ? (argValue.value ? 'true' : 'false') : undefined,
      };
    }
    return { type: 'scalar' as const };
  }

  if (isEnumType(argType.value) && argValue.kind === 'EnumValue') {
    return { type: 'enum' as const, values: argType.value.getValues(), current: argValue.value };
  }

  if (isInputObjectType(argType.value) && argValue.kind === 'ObjectValue') {
    return { type: 'object' as const, fields: argType.value.getFields() };
  }

  return null;
});

function handleArgAction() {
  if (props.argValue?.kind === 'Variable') {
    devariablize();
  } else {
    variablize();
  }
}
function getArgSelection(): ArgumentNode | null {
  return props.selection.arguments?.find(arg => arg.name.value === props.arg.name) ?? null;
}
function getSelection(): FieldNode | null {
  const sel = props.selections.find(s => s.kind === 'Field' && props.parentField?.name === s.name.value);
  return sel?.kind === 'Field' ? sel : null;
}

function setArgValue(event: Event | ValueNode | VariableDefinitionNode | null): DocumentNode | null {
  const argSelection = getArgSelection();
  if (!argSelection) {
    console.error('Missing arg selection when setting arg value');
    return null;
  }

  const argType = unwrapInputType(props.arg.type);
  const isVariable = event && typeof event === 'object' && 'kind' in event && event.kind === 'VariableDefinition';
  const isLiteral = event && typeof event === 'object' && 'kind' in event && typeof event.kind === 'string';
  const isNull = event == null;

  if (!(isLeafType(argType) || isVariable || isLiteral || isNull)) {
    console.warn('Unable to handle non leaf types in ArgView._setArgValue');
    return null;
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
  const argumentNodes = (props.selection.arguments || []).map(a => (a === argSelection ? { ...a, value } : a));

  const selection = getSelection();
  if (!selection) {
    console.error('Missing selection when setting arguments', argumentNodes);
    return null;
  }
  const updatedSelections = props.selections.map(s => {
    if (s === selection)
      return {
        alias: selection?.alias,
        arguments: argumentNodes,
        directives: selection.directives,
        kind: Kind.FIELD,
        name: selection?.name,
        selectionSet: selection?.selectionSet,
      } as SelectionNode;
    else return s;
  }) as Selections;

  const operationDef: DefinitionNode = props.definition;

  let newDefinition: DefinitionNode | null = null;

  if (operationDef.kind === Kind.FRAGMENT_DEFINITION) {
    newDefinition = {
      ...operationDef,
      selectionSet: {
        ...operationDef.selectionSet,
        selections: updatedSelections,
      },
    };
  } else if (operationDef.kind === 'OperationDefinition') {
    let cleanedSelections = updatedSelections.filter(
      selection => !(selection.kind === 'Field' && selection.name.value === '__typename'),
    );

    if (cleanedSelections.length === 0) {
      cleanedSelections = [
        {
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: DEFAULT_QUERY },
        },
      ];
    }

    newDefinition = {
      ...operationDef,
      selectionSet: {
        ...operationDef.selectionSet,
        selections: cleanedSelections,
      },
    };
  }

  if (newDefinition) {
    const newDefinitions = editorStore.activeParsedQuery.definitions.map(def =>
      def === props.definition ? newDefinition : def,
    );
    const newDoc = { ...editorStore.activeParsedQuery, definitions: newDefinitions };
    return newDoc;
  }
  return editorStore.activeParsedQuery;
}

function variablize() {
  const { arg, argValue, definition } = props;
  const baseVariableName = arg.name;
  const existingDefs = (definition as ExecutableDefinitionNode)?.variableDefinitions || [];
  const conflictingCount = existingDefs.filter((v: any) => v.variable.name.value.startsWith(baseVariableName)).length;
  const variableName = conflictingCount > 0 ? `${baseVariableName}${conflictingCount}` : baseVariableName;
  const argTypeAst = parseType(arg.type.toString());

  const base: VariableDefinitionNode = {
    kind: Kind.VARIABLE_DEFINITION,
    variable: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: variableName } },
    type: argTypeAst,
    directives: [],
  };

  const variableDefinitionByName = (name: string) =>
    ((definition as ExecutableDefinitionNode)?.variableDefinitions || []).find(
      (varDef: any) => varDef.variable.name.value === name,
    );

  let variable: VariableDefinitionNode;
  const subVariableUsageCountByName: { [key: string]: number } = {};

  if (typeof argValue !== 'undefined' && argValue !== null) {
    /** In the process of devariabilizing descendent selections,
     * we may have caused their variable definitions to become unused.
     * Keep track and remove any variable definitions with 1 or fewer usages.
     * */
    const cleanedDefaultValue = visit(argValue, {
      Variable(node) {
        const varName = node.name.value;
        const varDef = variableDefinitionByName(varName);

        subVariableUsageCountByName[varName] = subVariableUsageCountByName[varName]
          ? subVariableUsageCountByName[varName] + 1
          : 1;

        if (!varDef) {
          return;
        }

        return varDef.defaultValue;
      },
    });

    const isNonNullable = base.type.kind === 'NonNullType';

    // We're going to give the variable definition a default value, so we must make its type nullable
    const unwrappedBase = isNonNullable ? { ...base, type: base.type.type } : base;

    // original line
    // variable = { ...unwrappedBase, defaultValue: cleanedDefaultValue as any };
    variable = { ...unwrappedBase, defaultValue: undefined };
  } else {
    variable = base;
  }

  const newlyUnusedVariables = Object.entries(subVariableUsageCountByName)
    // $FlowFixMe: Can't get Object.entries to realize usageCount *must* be a number
    .filter(([_, usageCount]: [string, number]) => usageCount < 2)
    .map(([varName, _]) => varName);

  if (variable) {
    const newDoc: DocumentNode | null = setArgValue(variable);

    if (newDoc) {
      const targetOperation = newDoc.definitions.find(definition => {
        if (
          'operation' in definition &&
          !!definition.operation &&
          !!definition.name &&
          !!definition.name.value &&
          !!(definition as any).name &&
          !!(definition as any).name.value
        ) {
          return definition.name.value === (definition as any).name.value;
        } else {
          return false;
        }
      });

      const newVariableDefinitions: Array<VariableDefinitionNode> = [
        ...(targetOperation && 'variableDefinitions' in targetOperation
          ? targetOperation.variableDefinitions || []
          : []),
        variable,
      ].filter(varDef => newlyUnusedVariables.indexOf(varDef.variable.name.value) === -1);

      const newOperation = {
        ...targetOperation,
        variableDefinitions: newVariableDefinitions,
      };

      const newDefinitions: ReadonlyArray<DefinitionNode> = newDoc.definitions.map(existingOperation => {
        if (targetOperation === existingOperation) {
          return newOperation;
        } else {
          return existingOperation as any;
        }
      });

      const finalDoc: DocumentNode = {
        ...newDoc,
        definitions: newDefinitions,
      };

      // this.props.onCommit(finalDoc);
      editorStore.updateActiveTabValues({ query: print(finalDoc) });
    }
  }

  emit('set-arg-value', base);
}

function devariablize() {
  const { argValue, definition } = props;
  if (!argValue || argValue.kind !== 'Variable') return;

  const variableName = argValue.name.value;
  const variableDefinition = ((definition as any).variableDefinitions || []).find(
    (v: any) => v.variable.name.value === variableName,
  );
  if (!variableDefinition) return;

  const defaultValue = variableDefinition.defaultValue || null;
  const newDoc: DocumentNode | null = setArgValue(defaultValue);

  if (newDoc) {
    const targetOperation: OperationDefinitionNode | null =
      newDoc.definitions.find(
        (definition): definition is OperationDefinitionNode =>
          definition.kind === 'OperationDefinition' &&
          definition.name?.value === (props.definition as any)?.name?.value,
      ) || null;

    if (!targetOperation) {
      return;
    }

    let variableUseCount = 0;

    visit(targetOperation, {
      Variable(node) {
        if (node.name.value === variableName) {
          variableUseCount = variableUseCount + 1;
        }
      },
    });

    let newVariableDefinitions = targetOperation.variableDefinitions || [];

    // A variable is in use if it shows up at least twice (once in the definition, once in the selection)
    if (variableUseCount < 2) {
      newVariableDefinitions = newVariableDefinitions.filter(varDef => varDef.variable.name.value !== variableName);
    }

    const newOperation = {
      ...targetOperation,
      variableDefinitions: newVariableDefinitions,
    };

    const existingDefs = newDoc.definitions;

    const newDefinitions = existingDefs.map(existingOperation => {
      if (targetOperation === existingOperation) {
        return newOperation;
      } else {
        return existingOperation;
      }
    });

    const finalDoc: DocumentNode = {
      ...newDoc,
      definitions: newDefinitions,
    };

    // this.props.onCommit(finalDoc);
    editorStore.updateActiveTabValues({ query: print(finalDoc) });
  }
}

function toggleArg() {
  const shouldAdd = !props.argValue;
  if (shouldAdd) emit('add-arg');
  else emit('remove-arg');
  displayArgActions.value = shouldAdd;
}
</script>

<template>
  <div
    :data-arg-name="arg.name"
    :data-arg-type="argType.name"
    :class="`abstract-arg-view graphiql-explorer-${arg.name}`"
  >
    <span class="arg-toggler" @click="toggleArg">
      <template v-if="isInputObjectType(argType)">
        <span
          style="display: inline"
          v-html="argValue ? ctx.styleConfig.value.arrowOpen : ctx.styleConfig.value.arrowClosed"
        />
      </template>
      <template v-else>
        <Checkbox :checked="!!argValue" :style-config="ctx.styleConfig.value" style="margin-right: 4px" />
      </template>

      <span
        :style="{ color: ctx.styleConfig.value.colors.attribute }"
        @mouseenter="!!argValue && (displayArgActions = true)"
        @mouseleave="displayArgActions = false"
      >
        {{ arg.name }}{{ isRequiredArgument(arg) ? '*' : '' }}:
        <button v-if="displayArgActions" class="toolbar-button" @click.prevent.stop="handleArgAction">
          <span>$</span>
          <span v-if="argValue?.kind === 'Variable'">{{ argValue.name.value }}</span>
        </button>
      </span>
    </span>

    <!-- Boolean Input -->
    <select
      v-if="inputComponent?.type === 'boolean'"
      :value="inputComponent.value"
      :style="{ color: ctx.styleConfig.value.colors.builtin }"
      @change="emit('set-arg-value', $event)"
    >
      <option value="true">true</option>
      <option value="false">false</option>
    </select>

    <select
      v-if="inputComponent?.type === 'enum'"
      :value="inputComponent.current"
      @change="emit('set-arg-value', $event)"
    >
      <option v-for="v in inputComponent.values" :key="v.name" :value="v.name">
        {{ v.name }}
      </option>
    </select>

    <ScalarInput
      v-if="inputComponent?.type === 'scalar'"
      :arg="arg"
      :arg-value="argValue || ({} as ValueNode)"
      @set-arg-value="event => emit('set-arg-value', event)"
    />

    <div v-if="inputComponent?.type === 'object' && argValue?.kind === 'ObjectValue'" style="margin-left: 16px">
      <InputArgView
        v-for="(field, name) in inputComponent.fields"
        :key="name"
        :arg="field"
        :parent-field="parentField"
        :selection="props.selection"
        :selections="props.selections"
        :object-value="argValue"
        :definition="props.definition"
        @modify-fields="fields => emit('set-arg-fields', fields)"
      />
    </div>
  </div>
</template>

<style scoped>
.abstract-arg-view {
  min-height: 16px;
  user-select: none;
}
</style>
