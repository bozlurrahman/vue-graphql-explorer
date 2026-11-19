import type {
  ArgumentNode,
  ASTVisitor,
  BooleanValueNode,
  DefinitionNode,
  DocumentNode,
  EnumValueNode,
  ExecutionResult,
  FieldNode,
  FloatValueNode,
  FragmentDefinitionNode,
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLError,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  IntrospectionQuery,
  IntValueNode,
  ObjectFieldNode,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  StringValueNode,
  ValidationRule,
  ValueNode,
  VariableDefinitionNode,
} from 'graphql';
import {
  getNamedType,
  isInputObjectType,
  isLeafType,
  isNonNullType,
  isRequiredInputField,
  isScalarType,
  isWrappingType,
  Kind,
  OperationTypeNode,
  parse,
  print,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import type { Client } from 'graphql-ws';
import { meros } from 'meros';
import type { ClientOptions } from 'subscriptions-transport-ws';
import type { CSSProperties } from 'vue-demi';
import Documentation from '../components/Documentation.vue';
import Explorer from '../components/Explorer.vue';
import History from '../components/history/History.vue';
import type { AddSuffix } from '../types/common';
import { isAsyncIterable, makeAsyncIterableIteratorFromSink } from './iterator';
import { defineComponent, markRaw } from 'vue-demi';
import { stripCredentialHeaders } from './credentials';
import { hWithProps } from './h';
import type { Component, Ref } from 'vue-demi';
import type { SimpleEditorInstance } from '../composables/useSimpleEditor';

export const isMacOs = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');
export const THEMES = ['light', 'dark', 'system'] as const;
export const TAB_CLASS_PREFIX = 'graphiql-session-tab-';
const modifier = isMacOs ? '⌘' : 'Ctrl';
export const AUTO_COMPLETE_AFTER_KEY = /^[a-zA-Z0-9_@(]$/;
export const DEFAULT_EDITOR_THEME = 'graphiql';
export const DEFAULT_KEY_MAP: KeyMap = 'sublime';
export const STORAGE_KEY_TABS = 'tabState';

export const commonKeys = {
  [isMacOs ? 'Cmd-F' : 'Ctrl-F']: 'findPersistent',
  'Cmd-G': 'findPersistent',
  'Ctrl-G': 'findPersistent',

  'Ctrl-Left': 'goSubwordLeft',
  'Ctrl-Right': 'goSubwordRight',
  'Alt-Left': 'goGroupLeft',
  'Alt-Right': 'goGroupRight',
};

export const SHORT_KEYS = Object.entries({
  'Search in editor': [modifier, 'F'],
  'Search in documentation': [modifier, 'K'],
  'Execute query': [modifier, 'Enter'],
  'Prettify editors': ['Ctrl', 'Shift', 'P'],
  'Merge fragments definitions into operation definition': ['Ctrl', 'Shift', 'M'],
  'Copy query': ['Ctrl', 'Shift', 'C'],
  'Re-fetch schema using introspection': ['Ctrl', 'Shift', 'R'],
});

export const DEFAULT_QUERY = `# Welcome to GraphiQL
#
# GraphiQL is an in-browser tool for writing, validating, and
# testing GraphQL queries.
#
# Type queries into this side of the screen, and you will see intelligent
# typeaheads aware of the current GraphQL type schema and live syntax and
# validation errors highlighted within the text.
#
# GraphQL queries typically start with a "{" character. Lines that start
# with a # are ignored.
#
# An example GraphQL query might look like:
#
#     {
#       field(arg: "value") {
#         subField
#       }
#     }
#
# Keyboard shortcuts:
#
#   Prettify query:  Shift-Ctrl-P (or press the prettify button)
#
#  Merge fragments:  Shift-Ctrl-M (or press the merge button)
#
#        Run Query:  Ctrl-Enter (or press the play button)
#
#    Auto Complete:  Ctrl-Space (or just start typing)
#

`;

export type GraphiQLToolbarConfig = {
  additionalContent?: any; // React.ReactNode;
  additionalComponent?: any; //React.JSXElementConstructor<any>;
};
// type PickIt = Pick<UseQueryEditorArgs, 'onEdit'>
// export type GraphiQLConfig = AddSuffix<PickIt, 'Query'>;
export type ArgumentProps = {
  arg: GraphQLArgument;
  showDefaultValue?: boolean;
  inline?: boolean;
};

export type GetDefaultFieldNamesFn = (type: GraphQLType) => string[];
type Insertion = {
  index: number;
  string: string;
};
export type CommonEditorProps = {
  editorTheme?: string;
  keyMap?: KeyMap;
};

export type WriteableEditorProps = CommonEditorProps & {
  readOnly?: boolean;
};
export type UseCopyQueryArgs = {
  caller?: any;
  onCopyQuery?: (query: string) => void;
};
export type UseQueryEditorArgs = WriteableEditorProps &
  Pick<UseCopyQueryArgs, 'onCopyQuery'> & {
    onClickReference?(reference: any): void;
    onEdit?(value: string, documentAST?: DocumentNode): void;
  };

export type UseVariableEditorArgs = WriteableEditorProps & {
  onClickReference?(reference: any): void;
  onEdit?(value: string): void;
};
export type UseHeaderEditorArgs = WriteableEditorProps & {
  onEdit?(value: string): void;
};

export type GraphiQLInterfaceProps = WriteableEditorProps &
  AddSuffix<Pick<UseQueryEditorArgs, 'onEdit'>, 'Query'> &
  Pick<UseQueryEditorArgs, 'onCopyQuery'> &
  AddSuffix<Pick<UseVariableEditorArgs, 'onEdit'>, 'Variables'> &
  AddSuffix<Pick<UseHeaderEditorArgs, 'onEdit'>, 'Headers'> & {
    children?: any; // ReactNode;
    defaultEditorToolsVisibility?: boolean | 'variables' | 'headers';
    isHeadersEditorEnabled?: boolean;
    toolbar?: GraphiQLToolbarConfig;
    showPersistHeadersSettings?: boolean;
    defaultTheme?: Theme;
    disableTabs?: boolean;
    forcedTheme?: (typeof THEMES)[number];
    className?: string;
    confirmCloseTab?(index: number): Promise<boolean> | boolean;
  };

export type Field = GraphQLField<any, any>;

export type GetDefaultScalarArgValue = (
  parentField: Field,
  arg: GraphQLArgument | GraphQLInputField,
  underlyingArgType: GraphQLEnumType | GraphQLScalarType,
) => ValueNode;

export type MakeDefaultArg = (parentField: Field, arg: GraphQLArgument | GraphQLInputField) => boolean;

export type Colors = {
  keyword: string;
  def: string;
  property: string;
  qualifier: string;
  attribute: string;
  number: string;
  string: string;
  builtin: string;
  string2: string;
  variable: string;
  atom: string;
};

export type Styles = {
  explorerActionsStyle: CSSProperties; // Use import { CSSProperties } from 'vue-demi'; if needed
  buttonStyle: CSSProperties;
  actionButtonStyle: CSSProperties;
};

export type StyleConfig = {
  colors: Colors;
  arrowOpen: string | HTMLElement; // Adapted for Vue (e.g., SVG string or element)
  arrowClosed: string | HTMLElement;
  checkboxChecked: string | HTMLElement;
  checkboxUnchecked: string | HTMLElement;
  styles: Styles;
};

export type GraphiQLExplorerProps = {
  query?: string;
  width?: number;
  title?: string;
  schema?: GraphQLSchema | null;
  onEdit?: (query: string) => void;
  getDefaultFieldNames?: (type: GraphQLObjectType) => string[];
  getDefaultScalarArgValue?: GetDefaultScalarArgValue;
  makeDefaultArg?: MakeDefaultArg;
  onToggleExplorer?: () => void;
  explorerIsOpen?: boolean;
  onRunOperation?: (name: string | null) => void;
  colors?: Colors;
  arrowOpen?: string | HTMLElement;
  arrowClosed?: string | HTMLElement;
  checkboxChecked?: string | HTMLElement;
  checkboxUnchecked?: string | HTMLElement;
  styles?: {
    explorerActionsStyle?: CSSProperties;
    buttonStyle?: CSSProperties;
    actionButtonStyle?: CSSProperties;
  };
  showAttribution?: boolean;
  hideActions?: boolean;
  externalFragments?: FragmentDefinitionNode[];
};

export type GraphiQLExplorerPluginProps = Omit<
  GraphiQLExplorerProps,
  'onEdit' | 'query' | 'schema' | 'onRunOperation' | 'colors'
>;
export type Selections = ReadonlyArray<SelectionNode>;

export type OperationType = 'query' | 'mutation' | 'subscription' | 'fragment';
export type NewOperationType = 'query' | 'mutation' | 'subscription';

export type State = {
  newOperationType: NewOperationType;
  operation?: OperationDefinitionNode;
  operationToScrollTo?: string;
};

export type AvailableFragments = { [key: string]: FragmentDefinitionNode[] };

// Names match class names in graphiql app.css
// https://github.com/graphql/graphiql/blob/master/packages/graphiql/css/app.css
export const defaultColors: Colors = {
  keyword: '#B11A04',
  // OperationName, FragmentName
  def: '#D2054E',
  // FieldName
  property: '#1F61A0',
  // FieldAlias
  qualifier: '#1C92A9',
  // ArgumentName and ObjectFieldName
  attribute: '#8B2BB9',
  number: '#2882F9',
  string: '#D64292',
  // Boolean
  builtin: '#D47509',
  // Enum
  string2: '#0B7FC7',
  variable: '#397D13',
  // Type
  atom: '#CA9800',
};

export function defaultArgs(
  field: Field,
  getDefaultScalarArgValue: GetDefaultScalarArgValue,
  makeDefaultArg?: MakeDefaultArg,
): Array<ArgumentNode> {
  const args: Array<ArgumentNode> = [];
  for (const arg of field.args) {
    if (isRequiredArgument(arg) || (makeDefaultArg && makeDefaultArg(field, arg))) {
      const argType = unwrapInputType(arg.type);
      if (isInputObjectType(argType)) {
        const fields = argType.getFields();
        args.push({
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: arg.name },
          value: {
            kind: Kind.OBJECT,
            fields: defaultInputObjectFields(
              getDefaultScalarArgValue,
              field,
              Object.keys(fields)
                .map(k => fields[k])
                .filter((field): field is GraphQLInputField => field !== undefined),
              makeDefaultArg,
            ),
          },
        });
      } else if (isLeafType(argType)) {
        args.push({
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: arg.name },
          value: getDefaultScalarArgValue(field, arg, argType),
        });
      }
    }
  }
  return args;
}
export const DEFAULT_OPERATION: DefinitionNode = {
  kind: Kind.OPERATION_DEFINITION,
  operation: OperationTypeNode.QUERY,
  variableDefinitions: [],
  name: { kind: Kind.NAME, value: 'MyQuery' },
  directives: [],
  selectionSet: {
    kind: Kind.SELECTION_SET,
    selections: [],
  },
};
export const DEFAULT_DOCUMENT: DocumentNode = {
  kind: Kind.DOCUMENT,
  definitions: [DEFAULT_OPERATION],
};

