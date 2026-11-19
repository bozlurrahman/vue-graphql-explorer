<!-- src/components/gql/QueryEditor.vue -->
<script setup lang="ts">
import type { GraphQLSchema } from 'graphql';
import {
  getAutocompleteSuggestions,
  getDiagnostics,
  getHoverInformation,
  getOperationFacts,
  type IPosition,
} from 'graphql-language-service';
import { useTemplateRef } from 'vue';
import {
  useSimpleEditor,
  type ClickInfo,
  type CompletionItem,
  type LintDiagnostic,
} from '../composables/useSimpleEditor';
import { getSelectedOperationName, type SimpleEditorInstanceWithOperationFacts } from '../lib/explorer';

// ── Stores ───────────────────────────────────────────────────────────────────
const executionCtx = useExecutionStore();
const schemaStore = useSchemaStore();
const editorStore = useEditorStore();
const { initialQuery, setQueryEditor, updateActiveTabValues } = editorStore;

// ── Helpers: offset ↔ line/column ────────────────────────────────────────────
function offsetToPos(text: string, offset: number): IPosition {
  const lines = text.slice(0, offset).split('\n');
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1]?.length || 0,
    setLine(line: number) {
      this.line = line;
    },
    setCharacter(character: number) {
      this.character = character;
    },
    lessThanOrEqualTo(position: IPosition) {
      if (this.line < position.line) return true;
      if (this.line === position.line && this.character <= position.character) return true;
      return false;
    },
  };
}

function posToOffset(text: string, line: number, character: number): number {
  const lines = text.split('\n');
  return lines.slice(0, line).reduce((a, l) => a + l.length + 1, 0) + character;
}

// ── Lint ──────────────────────────────────────────────────────────────────────
async function handleLint(value: string): Promise<LintDiagnostic[]> {
  const schema = schemaStore.schema as GraphQLSchema | null;
  if (!schema || !value.trim()) return [];

  try {
    const raw = getDiagnostics(value, schema);
    return raw.map(d => ({
      from: posToOffset(value, d.range.start.line, d.range.start.character),
      to: posToOffset(value, d.range.end.line, d.range.end.character),
      severity: (d.severity === 1 ? 'error' : d.severity === 2 ? 'warning' : 'info') as LintDiagnostic['severity'],
      message: d.message,
    }));
  } catch {
    return [];
  }
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
async function handleComplete(value: string, cursorOffset: number): Promise<CompletionItem[]> {
  const schema = schemaStore.schema as GraphQLSchema | null;
  if (!schema) return [];

  try {
    const pos = offsetToPos(value, cursorOffset);
    const suggestions = getAutocompleteSuggestions(schema, value, pos);

    return suggestions.map(s => ({
      label: s.label,
      detail: s.detail ?? (s.type ? String(s.type) : undefined),
      documentation: s.documentation ? String(s.documentation) : undefined,
      insertText: s.insertText ?? s.label,
    }));
  } catch {
    return [];
  }
}

// ── Ctrl+Click info ───────────────────────────────────────────────────────────
async function handleClickToken(info: ClickInfo, value: string): Promise<string | null> {
  const schema = schemaStore.schema as GraphQLSchema | null;
  if (!schema) return null;

  try {
    const pos = offsetToPos(value, info.from);
    const hover = getHoverInformation(schema, value, pos);
    if (!hover) return null;

    const contents = Array.isArray(hover) ? hover : [hover];

    const lines = contents.map(c => (typeof c === 'string' ? c : (c.value ?? ''))).filter(Boolean);

    if (!lines.length) return null;

    // Build a small info card
    const title = info.token;
    const body = lines.join('\n').trim();

    return `
      <h4>${escHtml(title)}</h4>
      <p style="white-space:pre-wrap;font-size:11.5px;color:#a6adc8">${escHtml(body)}</p>
    `;
  } catch {
    return null;
  }
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Editor init ───────────────────────────────────────────────────────────────
const containerRef = useTemplateRef<HTMLDivElement>('container');

function getAndUpdateOperationFacts(editorInstance: SimpleEditorInstanceWithOperationFacts) {
  const schema = schemaStore.schema as GraphQLSchema | null;
  const operationFacts = getOperationFacts(schema, editorInstance.getValue());

  // Update operation name should any query names change.
  const operationName = getSelectedOperationName(
    editorInstance.operations ?? undefined,
    editorInstance.operationName ?? undefined,
    operationFacts?.operations,
  );

  // Store the operation facts on editor properties
  editorInstance.documentAST = operationFacts?.documentAST ?? null;
  editorInstance.operationName = operationName ?? null;
  editorInstance.operations = operationFacts?.operations ?? null;

  // // Update variable types for the variable editor
  // if (editorStore.variableEditor) {
  //   editorStore.variableEditor.state.lint.linterOptions.variableToType = operationFacts?.variableToType;
  //   editorStore.variableEditor.options.lint.variableToType = operationFacts?.variableToType;
  //   editorStore.variableEditor.options.hintOptions.variableToType = operationFacts?.variableToType;

  //   // codeMirrorRef.current?.signal(editorStore.variableEditor, 'change', editorStore.variableEditor);
  // }

  return operationFacts ? { ...operationFacts, operationName } : null;
}
const editor = useSimpleEditor(containerRef, {
  mode: 'graphql',
  initialValue: initialQuery,
  onChange(value, instance) {
    getAndUpdateOperationFacts(instance as SimpleEditorInstanceWithOperationFacts);
    updateActiveTabValues({ query: value, operationName: null });
  },
  onLint: handleLint,
  onComplete: handleComplete,
  onClickToken: handleClickToken,
});

watch(
  editor,
  inst => {
    if (inst) {
      const queryEditor = inst as SimpleEditorInstanceWithOperationFacts;
      queryEditor.documentAST = null;
      queryEditor.operationName = null;
      queryEditor.operations = null;
      queryEditor.variableToType = null;

      setQueryEditor(queryEditor);
    }
  },
  { immediate: true },
);

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    executionCtx?.run?.();
  }
}
</script>

<template>
  <div ref="container" class="graphiql-editor se-wrapper" @keydown="handleKeyDown" />
</template>

<style scoped>
.se-wrapper {
  width: 100%;
  height: 100%;
}
</style>
