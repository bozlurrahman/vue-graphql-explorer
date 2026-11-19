// composables/useCopyQuery.ts
import copyToClipboard from 'copy-to-clipboard';

export type UseCopyQueryArgs = {
  onCopyQuery?: (query: string) => void;
};

export function useCopyQuery({ onCopyQuery }: UseCopyQueryArgs = {}) {
  const { queryEditor } = useEditorStore();

  return () => {
    if (!queryEditor) return;

    const query = queryEditor.getValue();
    copyToClipboard(query);
    onCopyQuery?.(query);
  };
}
