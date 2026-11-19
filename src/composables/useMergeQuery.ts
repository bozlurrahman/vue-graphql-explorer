import { print } from 'graphql';
import { mergeAst } from '../lib/explorer';

export function useMergeQuery() {
  const { queryEditor } = useEditorStore();
  const { schema } = useSchemaStore();

  return () => {
    if (!queryEditor || !schema) return;
    const documentAST = queryEditor?.documentAST;
    const query = queryEditor?.getValue();
    if (!documentAST || !query) return;
    queryEditor.setValue(print(mergeAst(documentAST, schema as any)));
  };
}
