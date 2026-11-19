<!-- nuxt/components/gql/explorer/RootView.vue -->
<template>
  <div :id="rootViewElId" tabindex="0" :style="rootStyles" @keydown="handlePotentialRun">
    <div
      class="graphiql-operation-title-bar"
      :style="titleBarStyles"
      @mouseenter="displayTitleActions = true"
      @mouseleave="displayTitleActions = false"
    >
      {{ operationType }}
      <span :style="nameStyles">
        <input
          :style="inputStyles"
          autocomplete="off"
          :placeholder="`${capitalize(operationType)} Name`"
          :value="props.name"
          @change="handleRename"
          @keydown="handlePotentialRun"
        />
      </span>
      <span v-if="props.onTypeName">
        <br />
        on {{ props.onTypeName }}
      </span>
      <template v-if="displayTitleActions">
        <button type="button" class="toolbar-button" :style="actionButtonStyles" @click="emit('operation-destroy')">
          <span>✕</span>
        </button>
        <button type="button" class="toolbar-button" :style="actionButtonStyles" @click="emit('operation-clone')">
          <span>⎘</span>
        </button>
      </template>
    </div>
    <FieldView
      v-for="(fieldName, index) in sortedFields"
      :key="index + '_' + fieldName"
      :field="fields[fieldName]!"
      :selections="selections"
      :definition="props.definition"
      :available-fragments="props.availableFragments"
      @modify-selections="modifySelections"
    />
  </div>
</template>

<script setup lang="ts">
import {
  Kind,
  print,
  type DefinitionNode,
  type ExecutableDefinitionNode,
  type GraphQLFieldMap,
  type NameNode,
  type OperationDefinitionNode,
} from 'graphql';
import { capitalize, computed, onMounted, ref } from 'vue';
import { useExplorerContext } from '~/composables/useExplorerContext';
import {
  DEFAULT_DOCUMENT,
  parseQuery,
  type AvailableFragments,
  type OperationType,
  type Selections,
} from '~/lib/explorer';
import FieldView from './FieldView.vue';

export type RootViewProps = {
  isLast: boolean;
  fields: GraphQLFieldMap<any, any> | null;
  operationType: OperationType;
  name?: string;
  onTypeName?: string | null;
  definition: ExecutableDefinitionNode;
  availableFragments: AvailableFragments;
};

const props = defineProps<RootViewProps>();

const emit = defineEmits<{
  edit: [newDefinition: DefinitionNode | null];
  'operation-destroy': [];
  'operation-clone': [];
  mount: [id: string];
}>();

const { styleConfig } = useExplorerContext();
const editorStore = useEditorStore();
const displayTitleActions = ref(false);

const selections = computed<Selections>(
  () => (props.definition as OperationDefinitionNode).selectionSet?.selections || [],
);

const fields = computed(() => props.fields || {});
const sortedFields = computed(() => Object.keys(fields.value).sort());
const operationType = computed(() => capitalize(props.operationType));
const rootViewElId = computed(() => `${props.operationType}-${props.name || 'unknown'}`);

onMounted(() => emit('mount', rootViewElId.value));

function modifySelections(newSelections: Selections) {
  const operationDef = props.definition;

  let newOperationDef: DefinitionNode | null = null;

  if (operationDef.kind === Kind.FRAGMENT_DEFINITION) {
    newOperationDef = {
      ...operationDef,
      selectionSet: {
        ...operationDef.selectionSet,
        selections: newSelections,
      },
    };
  } else if (operationDef.kind === 'OperationDefinition') {
    let cleanedSelections = newSelections.filter(
      selection => !(selection.kind === 'Field' && selection.name.value === '__typename'),
    );

    if (cleanedSelections.length === 0) {
      cleanedSelections = [
        {
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: '__typename ## Placeholder value' },
        },
      ];
    }

    newOperationDef = {
      ...operationDef,
      selectionSet: {
        ...operationDef.selectionSet,
        selections: cleanedSelections,
      },
    };
  }

  emit('edit', newOperationDef);
}

function handleRename(event: Event) {
  const name = (event.target as HTMLInputElement).value;
  const newName: NameNode | undefined = name ? { kind: Kind.NAME, value: name } : undefined;
  const newOperation: DefinitionNode = { ...props.definition, ...(newName ? { name: newName } : {}) };

  const currentQuery = editorStore.tabState.tabs[editorStore.activeTabIndex]?.query ?? '';
  const parsedQuery = parseQuery(currentQuery) || DEFAULT_DOCUMENT;

  const newDefinitions: DefinitionNode[] = parsedQuery.definitions.map(existingOperation =>
    existingOperation === props.definition ? newOperation : existingOperation,
  );

  editorStore.setOperationName(print({ ...parsedQuery, definitions: newDefinitions }));
}

function handlePotentialRun(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === 'Enter' && props.definition.kind !== Kind.FRAGMENT_DEFINITION) {
    useExplorerContext().onRunOperation(props.name);
  }
}

// Styles
const rootStyles = computed(() => ({
  borderBottom: props.isLast ? 'none' : '1px solid #d6d6d6',
  marginBottom: '0em',
  paddingBottom: '1em',
}));
const titleBarStyles = computed(() => ({ color: styleConfig.value.colors.keyword, paddingBottom: '4px' }));
const nameStyles = computed(() => ({ color: styleConfig.value.colors.def }));
const operationDisplayName = computed(() => props.name || `${capitalize(props.operationType)} Name`);
const inputStyles = computed(() => ({
  color: styleConfig.value.colors.def,
  border: 'none',
  borderBottom: '1px solid #888',
  outline: 'none',
  width: `${Math.max(4, operationDisplayName.value.length)}ch`,
}));
const actionButtonStyles = computed(() => styleConfig.value.styles.actionButtonStyle);
</script>
