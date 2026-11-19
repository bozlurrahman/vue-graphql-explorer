<!-- src/components/gql/VariableEditor.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue-demi';
import { useSimpleEditor } from '../composables/useSimpleEditor';
import { useEditorStore } from '../stores/editor';
import { useExecutionStore } from '../stores/execution';

// ── Props & emits ────────────────────────────────────────────────────────────
const props = defineProps<{
  isHidden?: boolean;
  onEdit?: (value: string) => void;
}>();
defineEmits(['onClickReference']);

// ── Stores ───────────────────────────────────────────────────────────────────
const editorStore = useEditorStore();
const executionCtx = useExecutionStore();

// ── Editor init ──────────────────────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null);

const editor = useSimpleEditor(containerRef, {
  mode: 'graphql-variables', // JSON-like tokenizer
  initialValue: editorStore.initialVariables,
  onChange(value) {
    editorStore.updateActiveTabValues({ variables: value });
  },
});

watch(
  editor,
  inst => {
    if (inst) editorStore.setVariableEditor(inst);
  },
  { immediate: true },
);

// ── Visibility: refresh when panel becomes visible ───────────────────────────
watch(
  () => props.isHidden,
  hidden => {
    if (!hidden) editor.value?.refresh();
  },
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
