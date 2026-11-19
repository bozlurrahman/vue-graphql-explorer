import { parse, print } from 'graphql';

export function usePrettifyEditors() {
  const { queryEditor, headerEditor, variableEditor } = useEditorStore();

  return () => {
    if (variableEditor) {
      const content = variableEditor.getValue();
      try {
        const prettified = JSON.stringify(JSON.parse(content), null, 2);
        if (prettified !== content) variableEditor.setValue(prettified);
      } catch {
        /* Parsing JSON failed, skip prettification */
      }
    }

    if (headerEditor) {
      const content = headerEditor.getValue();
      try {
        const prettified = JSON.stringify(JSON.parse(content), null, 2);
        if (prettified !== content) headerEditor.setValue(prettified);
      } catch {
        /* Parsing JSON failed, skip prettification */
      }
    }

    if (queryEditor) {
      const content = queryEditor.getValue();
      const prettified = print(parse(content));
      if (prettified !== content) queryEditor.setValue(prettified);
    }
  };
}
