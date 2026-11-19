<!-- src/components/gql/HeaderEditor.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue-demi';
import { useSimpleEditor } from '../composables/useSimpleEditor';
import { useEditorStore } from '../stores/editor';
import { useExecutionStore } from '../stores/execution';

// ── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{ isHidden?: boolean }>();

// ── Stores ───────────────────────────────────────────────────────────────────
const editorStore = useEditorStore();
const executionCtx = useExecutionStore();
const { initialHeaders } = editorStore;

// ── Editor init ──────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null);

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
    ref="containerRef"
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