export function parseQuery(text: string): DocumentNode | null {
  try {
    if (!text.trim()) return null;
    return parse(text, { noLocation: true });
  } catch {
    return null;
  }
}

export const explorerActionsStyle: CSSProperties = {
  width: '100%',
};
export const buttonStyle: CSSProperties = {
  fontSize: '1.2em',
  padding: '0px',
  backgroundColor: 'white',
  border: 'none',
  margin: '5px 0px',
  height: '40px',
  width: '100%',
  maxWidth: 'none',
};
export const actionButtonStyle: CSSProperties = {
  padding: '0px',
  backgroundColor: 'white',
  border: 'none',
  margin: '0px',
  maxWidth: 'none',
  height: '15px',
  width: '15px',
  display: 'inline-block',
  fontSize: 'smaller',
};

export const defaultStyles = {
  buttonStyle,
  actionButtonStyle,
  explorerActionsStyle,
};

export const defaultArrowOpen = '<svg width="12" height="9"><path fill="#666" d="M 0 2 L 9 2 L 5 8 z" /></svg>';
export const defaultArrowClosed = '<svg width="12" height="9"><path fill="#666" d="M 0 0 L 0 9 L 5.5 4.5 z" /></svg>';
export const defaultCheckboxChecked =
  '<svg style={{ marginRight: "3px" }} width="12" height="12" viewBox="0 0 18 18" fill="none"><path d="M16 0H2C1 0 0 1 0 2V16C0 17 1 18 2 18H16C17 18 18 17 18 16V2C18 1 17 0 16 0ZM16 16H2V2H16V16ZM15 6L13.58 4.58L7 11L4.41 8.6L3 10L7 14L15 6Z" fill="#666"/><path d="M16 0H2C1 0 0 1 0 2V16C0 17 1 18 2 18H16C17 18 18 17 18 16V2C18 1 17 0 16 0ZM16 16H2V2H16V16ZM15 6L13.58 4.58L7 11L4.41 8.6L3 10L7 14L15 6Z" fill="#666"/></svg>'; // Render the content directly
