import { computed } from 'vue-demi';
import { useEditorStore } from '../stores/editor';

export type EditorType = 'query' | 'variable' | 'header';

export function useEditorState(editor: EditorType) {
  const context = useEditorStore();

  const editorInstance = context[`${editor}Editor` as const];

  const value = computed<string>({
    get() {
      const editorValue = editorInstance?.getValue() ?? '';
      return editorValue && editorValue.length > 0 ? editorValue : '';
    },
    set(val: string) {
      editorInstance?.setValue(val);
    },
  });

  return value;
}
