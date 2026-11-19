<!-- src/components/gql/HeaderEditor.vue -->
<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useSimpleEditor } from '../composables/useSimpleEditor';

// ── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{ isHidden?: boolean }>();

// ── Stores ───────────────────────────────────────────────────────────────────
const editorStore = useEditorStore();
const executionCtx = useExecutionStore();
const { initialHeaders } = editorStore;
const executionContext = useExecutionStore();
const merge = useMergeQuery();
const prettify = usePrettifyEditors();

// ── Editor init ──────────────────────────────────────────────────────────────
const containerRef = useTemplateRef<HTMLElement>('container');

const editor = useSimpleEditor(containerRef, {
  mode: 'json',
  initialValue: initialHeaders,
  onChange(value) {
    editorStore.updateActiveTabValues({ headers: value });
  },
});

watch(
  editor,
  inst => {
    if (inst) editorStore.headerEditor = inst;
  },
  { immediate: true },
);

// ── Keyboard shortcuts ───────────────────────────────────────────────────────
function handleKeyDown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'Enter') {
    e.preventDefault();
    executionCtx?.run?.();
  }
}
</script>

<template>
  <div
    ref="container"
    :class="['graphiql-editor', 'se-wrapper', { hidden: props.isHidden }]"
    @keydown="handleKeyDown"
  />
</template>

<style scoped>
.se-wrapper {
  width: 100%;
  height: 100%;
}
.hidden {
  display: none;
}
</style>
