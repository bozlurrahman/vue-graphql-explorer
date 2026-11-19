// stores/editor.ts
import type { DocumentNode, ExecutableDefinitionNode, FragmentDefinitionNode, ValidationRule } from 'graphql';
import { Kind, parse, visit } from 'graphql';
import { defineExplorerStore, type ExplorerStore } from './registry';
import {
  DEFAULT_DOCUMENT,
  DEFAULT_QUERY,
  STORAGE_KEY_TABS,
  createTab,
  getDefaultTabState,
  parseQuery,
  serializeTabState,
  setPropertiesInActiveTab,
  type SimpleEditorInstanceWithOperationFacts,
  type TabDefinition,
  type TabState,
  type TabsState,
} from '../lib/explorer';
import { useStorageStore } from './storage';
import { computed, ref, shallowRef } from 'vue-demi';
import type { SimpleEditorInstance } from '../composables/useSimpleEditor';

function editorStoreSetup() {
  const storage = useStorageStore();
  const tabs = ref<TabState[]>([]);
  const activeTabIndex = ref(0);
  // Editor instances, the fragment Map and validation rules are replaced, never mutated in place:
  // keep them raw (no deep proxies; Vue 2 cannot observe a Map anyway).
  const headerEditor = shallowRef<SimpleEditorInstance | null>(null);
  const queryEditor = shallowRef<SimpleEditorInstanceWithOperationFacts | null>(null);
  const variableEditor = shallowRef<SimpleEditorInstance | null>(null);
  const responseEditor = shallowRef<SimpleEditorInstance | null>(null);
  const shouldPersistHeaders = ref<boolean>(false);
  const initialQuery = ref('');
  const initialVariables = ref('');
  const initialHeaders = ref('');
  const initialResponse = ref('');
  const externalFragments = shallowRef(new Map<string, FragmentDefinitionNode>());
  const validationRules = shallowRef<ValidationRule[]>([]);

  const tabState = computed<TabsState>(() => ({
    tabs: tabs.value,
    activeTabIndex: activeTabIndex.value,
  }));

  const activeTab = computed<TabState | null>(() => tabs.value[activeTabIndex.value] ?? null);
  const activeQuery = computed<string | null>(() => activeTab.value?.query ?? null);
  const activeParsedQuery = computed<DocumentNode>(() => parseQuery(activeQuery.value || '') || DEFAULT_DOCUMENT);
  const activeOperations = computed<ExecutableDefinitionNode[]>(() => {
    return activeParsedQuery.value.definitions.filter(
      def => def.kind === Kind.OPERATION_DEFINITION || def.kind === Kind.FRAGMENT_DEFINITION,
    ) as ExecutableDefinitionNode[];
  });

  // Query for new tabs: the host's `defaultQuery`, else the built-in welcome text.
  let defaultQueryForNewTabs = DEFAULT_QUERY;

  function init({
    defaultQuery,
    externalFragments,
    defaultTabs,
    theValidationRules,
    defaultHeaders,
  }: {
    defaultQuery?: string;
    externalFragments?: string | FragmentDefinitionNode[];
    headers?: string;
    defaultTabs?: TabDefinition[];
    response?: string;
    theValidationRules?: ValidationRule[];
    variables?: string;
    defaultHeaders?: string;
  }) {
    const storedState = storage?.get(STORAGE_KEY_TABS) ?? null;
    if (defaultQuery !== undefined) defaultQueryForNewTabs = defaultQuery;

    const tabState = getDefaultTabState({
      defaultQuery: defaultQueryForNewTabs,
      defaultTabs,
      defaultHeaders,
      storedState,
    });

    tabs.value = tabState.tabs;
    activeTabIndex.value = tabState.activeTabIndex;

    initialQuery.value = tabs.value[activeTabIndex.value]?.query ?? '';
    initialVariables.value = tabs.value[activeTabIndex.value]?.variables ?? '';
    initialHeaders.value = tabs.value[activeTabIndex.value]?.headers ?? defaultHeaders ?? '';
    initialResponse.value = tabs.value[activeTabIndex.value]?.response ?? '';

    setExternalFragments(externalFragments);
    validationRules.value = theValidationRules || [];

    storeTabs();
  }

  function setExternalFragments(fragments?: string | FragmentDefinitionNode[]) {
    const map = new Map<string, FragmentDefinitionNode>();
    if (Array.isArray(fragments)) {
      for (const fragment of fragments) {
        map.set(fragment.name.value, fragment);
      }
    } else if (typeof fragments === 'string') {
      visit(parse(fragments, {}), {
        FragmentDefinition(fragment) {
          map.set(fragment.name.value, fragment);
        },
      });
    } else if (fragments) {
      throw new Error(
        'The `externalFragments` must either be a string that contains the fragment definitions in SDL or a list of FragmentDefinitionNode objects.',
      );
    }
    externalFragments.value = map;
  }

  function addTab(defaultHeaders?: string, defaultQuery: string = defaultQueryForNewTabs) {
    const updatedValues = synchronizeActiveTabValues();
    const newTab = createTab({
      headers: defaultHeaders,
      query: defaultQuery,
    });
    tabs.value = [...updatedValues.tabs, newTab];
    activeTabIndex.value = updatedValues.tabs.length;
    storeTabs();
    setEditorValues(newTab);
    // Call onTabChange if needed (assume handled externally)
  }

  function changeTab(index: number) {
    activeTabIndex.value = index;
    storeTabs();
    const currentTab = tabs.value[index];
    if (currentTab) setEditorValues(currentTab);
  }

  function moveTab(newOrder: TabState[]) {
    const activeTab = tabs.value[activeTabIndex.value]!;
    tabs.value = newOrder;
    activeTabIndex.value = newOrder.indexOf(activeTab);
    storeTabs();
    const updatedTab = tabs.value[activeTabIndex.value];
    if (updatedTab) setEditorValues(updatedTab);
  }

  function closeTab(index: number) {
    tabs.value = tabs.value.filter((_tab, i) => index !== i);
    activeTabIndex.value = Math.max(activeTabIndex.value - 1, 0);
    storeTabs();
    const currentTab = tabs.value[activeTabIndex.value];
    if (currentTab) setEditorValues(currentTab);
  }

  function updateActiveTabValues(partialTab: Partial<Omit<TabState, 'id' | 'hash' | 'title'>>) {
    const updated = setPropertiesInActiveTab(tabState.value, partialTab);
    tabs.value = [...updated.tabs];

    storeTabs();
    const currentTab = updated.tabs[activeTabIndex.value];
    if (currentTab) setEditorValues(currentTab);
  }

  function setOperationName(operationName: string) {
    if (!queryEditor.value) return;
    // queryEditor.value.operationName = operationName; // will code later
    updateActiveTabValues({ operationName });
    // Call onEditOperationName if needed
  }

  function synchronizeActiveTabValues(): TabsState {
    const query = queryEditor.value?.getValue() ?? null;
    const variables = variableEditor.value?.getValue() ?? null;
    const headers = headerEditor.value?.getValue() ?? null;
    // const operationName = queryEditor.value?.operationName ?? null; // temporary until we implement operationName tracking in the editor
    const operationName = null;
    const response = responseEditor.value?.getValue() ?? null;
    return setPropertiesInActiveTab(tabState.value, {
      query,
      variables,
      headers,
      response,
      operationName,
    });
  }

  function setEditorValues(tab: TabState) {
    queryEditor.value?.setValue(tab.query ?? '');
    variableEditor.value?.setValue(tab.variables ?? '');
    headerEditor.value?.setValue(tab.headers ?? '');
    responseEditor.value?.setValue(tab.response ?? '');
  }

  function storeTabs() {
    const serialized = serializeTabState(tabState.value, shouldPersistHeaders.value);
    storage?.set(STORAGE_KEY_TABS, serialized);
  }

  function setVariableEditor(editor: SimpleEditorInstance | null) {
    variableEditor.value = editor;
  }
  function setQueryEditor(editor: SimpleEditorInstanceWithOperationFacts | null) {
    queryEditor.value = editor;
  }
  function setResponseEditor(editor: SimpleEditorInstance | null) {
    responseEditor.value = editor;
  }

  return {
    tabs,
    tabState,
    activeTabIndex,
    activeTab,
    activeQuery,
    activeParsedQuery,
    activeOperations,
    headerEditor,
    queryEditor,
    responseEditor,
    variableEditor,
    shouldPersistHeaders,
    initialQuery,
    initialVariables,
    initialHeaders,
    initialResponse,
    externalFragments,
    validationRules,
    init,
    setExternalFragments,
    setVariableEditor,
    setQueryEditor,
    setResponseEditor,
    addTab,
    changeTab,
    moveTab,
    closeTab,
    updateActiveTabValues,
    setOperationName,
    synchronizeActiveTabValues,
    setEditorValues,
    storeTabs,
  };
}

export const useEditorStore: () => ExplorerStore<ReturnType<typeof editorStoreSetup>> = defineExplorerStore(
  'editor',
  editorStoreSetup,
);
