<!-- src/components/gql/Explorer.vue -->
<script setup lang="ts">
import {
  isEnumType,
  Kind,
  print,
  type ASTNode,
  type FragmentDefinitionNode,
  type GraphQLObjectType,
  type GraphQLSchema,
  type DefinitionNode,
  type GraphQLArgument,
  type GraphQLEnumType,
  type GraphQLInputField,
  type GraphQLScalarType,
  type OperationTypeNode,
  type SelectionSetNode,
  type ValueNode,
} from 'graphql';
import { computed, onMounted, provide, ref, toRef, type CSSProperties } from 'vue-demi';
import { capitalize } from '../lib/strings';
import { ExplorerContextKey } from '../composables/useExplorerContext';
import {
  DEFAULT_DOCUMENT,
  defaultArrowClosed,
  defaultArrowOpen,
  defaultCheckboxChecked,
  defaultCheckboxUnchecked,
  defaultColors,
  defaultGetDefaultFieldNames,
  defaultStyles,
  type AvailableFragments,
  type Colors,
  type GetDefaultScalarArgValue,
  type MakeDefaultArg,
  type Field,
  type NewOperationType,
  type StyleConfig,
} from '../lib/explorer';
import Operation from './explorer/Operation.vue';
import { useEditorStore } from '../stores/editor';
import { useSchemaStore } from '../stores/schema';

// Local copy of GraphiQLExplorerProps (lib/explorer.ts): the Vue 2.7 compiler only reads prop types
// declared in the same file. Keep both in step.
interface Props {
  query?: string;
  width?: number;
  title?: string;
  schema?: GraphQLSchema | null;
  onEdit?: (query: string) => void;
  getDefaultFieldNames?: (type: GraphQLObjectType) => string[];
  getDefaultScalarArgValue?: GetDefaultScalarArgValue;
  makeDefaultArg?: MakeDefaultArg;
  onToggleExplorer?: () => void;
  explorerIsOpen?: boolean;
  onRunOperation?: (name: string | null) => void;
  colors?: Colors;
  arrowOpen?: string | HTMLElement;
  arrowClosed?: string | HTMLElement;
  checkboxChecked?: string | HTMLElement;
  checkboxUnchecked?: string | HTMLElement;
  styles?: {
    explorerActionsStyle?: CSSProperties;
    buttonStyle?: CSSProperties;
    actionButtonStyle?: CSSProperties;
  };
  showAttribution?: boolean;
  hideActions?: boolean;
  externalFragments?: FragmentDefinitionNode[];
}

const props = defineProps<Props>();
const schemaStore = useSchemaStore();
const editorStore = useEditorStore();

function defaultValue(argType: GraphQLEnumType | GraphQLScalarType): ValueNode {
  if (isEnumType(argType)) {
    return { kind: Kind.ENUM, value: argType.getValues()[0]?.name || '' };
  }
  switch (argType.name) {
    case 'String':
      return { kind: Kind.STRING, value: '' };
    case 'Float':
      return { kind: Kind.FLOAT, value: '1.5' };
    case 'Int':
      return { kind: Kind.INT, value: '10' };
    case 'Boolean':
      return { kind: Kind.BOOLEAN, value: false };
    default:
      return { kind: Kind.STRING, value: '' };
  }
}

function defaultGetDefaultScalarArgValue(
  parentField: Field,
  arg: GraphQLArgument | GraphQLInputField,
  argType: GraphQLEnumType | GraphQLScalarType,
): ValueNode {
  return defaultValue(argType);
}

const newOperationType = ref<NewOperationType>('query');
// ── Style config ──────────────────────────────────────────────────────────────

const the_styles = props.styles ? { ...defaultStyles, ...props.styles } : defaultStyles;

const styleConfig = computed<StyleConfig>(() => ({
  colors: props.colors || defaultColors,
  checkboxChecked: props.checkboxChecked || defaultCheckboxChecked,
  checkboxUnchecked: props.checkboxUnchecked || defaultCheckboxUnchecked,
  arrowClosed: props.arrowClosed || defaultArrowClosed,
  arrowOpen: props.arrowOpen || defaultArrowOpen,
  styles: the_styles,
}));

const queryFields = computed(() => schemaStore.schema?.getQueryType()?.getFields() ?? null);
const mutationFields = computed(() => schemaStore.schema?.getMutationType()?.getFields() ?? null);
const subscriptionFields = computed(() => schemaStore.schema?.getSubscriptionType()?.getFields() ?? null);