export const defaultCheckboxUnchecked =
  '<svg style={{ marginRight: "3px" }} width="12" height="12" viewBox="0 0 18 18" fill="none"> <path d="M16 2V16H2V2H16ZM16 0H2C1 0 0 1 0 2V16C0 17 1 18 2 18H16C17 18 18 17 18 16V2C18 1 17 0 16 0Z" fill="#CCC" /> </svg>';
export function Checkbox(props: { checked: boolean; styleConfig: StyleConfig }) {
  return props.checked ? props.styleConfig.checkboxChecked : props.styleConfig.checkboxUnchecked;
}

export function defaultGetDefaultFieldNames(type: GraphQLObjectType): string[] {
  const fields = type.getFields();

  // Is there an `id` field?
  if (fields['id']) {
    const res = ['id'];
    if (fields['email']) {
      res.push('email');
    } else if (fields['name']) {
      res.push('name');
    }
    return res;
  }

  // Is there an `edges` field?
  if (fields['edges']) {
    return ['edges'];
  }

  // Is there an `node` field?
  if (fields['node']) {
    return ['node'];
  }

  if (fields['nodes']) {
    return ['nodes'];
  }

  // Include all leaf-type fields.
  const leafFieldNames: string[] = [];
  Object.keys(fields).forEach(fieldName => {
    if (fields[fieldName]?.type && isLeafType(fields[fieldName].type)) {
      leafFieldNames.push(fieldName);
    }
  });

  if (!leafFieldNames.length) {
    // No leaf fields, add typename so that the query stays valid
    return ['__typename'];
  }
  return leafFieldNames.slice(0, 2); // Prevent too many fields from being added
}

export function isRequiredArgument(arg: GraphQLArgument) {
  return isNonNullType(arg.type) && arg.defaultValue === undefined;
}

export function unwrapOutputType(outputType: GraphQLOutputType): any {
  let unwrappedType = outputType;
  while (isWrappingType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return unwrappedType;
}

export function unwrapInputType(inputType: GraphQLInputType): any {
  let unwrappedType = inputType;
  while (isWrappingType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return unwrappedType;
}

export type ExecutionResultPayload =
  | {
      data: IntrospectionQuery;
      errors?: Array<any>;
    }
  // normal result payloads
  | { data?: any; errors?: Array<any> }
  // for the initial Stream/Defer payload
  | { data?: any; errors?: Array<any>; hasNext: boolean }
  // for successive Stream/Defer payloads
  | {
      data?: any;
      errors?: any[];
      path: (string | number)[];
      hasNext: boolean;
    };

export function coerceArgValue(
  argType: GraphQLScalarType | GraphQLEnumType,
  value: string | VariableDefinitionNode,
): ValueNode {
  // Handle the case where we're setting a variable as the value
  if (typeof value !== 'string' && value.kind === 'VariableDefinition') {
    return value.variable;
  } else if (isScalarType(argType)) {
    try {
      switch (argType.name) {
        case 'String':
          return {
            kind: Kind.STRING,
            value: String(argType.parseValue(value)),
          } as StringValueNode;
        case 'Float':
          return {
            kind: Kind.FLOAT,
            value: String(argType.parseValue(parseFloat(value as string))),
          } as FloatValueNode;
        case 'Int':
          return {
            kind: Kind.INT,
            value: String(argType.parseValue(parseInt(value as string, 10))),
          } as IntValueNode;
        case 'Boolean':
          try {
            const parsed = JSON.parse(value as string);
            if (typeof parsed === 'boolean') {
              return { kind: Kind.BOOLEAN, value: parsed } as BooleanValueNode;
            } else {
              return { kind: Kind.BOOLEAN, value: false } as BooleanValueNode;
            }
          } catch {
            return {
              kind: Kind.BOOLEAN,
              value: false,
            } as BooleanValueNode;
          }
        default:
          return {
            kind: Kind.STRING,
            value: String(argType.parseValue(value)),
          } as StringValueNode;
      }
    } catch (e) {
      console.error('error coercing arg value', e, value);
      return { kind: Kind.STRING, value: value as string } as StringValueNode;
    }
  } else {
    try {
      const parsedValue = argType.parseValue(value);
      if (parsedValue) {
        return { kind: Kind.ENUM, value: String(parsedValue) } as EnumValueNode;
      } else {
        return {
          kind: Kind.ENUM,
          value: argType.getValues()?.[0]?.name || '',
        } as EnumValueNode;
      }
    } catch {
      return {
        kind: Kind.ENUM,
        value: argType.getValues()?.[0]?.name || '',
      } as EnumValueNode;
    }
  }
}

export function defaultInputObjectFields(
  getDefaultScalarArgValue: GetDefaultScalarArgValue,
  parentField: Field,
  fields: Array<GraphQLInputField>,
  makeDefaultArg?: MakeDefaultArg,
): Array<ObjectFieldNode> {
  const nodes: Array<ObjectFieldNode> = [];
  for (const field of fields) {
    if (isRequiredInputField(field) || (makeDefaultArg && makeDefaultArg(parentField, field))) {
      const fieldType = unwrapInputType(field.type);
      if (isInputObjectType(fieldType)) {
        const fields = fieldType.getFields();
        nodes.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: field.name },
          value: {
            kind: Kind.OBJECT,
            fields: defaultInputObjectFields(
              getDefaultScalarArgValue,
              parentField,
              Object.keys(fields)
                .map(k => fields[k])
                .filter((field): field is GraphQLInputField => field !== undefined),
              makeDefaultArg,
            ),
          },
        });
      } else if (isLeafType(fieldType)) {
        nodes.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: field.name },
          value: getDefaultScalarArgValue(parentField, field, fieldType),
        });
      }
    }
  }
  return nodes;
}

// ======================
// Core Editor Types
// ======================
export type KeyMap = 'sublime' | 'emacs' | 'vim';

export type EditorTheme = {
  editorTheme?: string;
  keyMap?: KeyMap;
  readOnly?: boolean;
  lineWrapping?: boolean;
};

export type SimpleEditorInstanceWithOperationFacts = SimpleEditorInstance & {
  documentAST: DocumentNode | null;
  operationName: string | null;
  operations: OperationDefinitionNode[] | null;
  variableToType: VariableToType | null;
};

// ======================
// Tab System
// ======================
export type TabDefinition = {
  query: string | null;
  variables?: string | null;
  headers?: string | null;
};

export type TabState = TabDefinition & {
  id: string;
  hash: string;
  title: string;
  operationName: string | null;
  response: string | null;
};

export type TabsState = {
  tabs: TabState[];
  activeTabIndex: number;
};

// ======================
// Explorer
// ======================
export type ExplorerFieldDef = GraphQLField<any, any, any> | GraphQLInputField | GraphQLArgument;

export type ExplorerNavStackItem = {
  name: string;
  def?: GraphQLNamedType | ExplorerFieldDef;
};

