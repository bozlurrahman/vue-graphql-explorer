<!-- src/components/gql/GraphiQLInterface.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue-demi';
import '../styles/explorer.css';
import '../styles/simple-editor.css';
import { DOC_EXPLORER_PLUGIN, ExplorerPlugin, HISTORY_PLUGIN, TAB_CLASS_PREFIX } from '../lib/explorer';
import { useDragResize } from '../composables/useDragResize';

import ToolTip from './ToolTip.vue';
import Spinner from './Spinner.vue';
import HeaderEditor from './HeaderEditor.vue';
import { ReloadIcon } from './icons';
import QueryEditor from './QueryEditor.vue';
import ResponseEditor from './ResponseEditor.vue';
import SettingsDialog from './SettingsDialog.vue';
import ShortcutsDialog from './ShortcutsDialog.vue';
import Tabs from './Tabs.vue';
import ExecuteButton from './toolbar/ExecuteButton.vue';
import ToolbarButton from './toolbar/ToolbarButton.vue';
import UnStyledButton from './UnStyledButton.vue';
import VariableEditor from './VariableEditor.vue';
import { useEditorStore } from '../stores/editor';
import { useExecutionStore } from '../stores/execution';
import { usePluginStore } from '../stores/plugin';
import { useSchemaStore } from '../stores/schema';
import { useExplorerOptions } from '../stores/registry';
import { useExplorerFetcher } from '../composables/useExplorerFetcher';

const pluginResizeFirstRef = ref<HTMLElement | null>(null);
const pluginResizeDragBarRef = ref<HTMLElement | null>(null);
const pluginResizeSecondRef = ref<HTMLElement | null>(null);

const editorResizeFirstRef = ref<HTMLElement | null>(null);
const editorResizeDragBarRef = ref<HTMLElement | null>(null);
const editorResizeSecondRef = ref<HTMLElement | null>(null);

const editorToolsResizeFirstRef = ref<HTMLElement | null>(null);
const editorToolsResizeDragBarRef = ref<HTMLElement | null>(null);
const editorToolsResizeSecondRef = ref<HTMLElement | null>(null);

const options = useExplorerOptions();

const editorStore = useEditorStore();
editorStore.init({ defaultQuery: options.defaultQuery });

const fetcher = useExplorerFetcher();
const executionStore = useExecutionStore();
executionStore.init({ fetcher });

const pluginStore = usePluginStore();
const schemaStore = useSchemaStore();
const refetchSchema = () => schemaStore.introspect(fetcher, { force: true });
schemaStore.introspect(fetcher);

// A different endpoint or credentials can mean a different schema.
watch(
  () => [options.url, options.headers, options.fetcher],
  () => {
    schemaStore.reset();
    refetchSchema();
  },
);

pluginStore.plugins = [DOC_EXPLORER_PLUGIN, HISTORY_PLUGIN, ExplorerPlugin];

const pluginResize = useDragResize({
  firstRef: pluginResizeFirstRef,
  dragBarRef: pluginResizeDragBarRef,
  secondRef: pluginResizeSecondRef,
  defaultSizeRelation: 1 / 3,
  direction: 'horizontal',
  initiallyHidden: pluginStore?.visiblePlugin ? undefined : 'first',
  onHiddenElementChange(resizableElement) {
    if (resizableElement === 'first') {
      pluginStore?.setVisiblePlugin(null);
    }
  },
  sizeThresholdSecond: 200,
  storageKey: 'docExplorerFlex',
});

useDragResize({
  firstRef: editorResizeFirstRef,
  dragBarRef: editorResizeDragBarRef,
  secondRef: editorResizeSecondRef,
  direction: 'horizontal',
  storageKey: 'editorFlex',
});

const editorToolsResize = useDragResize({
  firstRef: editorToolsResizeFirstRef,
  dragBarRef: editorToolsResizeDragBarRef,
  secondRef: editorToolsResizeSecondRef,
  defaultSizeRelation: 3,
  direction: 'vertical',
  initiallyHidden: editorStore.initialVariables || editorStore.initialHeaders ? undefined : 'second',
  sizeThresholdSecond: 60,
  storageKey: 'secondaryEditorFlex',
});

// ─── Active secondary tool tab ─────────────────────────────────
const activeSecondaryEditor = ref<'variables' | 'headers'>('variables');

const handleToolsTabClick = (name: 'variables' | 'headers') => {
  if (editorToolsResize.hiddenElement.value === 'second') {
    editorToolsResize.hiddenElement.value = null;
  }
  activeSecondaryEditor.value = name;
};

const onClickReference = () => {
  if (pluginResize.hiddenElement.value === 'first') {
    pluginResize.hiddenElement.value = null;
  }
};

const toggleEditorTools = () => {
  editorToolsResize.hiddenElement.value = editorToolsResize.hiddenElement.value === 'second' ? null : 'second';
};
</script>

