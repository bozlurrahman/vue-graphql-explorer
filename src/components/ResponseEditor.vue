<!-- src/components/gql/ResponseEditor.vue -->
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue-demi';
import { useSimpleEditor } from '../composables/useSimpleEditor';
import { formatError } from '../lib/explorer';
import { useEditorStore } from '../stores/editor';
import { useSchemaStore } from '../stores/schema';

// ── Stores ───────────────────────────────────────────────────────────────────
const { fetchError, validationErrors } = useSchemaStore();
const editorStore = useEditorStore();
const { initialResponse, setResponseEditor } = editorStore;

// ── Editor init ──────────────────────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null);

const editor = useSimpleEditor(containerRef, {
  mode: 'graphql-results',
  readOnly: true,
  initialValue: initialResponse,
});

watch(
  editor,
  inst => {
    setResponseEditor(inst);
  },
  { immediate: true },
);

// ── Reflect schema errors into the response pane ─────────────────────────────
watch([editor, () => fetchError, () => validationErrors], ([inst, err, valErrors]) => {
  if (!inst) return;
  if (err) {
    inst.setValue(err);
    return;
  }
  if (valErrors?.length) {
    inst.setValue(formatError(valErrors));
    return;
  }
});

onBeforeUnmount(() => {
  setResponseEditor(null);
});
</script>

<template>
  <div ref="containerRef" class="result-window se-wrapper" />
</template>

<style scoped>
.se-wrapper {
  width: 100%;
  height: 100%;
  cursor: default;
}
</style>