export type ExplorerNavStack = [ExplorerNavStackItem, ...ExplorerNavStackItem[]];

// ======================
// Plugin System
// ======================
export type GraphiQLPlugin = {
  title: string;
  icon: any;
  content: any;
};

// ======================
// Fetcher
// ======================
export type FetcherParams = {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string | null;
};

export type FetcherOpts = {
  headers?: Record<string, unknown>;
  documentAST?: DocumentNode;
};

export type UnSubscribable = {
  unsubscribe(): void;
};

export type Observable<T> = {
  subscribe(observer: { next(value: T): void; error(error: Error): void; complete(): void }): UnSubscribable;
};

export type FetcherResult = ExecutionResult | Observable<ExecutionResult> | AsyncIterable<ExecutionResult>;
// export type Fetcher = (params: FetcherParams, opts?: FetcherOpts) => Promise<FetcherResult> | any;
export type Fetcher = (params: FetcherParams, opts?: FetcherOpts) => Promise<FetcherResult> | FetcherResult;
// ======================
// Pinia Stores
// ======================
export type EditorStore = {
  tabs: TabsState;
  headerEditor: SimpleEditorInstance | null;
  queryEditor: SimpleEditorInstanceWithOperationFacts | null;
  variableEditor: SimpleEditorInstance | null;
  responseEditor: SimpleEditorInstance | null;
  shouldPersistHeaders: boolean;
};

export type ExecutionStore = {
  isFetching: boolean;
  isSubscribed: boolean;
  operationName: string | null;
};

export type SchemaStore = {
  schema: GraphQLSchema | null;
  isFetching: boolean;
  fetchError: string | null;
  validationErrors: ValidationRule[];
};

export type PluginStore = {
  plugins: GraphiQLPlugin[];
  visiblePlugin: GraphiQLPlugin | null;
};

export type HistoryStore = {
  items: any[];
};

export type Theme = 'light' | 'dark' | null;

export type ExplorerStore = {
  explorerNavStack: ExplorerNavStackItem[];
  push: (item: ExplorerNavStackItem) => void;
  pop: () => void;
  reset: () => void;
};

export type MaybeGraphQLSchema = GraphQLSchema | null | undefined;
export type VariableToType = { [variable: string]: GraphQLInputType };
export type SchemaContextType = {
  fetchError: string | null;
  introspect(): void;
  isFetching: boolean;
  schema: MaybeGraphQLSchema;
  validationErrors: readonly GraphQLError[];
};
export type ExecutionContextType = {
  isFetching: boolean;
  isSubscribed: boolean;
  operationName: string | null;
  run(): void;
  stop(): void;
};

export type EditorContextType = TabsState & {
  addTab(): void;
  changeTab(index: number): void;
  moveTab(newOrder: TabState[]): void;
  closeTab(index: number): void;
  updateActiveTabValues(partialTab: Partial<Omit<TabState, 'id' | 'hash' | 'title'>>): void;
  headerEditor: SimpleEditorInstance | null;
  queryEditor: SimpleEditorInstanceWithOperationFacts | null;
  responseEditor: SimpleEditorInstance | null;
  variableEditor: SimpleEditorInstance | null;
  setHeaderEditor(newEditor: SimpleEditorInstance): void;
  setQueryEditor(newEditor: SimpleEditorInstanceWithOperationFacts): void;
  setResponseEditor(newEditor: SimpleEditorInstance): void;
  setVariableEditor(newEditor: SimpleEditorInstance): void;
  setOperationName(operationName: string): void;
  initialHeaders: string;
  initialQuery: string;
  initialResponse: string;
  initialVariables: string;
  externalFragments: Map<string, FragmentDefinitionNode>;
  validationRules: ValidationRule[];
  shouldPersistHeaders: Ref<boolean, boolean>;
};

export type ExplorerContextType = {
  explorerNavStack: ExplorerNavStack;
  push(item: ExplorerNavStackItem): void;
  pop(): void;
  reset(): void;
};
export type PluginContextType = {
  plugins: GraphiQLPlugin[];
  setVisiblePlugin(plugin: GraphiQLPlugin | string | null): void;
  visiblePlugin: GraphiQLPlugin | null;
};

// import  DocsFilledIcon from '../components/icons';
// Mark them as raw (this is the fix)
export const DOC_EXPLORER_PLUGIN = markRaw({
  title: 'Documentation',
  icon: '📖',
  content: Documentation,
});
// export const DOC_EXPLORER_PLUGIN: GraphiQLPlugin = {
//   title: 'Documentation Explorer',
//   icon: function Icon() {
//     const pluginContext = usePluginStore();
//     return pluginContext?.visiblePlugin === DOC_EXPLORER_PLUGIN ? (
//       <DocsFilledIcon />
//     ) : (
//       <DocsIcon />
//     );
//   },
//   content: DocExplorer,
// };

export const HISTORY_PLUGIN = markRaw({
  title: 'History',
  icon: '🕒',
  content: History,
});

export const ExplorerPlugin = markRaw({
  title: 'Explorer',
  icon: `<svg style="width: 20px;" stroke-width="1.5" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M18 6H20M22 6H20M20 6V4M20 6V8"></path><path d="M21 20H2C2 20 2 19 2 19V11H21C21 11 22 11 22 11V19C22 19 21 20 21 20Z"></path><path d="M2 11V4C2 4 2 4 2 4H8C8 4 9 4 9 4L12 6C12 6 12 7 12 7H14"></path></svg>`,
  // A component, not a bare render function: Vue 2 treats a plain function in <component :is> as an
  // async component factory.
  content: defineComponent({
    name: 'ExplorerPluginContent',
    render: () => hWithProps(Explorer, { query: '' }),
  }),
});

