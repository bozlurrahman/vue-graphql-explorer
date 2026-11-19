<!-- src/components/gql/explorer/Operations.vue -->
<script setup lang="ts">
import {
  GraphQLObjectType,
  Kind,
  print,
  type DefinitionNode,
  type ExecutableDefinitionNode,
  type OperationDefinitionNode,
} from 'graphql';
import { computed, ref } from 'vue-demi';
import { useExplorerContext } from '../../composables/useExplorerContext';
import { DEFAULT_DOCUMENT, type AvailableFragments, type OperationType } from '../../lib/explorer';
import RootView from './RootView.vue';
import { useEditorStore } from '../../stores/editor';
import { useSchemaStore } from '../../stores/schema';

export type OperationProps = {
  operation: ExecutableDefinitionNode;
  isLast: boolean;
};

const props = defineProps<OperationProps>();

const schemaStore = useSchemaStore();
const editorStore = useEditorStore();
const ctx = useExplorerContext();

// ── Schema field roots ────────────────────────────────────────────────────────

const queryFields = computed(() => schemaStore.schema?.getQueryType()?.getFields() || null);
const mutationFields = computed(() => schemaStore.schema?.getMutationType()?.getFields() || null);
const subscriptionFields = computed(() => schemaStore.schema?.getSubscriptionType()?.getFields() || null);

// Expose so Explorer.vue can conditionally show the actions bar
defineExpose({ queryFields, mutationFields, subscriptionFields });

const relevantOperations = computed(() => {
  const defs = editorStore.activeParsedQuery.definitions.filter(
    def => def.kind === Kind.OPERATION_DEFINITION || def.kind === Kind.FRAGMENT_DEFINITION,
  ) as ExecutableDefinitionNode[];
  return defs.length === 0 ? (DEFAULT_DOCUMENT.definitions as ExecutableDefinitionNode[]) : defs;
});

// ── Fragment resolution ───────────────────────────────────────────────────────

const documentFragments = computed<AvailableFragments>(() =>
  relevantOperations.value.reduce<AvailableFragments>((acc, operation) => {
    if (operation?.kind !== Kind.FRAGMENT_DEFINITION) return acc;
    const fragmentTypeName = operation.typeCondition.name.value;
    const existing = acc[fragmentTypeName] ?? [];
    return {
      ...acc,
      [fragmentTypeName]: [...existing, operation].sort((a, b) => a.name.value.localeCompare(b.name.value)),
    };
  }, {} as AvailableFragments),
);

// Merge document-level fragments with any externally provided ones.
// externalFragments come from Explorer via context (originally props.externalFragments).
const availableFragments = computed<AvailableFragments>(() => ({
  ...documentFragments.value,
  ...ctx.externalFragments.value,
}));

// ── Scroll-to tracking ────────────────────────────────────────────────────────

const operationToScrollTo = ref<string | undefined>();

function handleRootViewMount(rootViewElId: string) {
  if (operationToScrollTo.value === rootViewElId) {
    document.querySelector(`.graphiql-explorer-root #${rootViewElId}`)?.scrollIntoView();
  }
}

// ── Operation CRUD ────────────────────────────────────────────────────────────

function handleOperationClone(targetOperation: DefinitionNode) {
  const kind =
    targetOperation.kind === Kind.FRAGMENT_DEFINITION
      ? 'fragment'
      : (targetOperation as OperationDefinitionNode).operation;
  const baseName = (targetOperation as OperationDefinitionNode).name?.value || '';
  const newName = `${baseName}Copy`;
  const newOperation = { ...targetOperation, name: { kind: Kind.NAME, value: newName } } as DefinitionNode;
  operationToScrollTo.value = `${kind}-${newName}`;
  editorStore.setOperationName(
    print({
      ...editorStore.activeParsedQuery,
      definitions: [...editorStore.activeParsedQuery.definitions, newOperation],
    }),
  );
}

function handleOperationDestroy(targetOperation: DefinitionNode) {
  const newDefinitions = editorStore.activeParsedQuery.definitions.filter(def => def !== targetOperation);
  editorStore.setOperationName(print({ ...editorStore.activeParsedQuery, definitions: newDefinitions }));
}

function handleOperationEdit(newDefinition?: DefinitionNode | null) {
  if (newDefinition) {
    const newDefinitions = editorStore.activeParsedQuery.definitions.map(def =>
      def === props.operation ? newDefinition : def,
    );
    const newDoc = { ...editorStore.activeParsedQuery, definitions: newDefinitions };
    editorStore.updateActiveTabValues({ query: print(newDoc) });
    return newDoc;
  }
  return editorStore.activeParsedQuery;
}

// ── Operation field/type helpers ──────────────────────────────────────────────

function getFieldsForOperation(operation: DefinitionNode) {
  const operationType: OperationType =
    operation.kind === Kind.FRAGMENT_DEFINITION ? 'fragment' : (operation as any)?.operation || 'query';

  if (operationType === 'query') return queryFields.value;
  if (operationType === 'mutation') return mutationFields.value;
  if (operationType === 'subscription') return subscriptionFields.value;

  if (operation.kind === Kind.FRAGMENT_DEFINITION) {
    const fragmentType =
      operation.typeCondition.kind === 'NamedType' && schemaStore.schema?.getType(operation.typeCondition.name.value);
    return fragmentType instanceof GraphQLObjectType ? fragmentType.getFields() : null;
  }

  return null;
}

function getOperationType(operation: DefinitionNode): OperationType {
  if (operation.kind === Kind.FRAGMENT_DEFINITION) return 'fragment';
  return (operation as OperationDefinitionNode).operation || 'query';
}

function getOperationName(operation: DefinitionNode): string {
  return (operation as OperationDefinitionNode).name?.value || '';
}

function getFragmentTypeName(operation: DefinitionNode): string | null {
  return operation.kind === Kind.FRAGMENT_DEFINITION ? operation.typeCondition.name.value : null;
}
</script>

<template>
  <RootView
    :is-last="isLast"
    :fields="getFieldsForOperation(operation) || null"
    :operation-type="getOperationType(operation)"
    :name="getOperationName(operation)"
    :on-type-name="getFragmentTypeName(operation)"
    :definition="operation"
    :available-fragments="availableFragments"
    @edit="handleOperationEdit"
    @operation-destroy="handleOperationDestroy(operation)"
    @operation-clone="handleOperationClone(operation)"
    @mount="handleRootViewMount"
  />
</template>