const externalFragments = computed<AvailableFragments>(() => {
  if (!props.externalFragments) return {};

  return props.externalFragments.reduce<AvailableFragments>((acc, fragment) => {
    if (fragment.kind !== Kind.FRAGMENT_DEFINITION) return acc;
    const typeName = fragment.typeCondition.name.value;
    const existing = acc[typeName] || [];
    const the_fragment = [...(existing ? existing : []), fragment].sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
    return {
      ...acc,
      [typeName]: the_fragment, // Overwrites if multiple fragments per type
    };
  }, {});
});

const showActions = computed(
  () => (queryFields.value || mutationFields.value || subscriptionFields.value) && !props.hideActions,
);

const explorerRef = ref<HTMLElement | null>(null);

const actionsStyles = computed(
  () =>
    styleConfig.value.styles.explorerActionsStyle ?? {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: '6px',
    },
);
const actionsLabelStyles: CSSProperties = { display: 'inline-block', flexGrow: 0, textAlign: 'right' };
const addButtonStyles = computed(() => ({ ...styleConfig.value.styles.buttonStyle, height: '22px', width: '22px' }));

function addOperation(kind: OperationTypeNode) {
  if (!newOperationType.value) return;

  const currentParsed = editorStore.activeParsedQuery;
  const viewingDefault =
    currentParsed.definitions.length === 1 && currentParsed.definitions[0] === DEFAULT_DOCUMENT.definitions[0];

  const siblingDefs = viewingDefault
    ? []
    : currentParsed.definitions.filter(def => def.kind === Kind.OPERATION_DEFINITION && def.operation === kind);

  const newOperationName = `My${capitalize(kind)}${siblingDefs.length === 0 ? '' : siblingDefs.length + 1}`;

  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [
      {
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: '__typename # Placeholder value' },
        arguments: [],
        directives: [],
      },
    ],
  };

  const newDefinition: DefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: kind,
    name: { kind: Kind.NAME, value: newOperationName },
    variableDefinitions: [],
    directives: [],
    selectionSet,
  };

  const newDefinitions: ReadonlyArray<DefinitionNode> = viewingDefault
    ? [newDefinition]
    : [...currentParsed.definitions, newDefinition];

  const out = print({ ...currentParsed, definitions: newDefinitions } as ASTNode);
  editorStore.updateActiveTabValues({ query: out });
}

function handleRunOperation(name?: string) {
  props.onRunOperation?.(name ?? null);
}

provide(ExplorerContextKey, {
  styleConfig,
  externalFragments,
  getDefaultFieldNames: props.getDefaultFieldNames || defaultGetDefaultFieldNames,
  getDefaultScalarArgValue: props.getDefaultScalarArgValue || defaultGetDefaultScalarArgValue,
  makeDefaultArg: toRef(props, 'makeDefaultArg'),
  onRunOperation: handleRunOperation,
});

onMounted(() => explorerRef.value?.scrollTo({ left: 0 }));

// Vue 2.7 templates cannot hold TypeScript casts; casts live here.
const asOperationType = (value: unknown) => value as OperationTypeNode;
</script>

<template>
  <div v-if="schemaStore.schema" ref="explorerRef" class="graphiql-explorer-root">
    <div>
      <Operation
        v-for="(operation, index) in editorStore.activeOperations"
        :key="index"
        :operation="operation"
        :is-last="index === editorStore.activeOperations.length - 1"
      />
    </div>
    <form
      v-if="showActions"
      class="variable-editor-title graphiql-explorer-actions"
      :style="actionsStyles"
      @submit.prevent
    >
      <span :style="actionsLabelStyles">Add new</span>
      <select v-model="newOperationType" :style="{ flexGrow: 2 }">
        <option v-if="queryFields" value="query">Query</option>
        <option v-if="mutationFields" value="mutation">Mutation</option>
        <option v-if="subscriptionFields" value="subscription">Subscription</option>
      </select>
      <button
        type="button"
        class="toolbar-button"
        :style="addButtonStyles"
        @click="addOperation(asOperationType(newOperationType))"
      >
        <span>+</span>
      </button>
    </form>
  </div>
  <div v-else class="graphiql-explorer-root">
    <p>No schema available</p>
  </div>
</template>

<style scoped>
.graphiql-explorer-actions {
  border-color: hsla(var(--color-neutral), var(--alpha-background-heavy)) !important;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-top: 6px;
}

.graphiql-explorer-root {
  grow: 1;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace, Consolas, Inconsolata, 'Droid Sans Mono', Monaco;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.graphiql-explorer-root > div {
  overflow: auto;
}
.graphiql-explorer-root > p {
  margin: auto;
  text-align: center;
}
</style>