function stringify(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function formatSingleError(error: Error): Error {
  return {
    ...error,
    // Raise these details even if they're non-enumerable
    message: error.message,
    stack: error.stack,
  };
}

function handleSingleError(error: unknown) {
  if (error instanceof Error) {
    return formatSingleError(error);
  }
  return error;
}

export function formatError(error: unknown): string {
  if (Array.isArray(error)) {
    return stringify({
      errors: error.map(e => handleSingleError(e)),
    });
  }
  return stringify({ errors: [handleSingleError(error)] });
}

export function formatResult(result: any): string {
  return stringify(result);
}

export type ResponseTooltipType = Component;

export type UseResponseEditorArgs = CommonEditorProps & {
  responseTooltip?: ResponseTooltipType;
};

export function getSelectedOperationName(
  prevOperations?: OperationDefinitionNode[],
  prevSelectedOperationName?: string,
  operations?: OperationDefinitionNode[],
) {
  if (!operations || operations.length < 1) return;

  const names = operations.map(op => op.name?.value);
  if (prevSelectedOperationName && names.includes(prevSelectedOperationName)) {
    return prevSelectedOperationName;
  }

  if (prevSelectedOperationName && prevOperations) {
    const prevNames = prevOperations.map(op => op.name?.value);
    const prevIndex = prevNames.indexOf(prevSelectedOperationName);
    if (prevIndex !== -1 && prevIndex < names.length) {
      return names[prevIndex];
    }
  }

  return names[0];
}

function defaultGetDefaultFieldNames2(type: GraphQLType) {
  // If this type cannot access fields, then return an empty set.
  // if (!type.getFields) {
  if (!('getFields' in type)) {
    return [];
  }

  const fields = type.getFields();

  // Is there an `id` field?
  if (fields.id) {
    return ['id'];
  }

  // Is there an `edges` field?
  if (fields.edges) {
    return ['edges'];
  }

  // Is there an `node` field?
  if (fields.node) {
    return ['node'];
  }

  // Include all leaf-type fields.
  const leafFieldNames: Array<string> = [];
  for (const fieldName of Object.keys(fields)) {
    if (isLeafType(fields[fieldName]!.type)) {
      leafFieldNames.push(fieldName);
    }
  }
  return leafFieldNames;
}

export function fillLeafs(
  schema?: GraphQLSchema | null,
  docString?: string,
  getDefaultFieldNames?: GetDefaultFieldNamesFn,
) {
  const insertions: Insertion[] = [];

  if (!schema || !docString) {
    return { insertions, result: docString };
  }

  let ast: DocumentNode;
  try {
    ast = parse(docString);
  } catch {
    return { insertions, result: docString };
  }

  const fieldNameFn: GetDefaultFieldNamesFn = getDefaultFieldNames || defaultGetDefaultFieldNames2;
  const typeInfo = new TypeInfo(schema);
  visit(ast, {
    leave(node) {
      typeInfo.leave(node);
    },
    enter(node) {
      typeInfo.enter(node);
      if (node.kind === 'Field' && !node.selectionSet) {
        const fieldType = typeInfo.getType();
        const selectionSet = buildSelectionSet(isFieldType(fieldType) as GraphQLOutputType, fieldNameFn);
        if (selectionSet && node.loc) {
          const indent = getIndentation(docString, node.loc.start);
          insertions.push({
            index: node.loc.end,
            string: ' ' + print(selectionSet).replaceAll('\n', '\n' + indent),
          });
        }
      }
    },
  });

  // Apply the insertions, but also return the insertions metadata.
  return {
    insertions,
    result: withInsertions(docString, insertions),
  };
}

function getIndentation(str: string, index: number) {
  let indentStart = index;
  let indentEnd = index;
  while (indentStart) {
    const c = str.charCodeAt(indentStart - 1);
    // line break
    if (c === 10 || c === 13 || c === 0x2028 || c === 0x2029) {
      break;
    }
    indentStart--;
    // not white space
    if (c !== 9 && c !== 11 && c !== 12 && c !== 32 && c !== 160) {
      indentEnd = indentStart;
    }
  }
  return str.slice(indentStart, indentEnd);
}

function withInsertions(initial: string, insertions: Insertion[]) {
  if (insertions.length === 0) {
    return initial;
  }
  let edited = '';
  let prevIndex = 0;
  for (const { index, string } of insertions) {
    edited += initial.slice(prevIndex, index) + string;
    prevIndex = index;
  }
  edited += initial.slice(prevIndex);
  return edited;
}
function isFieldType(fieldType?: GraphQLOutputType | null): GraphQLOutputType | undefined {
  if (fieldType) {
    return fieldType;
  }
}

function buildSelectionSet(
  type: GraphQLOutputType,
  getDefaultFieldNames: GetDefaultFieldNamesFn,
): SelectionSetNode | undefined {
  // Unwrap any non-null or list types.
  const namedType = getNamedType(type);

  // Unknown types and leaf types do not have selection sets.
  if (!type || isLeafType(type)) {
    return;
  }

  // Get an array of field names to use.
  const fieldNames = getDefaultFieldNames(namedType);

  // If there are no field names to use, return no selection set.
  if (!Array.isArray(fieldNames) || fieldNames.length === 0 || !('getFields' in namedType)) {
    return;
  }

  // Build a selection set of each field, calling buildSelectionSet recursively.
  return {
    kind: Kind.SELECTION_SET,
    selections: fieldNames.map(fieldName => {
      const fieldDef = namedType.getFields()[fieldName];
      const fieldType = fieldDef ? fieldDef.type : null;
      return {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: fieldName,
        },
        // we can use as here, because we already know that fieldType
        // comes from an origin parameter
        selectionSet: buildSelectionSet(fieldType!, getDefaultFieldNames),
      };
    }),
  };
}

// Unicode whitespace characters that break the interface.
export const invalidCharacters = Array.from({ length: 11 }, (_, i) => {
  // \u2000 -> \u200a
  return String.fromCharCode(0x2000 + i);
}).concat(['\u2028', '\u2029', '\u202f', '\u00a0']);

const sanitizeRegex = new RegExp('[' + invalidCharacters.join('') + ']', 'g');

export function normalizeWhitespace(line: string) {
  return line.replace(sanitizeRegex, ' ');
}

export default function debounce<F extends (...args: any[]) => any>(duration: number, fn: F) {
  let timeout: number | null;
  return function (...args) {
    if (timeout) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      timeout = null;
      fn(...args);
    }, duration);
  } as F;
}

// Responses are never stored; headers only when the user asks, and never credential headers (EXP-06).
export function serializeTabState(tabState: TabsState, shouldPersistHeaders = false) {
  return JSON.stringify(tabState, (key, value) => {
    if (key === 'hash' || key === 'response') return null;
    if (key === 'headers') return shouldPersistHeaders ? stripCredentialHeaders(value) : null;
    return value;
  });
}

export type StorageValue = string | number | boolean | object | null;

// utils/tabsUtils.ts
export function getDefaultTabState({
  defaultQuery = DEFAULT_QUERY,
  defaultHeaders,
  defaultTabs,
  storedState,
}: {
  defaultQuery?: string;
  defaultHeaders?: string;
  defaultTabs?: TabDefinition[];
  storedState: StorageValue;
}) {
  try {
    if (!storedState) {
      throw new Error('Storage for tabs is empty');
    }
    const parsed = JSON.parse(String(storedState));

    if (isTabsState(parsed)) {
      if (parsed.activeTabIndex < 0) {
        const operationName = fuzzyExtractOperationName(defaultQuery);
        parsed.tabs.push({
          id: guid(),
          hash: hashFromTabContents({
            query: defaultQuery,
            variables: null,
            headers: null,
          }),
          title: operationName || DEFAULT_TITLE,
          query: defaultQuery,
          variables: null,
          headers: null,
          operationName,
          response: null,
        });
        parsed.activeTabIndex = parsed.tabs.length - 1;
      }

      return parsed;
    }
    throw new Error('Storage for tabs is invalid');
  } catch {
    return {
      activeTabIndex: 0,
      tabs: (
        defaultTabs || [
          {
            query: defaultQuery,
            variables: null,
            headers: defaultHeaders,
          },
        ]
      ).map(createTab),
    };
  }
}