<template>
  <div class="graphiql-container">
    <div class="graphiql-sidebar">
      <div class="graphiql-sidebar-section">
        <ToolbarButton
          v-for="plugin in pluginStore.plugins"
          :key="plugin.title"
          :label="plugin.title"
          :active="pluginStore.visiblePlugin === plugin"
          @click="pluginStore.visiblePlugin = pluginStore.visiblePlugin === plugin ? null : plugin"
        >
          <span v-html="plugin.icon" />
        </ToolbarButton>
      </div>

      <div class="graphiql-sidebar-section">
        <div title="Re-fetch GraphQL schema">
          <UnStyledButton
            type="button"
            :disabled="schemaStore.isFetching"
            aria-label="Re-fetch GraphQL schema"
            @click="refetchSchema"
          >
            <ReloadIcon :class="{ 'graphiql-spin': schemaStore.isFetching }" aria-hidden="true" />
          </UnStyledButton>
        </div>
        <SettingsDialog />
        <ShortcutsDialog />
      </div>
    </div>

    <div class="graphiql-main">
      <div
        v-if="pluginStore.visiblePlugin"
        ref="pluginResizeFirstRef"
        class="graphiql-plugin-pane"
        :style="{ minWidth: '200px', display: 'flex', flex: '0.333333 1 0%' }"
      >
        <div class="graphiql-plugin">
          <component :is="pluginStore.visiblePlugin.content" />
        </div>
      </div>

      <div
        v-if="pluginStore.visiblePlugin"
        ref="pluginResizeDragBarRef"
        class="graphiql-horizontal-drag-bar"
        style="display: flex"
      />

      <div ref="pluginResizeSecondRef" class="graphiql-sessions">
        <div class="graphiql-session-header">
          <Tabs aria-label="Select active operation" />
        </div>

        <div
          id="graphiql-session"
          role="tabpanel"
          class="graphiql-session"
          :aria-labelledby="`${TAB_CLASS_PREFIX}${editorStore.activeTabIndex}`"
        >
          <div ref="editorResizeFirstRef" style="display: flex; flex: 1 1 0%">
            <div :class="['graphiql-editors full-height']">
              <div ref="editorToolsResizeFirstRef" style="display: flex; flex: 3 1 0%">
                <section class="graphiql-query-editor" aria-label="Query Editor">
                  <QueryEditor
                    :editor-theme="undefined"
                    :key-map="undefined"
                    :read-only="undefined"
                    @on-click-reference="onClickReference"
                  />
                  <div class="graphiql-toolbar" role="toolbar" aria-label="Editor Commands">
                    <ExecuteButton />
                    <slot name="toolbar" />
                  </div>
                </section>
              </div>

              <div ref="editorToolsResizeDragBarRef" style="display: flex">
                <div class="graphiql-editor-tools">
                  <UnStyledButton
                    type="button"
                    :class="{
                      active:
                        activeSecondaryEditor === 'variables' && editorToolsResize.hiddenElement.value !== 'second',
                    }"
                    @click="handleToolsTabClick('variables')"
                  >
                    Variables
                  </UnStyledButton>

                  <UnStyledButton
                    type="button"
                    :class="{
                      active: activeSecondaryEditor === 'headers' && editorToolsResize.hiddenElement.value !== 'second',
                    }"
                    @click="handleToolsTabClick('headers')"
                  >
                    Headers
                  </UnStyledButton>

                  <ToolTip
                    :label="
                      editorToolsResize.hiddenElement.value === 'second' ? 'Show editor tools' : 'Hide editor tools'
                    "
                  >
                    <UnStyledButton
                      type="button"
                      :aria-label="
                        editorToolsResize.hiddenElement.value === 'second' ? 'Show editor tools' : 'Hide editor tools'
                      "
                      class="graphiql-toggle-editor-tools"
                      @click="toggleEditorTools"
                    >
                      <svg
                        v-if="editorToolsResize.hiddenElement.value === 'second'"
                        class="graphiql-chevron-icon"
                        aria-hidden="true"
                        height="1em"
                        viewBox="0 0 14 9"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M13 8L7 2L1 8" stroke="currentColor" stroke-width="1.5" />
                      </svg>
                      <svg
                        v-else
                        class="graphiql-chevron-icon"
                        aria-hidden="true"
                        height="1em"
                        viewBox="0 0 14 9"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="1.5" />
                      </svg>
                    </UnStyledButton>
                  </ToolTip>
                </div>
              </div>
              <div ref="editorToolsResizeSecondRef" style="display: flex; flex: 1 1 0%">
                <section
                  class="graphiql-editor-tool"
                  :aria-label="activeSecondaryEditor === 'variables' ? 'Variables' : 'Headers'"
                >
                  <VariableEditor
                    :on-click-reference="onClickReference"
                    :is-hidden="activeSecondaryEditor !== 'variables'"
                  />
                  <HeaderEditor :is-hidden="activeSecondaryEditor !== 'headers'" />
                </section>
              </div>
            </div>
          </div>
          <div ref="editorResizeDragBarRef" class="graphiql-horizontal-drag-bar" />
          <div ref="editorResizeSecondRef" style="display: flex; flex: 1 1 0%">
            <div class="graphiql-response">
              <span v-if="executionStore.isSubscribed">Listening...</span>
              <Spinner v-else-if="executionStore.isFetching" />
              <ResponseEditor />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style></style>