export function isTabsState(obj: any): obj is TabsState {
  return (
    obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    hasNumberKey(obj, 'activeTabIndex') &&
    'tabs' in obj &&
    Array.isArray(obj.tabs) &&
    obj.tabs.every(isTabState)
  );
}

export function isTabState(obj: any): obj is TabState {
  return (
    obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    hasStringKey(obj, 'id') &&
    hasStringKey(obj, 'title') &&
    hasStringOrNullKey(obj, 'query') &&
    hasStringOrNullKey(obj, 'variables') &&
    hasStringOrNullKey(obj, 'headers') &&
    hasStringOrNullKey(obj, 'operationName') &&
    hasStringOrNullKey(obj, 'response')
  );
}

function hasNumberKey(obj: Record<string, any>, key: string) {
  return key in obj && typeof obj[key] === 'number';
}

function hasStringKey(obj: Record<string, any>, key: string) {
  return key in obj && typeof obj[key] === 'string';
}

function hasStringOrNullKey(obj: Record<string, any>, key: string) {
  return key in obj && (typeof obj[key] === 'string' || obj[key] === null);
}

export function createTab({ query = null, variables = null, headers = null }: Partial<TabDefinition> = {}): TabState {
  return {
    id: guid(),
    hash: hashFromTabContents({ query, variables, headers }),
    title: (query && fuzzyExtractOperationName(query)) || DEFAULT_TITLE,
    query,
    variables,
    headers,
    operationName: null,
    response: null,
  };
}

export function setPropertiesInActiveTab(
  state: TabsState,
  partialTab: Partial<Omit<TabState, 'id' | 'hash' | 'title'>>,
): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab, index) => {
      if (index !== state.activeTabIndex) {
        return tab;
      }
      const newTab = { ...tab, ...partialTab };
      return {
        ...newTab,
        hash: hashFromTabContents(newTab),
        title:
          newTab.operationName || (newTab.query ? fuzzyExtractOperationName(newTab.query) : undefined) || DEFAULT_TITLE,
      };
    }),
  };
}

export function guid(): string {
  const s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

export function hashFromTabContents(args: {
  query: string | null;
  variables?: string | null;
  headers?: string | null;
}): string {
  return [args.query ?? '', args.variables ?? '', args.headers ?? ''].join('|');
}

export function fuzzyExtractOperationName(str: string): string | null {
  const regex = /^(?!#).*(query|subscription|mutation)\s+([a-zA-Z0-9_]+)/m;
  const match = regex.exec(str);
  return match?.[2] ?? null;
}

const DEFAULT_TITLE = '<untitled>';

function uniqueBy<T>(array: readonly SelectionNode[], iteratee: (item: FieldNode) => T) {
  const FilteredMap = new Map<T, FieldNode>();
  const result: SelectionNode[] = [];
  for (const item of array) {
    if (item.kind === 'Field') {
      const uniqueValue = iteratee(item);
      const existing = FilteredMap.get(uniqueValue);
      if (item.directives?.length) {
        // Cannot inline fields with directives (yet)
        const itemClone = { ...item };
        result.push(itemClone);
      } else if (existing?.selectionSet && item.selectionSet) {
        // Merge the selection sets
        existing.selectionSet.selections = [...existing.selectionSet.selections, ...item.selectionSet.selections];
      } else if (!existing) {
        const itemClone = { ...item };
        FilteredMap.set(uniqueValue, itemClone);
        result.push(itemClone);
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

function inlineRelevantFragmentSpreads(
  fragmentDefinitions: {
    [key: string]: FragmentDefinitionNode | undefined;
  },
  selections: readonly SelectionNode[],
  selectionSetType?: GraphQLOutputType | null,
): readonly SelectionNode[] {
  const selectionSetTypeName = selectionSetType ? getNamedType(selectionSetType).name : null;
  const outputSelections = [];
  const seenSpreads: string[] = [];
  for (let selection of selections) {
    if (selection.kind === 'FragmentSpread') {
      const fragmentName = selection.name.value;
      if (!selection.directives || selection.directives.length === 0) {
        if (seenSpreads.includes(fragmentName)) {
          /* It's a duplicate - skip it! */
          continue;
        } else {
          seenSpreads.push(fragmentName);
        }
      }
      const fragmentDefinition = fragmentDefinitions[selection.name.value];
      if (fragmentDefinition) {
        const { typeCondition, directives, selectionSet } = fragmentDefinition;
        selection = {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition,
          directives,
          selectionSet,
        };
      }
    }
    if (
      selection.kind === Kind.INLINE_FRAGMENT &&
      // Cannot inline if there are directives
      (!selection.directives || selection.directives?.length === 0)
    ) {
      const fragmentTypeName = selection.typeCondition ? selection.typeCondition.name.value : null;
      if (!fragmentTypeName || fragmentTypeName === selectionSetTypeName) {
        outputSelections.push(
          ...inlineRelevantFragmentSpreads(fragmentDefinitions, selection.selectionSet.selections, selectionSetType),
        );
        continue;
      }
    }
    outputSelections.push(selection);
  }
  return outputSelections;
}

/**
 * Given a document AST, inline all named fragment definitions.
 */
export function mergeAst(documentAST: DocumentNode, schema?: GraphQLSchema | null): DocumentNode {
  // If we're given the schema, we can simplify even further by resolving object
  // types vs unions/interfaces
  const typeInfo = schema ? new TypeInfo(schema) : null;

  const fragmentDefinitions: {
    [key: string]: FragmentDefinitionNode | undefined;
  } = Object.create(null);

  for (const definition of documentAST.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragmentDefinitions[definition.name.value] = definition;
    }
  }

  const flattenVisitors: ASTVisitor = {
    SelectionSet(node: any) {
      const selectionSetType = typeInfo ? typeInfo.getParentType() : null;
      let { selections } = node;

      selections = inlineRelevantFragmentSpreads(fragmentDefinitions, selections, selectionSetType);

      return {
        ...node,
        selections,
      };
    },
    FragmentDefinition() {
      return null;
    },
  };

  const flattenedAST = visit(documentAST, typeInfo ? visitWithTypeInfo(typeInfo, flattenVisitors) : flattenVisitors);

  const deduplicateVisitors: ASTVisitor = {
    SelectionSet(node: any) {
      let { selections } = node;

      selections = uniqueBy(selections, selection => (selection.alias ? selection.alias.value : selection.name.value));

      return {
        ...node,
        selections,
      };
    },
    FragmentDefinition() {
      return null;
    },
  };

  return visit(flattenedAST, deduplicateVisitors);
}

export function formatQuery(query?: string) {
  return query
    ?.split('\n')
    .map(line => line.replace(/#(.*)/, ''))
    .join(' ')
    .replaceAll('{', ' { ')
    .replaceAll('}', ' } ')
    .replaceAll(/[\s]{2,}/g, ' ');
}

export async function importCodeMirrorImports() {}

/**
 * Safely parses a JSON string and asserts the result is a plain object.
 * Throws descriptive errors that can be surfaced directly in the response editor.
 */
export function tryParseJsonObject({
  json,
  errorMessageParse,
  errorMessageType,
}: {
  json: string | undefined;
  errorMessageParse: string;
  errorMessageType: string;
}): Record<string, unknown> | undefined {
  let parsed: Record<string, unknown> | undefined;

  try {
    parsed = json && json.trim() !== '' ? JSON.parse(json) : undefined;
  } catch (error) {
    throw new Error(`${errorMessageParse}: ${error instanceof Error ? error.message : error}.`, { cause: error });
  }

  const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);

  if (parsed !== undefined && !isObject) {
    throw new Error(errorMessageType);
  }

  return parsed;
}

function getPropertyByPath(obj: Record<string, unknown>, path: string): any {
  return path.split('.').reduce<any>((acc, key) => acc?.[key], obj);
}

function setPropertyValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]!] = value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeepInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isPlainObject(current) && isPlainObject(value)) mergeDeepInto(current, value);
    else target[key] = value;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncrementalResult = {
  data?: Record<string, unknown> | null;
  errors?: ReadonlyArray<GraphQLError>;
  extensions?: Record<string, unknown>;
  hasNext?: boolean;
  path?: ReadonlyArray<string | number>;
  incremental?: ReadonlyArray<IncrementalResult>;
  label?: string;
  items?: ReadonlyArray<Record<string, unknown>> | null;
  pending?: ReadonlyArray<{ id: string; path: ReadonlyArray<string | number> }>;
  completed?: ReadonlyArray<{ id: string; errors?: ReadonlyArray<GraphQLError> }>;
  id?: string;
  subPath?: ReadonlyArray<string | number>;
};

// WeakMap so that each top-level ExecutionResult has its own id→path registry
// without leaking memory when the result object is discarded.
const pathsMap = new WeakMap<ExecutionResult, Map<string, ReadonlyArray<string | number>>>();

/**
 * Recursively merges an incremental delivery result into the running
 * `executionResult` object (mutates in place).
 */
export function mergeIncrementalResult(executionResult: IncrementalResult, incrementalResult: IncrementalResult): void {
  let path: ReadonlyArray<string | number> | undefined = ['data', ...(incrementalResult.path ?? [])];

  // Register any pending paths from both sides
  for (const result of [executionResult, incrementalResult]) {
    if (result.pending) {
      let paths = pathsMap.get(executionResult as ExecutionResult);
      if (paths === undefined) {
        paths = new Map();
        pathsMap.set(executionResult as ExecutionResult, paths);
      }
      for (const { id, path: pendingPath } of result.pending) {
        paths.set(id, ['data', ...pendingPath]);
      }
    }
  }

  // ── @stream items ──────────────────────────────────────────────────────────
  const { items } = incrementalResult;
  if (items) {
    const { id } = incrementalResult;
    if (id) {
      path = pathsMap.get(executionResult as ExecutionResult)?.get(id);
      if (path === undefined) {
        throw new Error('Invalid incremental delivery format.');
      }
      const list = getPropertyByPath(executionResult as Record<string, unknown>, path.join('.'));
      list.push(...items);
    } else {
      path = ['data', ...(incrementalResult.path ?? [])];
      for (const item of items) {
        setPropertyValueByPath(executionResult as Record<string, unknown>, path.join('.'), item);
        // Advance the array-index segment for the next item
        (path as Array<string | number>)[path.length - 1] = (path[path.length - 1] as number) + 1;
      }
    }
  }

  // ── @defer data ────────────────────────────────────────────────────────────
  const { data } = incrementalResult;
  if (data) {
    const { id } = incrementalResult;
    if (id) {
      path = pathsMap.get(executionResult as ExecutionResult)?.get(id);
      if (path === undefined) {
        throw new Error('Invalid incremental delivery format.');
      }
      const { subPath } = incrementalResult;
      if (subPath !== undefined) {
        path = [...path, ...subPath];
      }
    }
    // Deep-merge: the deferred fragment adds fields to an object that already holds the initial payload.
    const target = getPropertyByPath(executionResult as Record<string, unknown>, path.join('.'));
    if (isPlainObject(target)) {
      mergeDeepInto(target, data);
    } else {
      setPropertyValueByPath(executionResult as Record<string, unknown>, path.join('.'), data);
    }
  }

  // ── Errors ─────────────────────────────────────────────────────────────────
  if (incrementalResult.errors) {
    executionResult.errors ||= [];
    (executionResult.errors as GraphQLError[]).push(...incrementalResult.errors);
  }

  // ── Extensions ─────────────────────────────────────────────────────────────
  if (incrementalResult.extensions) {
    setPropertyValueByPath(executionResult as Record<string, unknown>, 'extensions', incrementalResult.extensions);
  }

  // ── Nested incremental ─────────────────────────────────────────────────────
  if (incrementalResult.incremental) {
    for (const sub of incrementalResult.incremental) {
      mergeIncrementalResult(executionResult, sub);
    }
  }

  // ── Completed (clean up pending paths, surface deferred errors) ────────────
  if (incrementalResult.completed) {
    for (const { id, errors } of incrementalResult.completed) {
      pathsMap.get(executionResult as ExecutionResult)?.delete(id);
      if (errors) {
        executionResult.errors ||= [];
        (executionResult.errors as GraphQLError[]).push(...errors);
      }
    }
  }
}

// Duck-typed: `CloseEvent` is not a global everywhere (Node 22, some test runners), and `instanceof` on a missing
// global throws a ReferenceError that hides the real close reason.
function isCloseEvent(err: unknown): err is { code: number; reason?: string } {
  return (
    typeof err === 'object' && err !== null && !(err instanceof Error) && 'code' in err && typeof err.code === 'number'
  );
}

const errorHasCode = (err: unknown): err is { code: string } => {
  return typeof err === 'object' && err !== null && 'code' in err;
};

/**
 * Returns true if the name matches a subscription in the AST
 *
 * @param document {DocumentNode}
 * @param name the operation name to lookup
 * @returns {boolean}
 */
export const isSubscriptionWithName = (document: DocumentNode, name?: string): boolean => {
  let isSubscription = false;
  visit(document, {
    OperationDefinition(node) {
      if (name === node.name?.value && node.operation === 'subscription') {
        isSubscription = true;
      }
    },
  });
  return isSubscription;
};

/**
 * create a simple HTTP/S fetcher using a fetch implementation where
 * multipart is not needed
 *
 * @param options {CreateFetcherOptions}
 * @param httpFetch {typeof fetch}
 * @returns {Fetcher}
 */
export const createSimpleFetcher =
  (options: CreateFetcherOptions, httpFetch: typeof fetch): Fetcher =>
  async (graphQLParams: FetcherParams, fetcherOpts?: FetcherOpts) => {
    const data = await httpFetch(options.url, {
      method: 'POST',
      body: JSON.stringify(graphQLParams),
      headers: {
        'content-type': 'application/json',
        ...options.headers,
        ...fetcherOpts?.headers,
      },
    });
    return data.json();
  };

export async function createWebsocketsFetcherFromUrl(
  url: string,
  connectionParams?: ClientOptions['connectionParams'],
): Promise<Fetcher | undefined> {
  try {
    const { createClient } = await import('graphql-ws');
    const graphqlWsConnectionParams =
      typeof connectionParams === 'function'
        ? (connectionParams as () => Record<string, unknown> | undefined)
        : (connectionParams as Record<string, unknown> | undefined);
    const wsClient = createClient({ url, connectionParams: graphqlWsConnectionParams });
    return createWebsocketsFetcherFromClient(wsClient);
  } catch (err) {
    if (errorHasCode(err) && err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        "You need to install the 'graphql-ws' package to use websockets when passing a 'subscriptionUrl'",
        { cause: err },
      );
    }
    console.error(`Error creating websocket client for ${url}`, err);
  }
}

/**
 * Create ws/s fetcher using provided wsClient implementation
 */
export const createWebsocketsFetcherFromClient =
  (wsClient: Client): Fetcher =>
  (graphQLParams: FetcherParams) =>
    makeAsyncIterableIteratorFromSink((sink: any) =>
      wsClient.subscribe(graphQLParams, {
        ...sink,
        error(err) {
          if (isCloseEvent(err)) {
            sink.error(new Error(`Socket closed with event ${err.code} ${err.reason || ''}`.trim()));
          } else {
            sink.error(err);
          }
        },
      }),
    );

export interface CreateFetcherOptions {
  url: string;
  subscriptionUrl?: string;
  wsClient?: Client;
  legacyWsClient?: any;
  legacyClient?: any;
  headers?: Record<string, string>;
  wsConnectionParams?: ClientOptions['connectionParams'];
  enableIncrementalDelivery?: boolean;
  fetch?: typeof fetch;
  schemaFetcher?: Fetcher;
}

export const createLegacyWebsocketsFetcher =
  (legacyWsClient: { request: (params: FetcherParams) => unknown }): Fetcher =>
  (graphQLParams: FetcherParams) => {
    const observable = legacyWsClient.request(graphQLParams);
    return makeAsyncIterableIteratorFromSink(
      // @ts-expect-error no typings for legacy client, but we assume it follows the observable spec
      sink => observable.subscribe(sink).unsubscribe,
    );
  };

export const createMultipartFetcher = (options: CreateFetcherOptions, httpFetch: typeof fetch): Fetcher =>
  async function* (graphQLParams: any, fetcherOpts?: FetcherOpts) {
    const response: any = await httpFetch(options.url, {
      method: 'POST',
      body: JSON.stringify(graphQLParams),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, multipart/mixed',
        ...options.headers,
        ...fetcherOpts?.headers,
      },
    }).then(r => meros<Extract<ExecutionResultPayload, { hasNext: boolean }>>(r as any, { multiple: true }));

    if (!isAsyncIterable(response)) {
      yield await response.json();
      return;
    }

    for await (const chunk of response) {
      if (chunk.some((part: any) => !part.json)) {
        const message = chunk.map((part: any) => `Headers::\n${part.headers}\n\nBody::\n${part.body}`);
        throw new Error(`Expected multipart chunks to be of json type. got:\n${message}`);
      }
      yield chunk.map((part: any) => part.body);
    }
  };

/**
 * If `wsClient` or `legacyClient` are provided, then `subscriptionUrl` is overridden.
 */
export async function getWsFetcher(
  options: CreateFetcherOptions,
  fetcherOpts?: FetcherOpts,
): Promise<Fetcher | undefined> {
  if (options.wsClient) {
    return createWebsocketsFetcherFromClient(options.wsClient);
  }
  if (options.subscriptionUrl) {
    return createWebsocketsFetcherFromUrl(options.subscriptionUrl, {
      ...options.wsConnectionParams,
      ...fetcherOpts?.headers,
    });
  }
  const legacyWebsocketsClient = options.legacyClient || options.legacyWsClient;
  if (legacyWebsocketsClient) {
    return createLegacyWebsocketsFetcher(legacyWebsocketsClient);
  }
}

export function createGraphiQLFetcher(options: CreateFetcherOptions): Fetcher {
  const httpFetch =
    options.fetch || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
  if (!httpFetch) throw new Error('No valid fetcher implementation available');

  options.enableIncrementalDelivery = options.enableIncrementalDelivery !== false;

  const simpleFetcher = createSimpleFetcher(options, httpFetch);
  const httpFetcher = options.enableIncrementalDelivery ? createMultipartFetcher(options, httpFetch) : simpleFetcher;

  return async (graphQLParams, fetcherOpts) => {
    if (graphQLParams.operationName === 'IntrospectionQuery') {
      return (options.schemaFetcher || simpleFetcher)(graphQLParams, fetcherOpts);
    }
    const isSubscription = fetcherOpts?.documentAST
      ? isSubscriptionWithName(fetcherOpts.documentAST, graphQLParams.operationName || undefined)
      : false;
    if (isSubscription) {
      const wsFetcher = await getWsFetcher(options, fetcherOpts);
      if (!wsFetcher) {
        throw new Error(
          `Your GraphiQL createFetcher is not properly configured for websocket subscriptions yet. ` +
            (options.subscriptionUrl
              ? `Provided URL ${options.subscriptionUrl} failed`
              : 'Please provide subscriptionUrl, wsClient or legacyClient option first.'),
        );
      }
      return wsFetcher(graphQLParams, fetcherOpts);
    }
    return httpFetcher(graphQLParams, fetcherOpts);
  };
}
