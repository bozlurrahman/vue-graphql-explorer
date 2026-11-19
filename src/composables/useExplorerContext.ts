// composables/useExplorerContext.ts
import type { GraphQLObjectType } from 'graphql';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type { AvailableFragments, GetDefaultScalarArgValue, MakeDefaultArg, StyleConfig } from '../lib/explorer';

export interface ExplorerContext {
  /** Reactive computed — consumers access `.value` */
  styleConfig: ComputedRef<StyleConfig>;
  /**
   * Fragments provided by the parent (e.g. from props.externalFragments).
   * Operations.vue merges these with its own documentFragments to produce
   * the final availableFragments passed down to RootView.
   */
  externalFragments: ComputedRef<AvailableFragments>;
  getDefaultFieldNames: (type: GraphQLObjectType) => string[];
  getDefaultScalarArgValue: GetDefaultScalarArgValue;
  makeDefaultArg: Ref<MakeDefaultArg | undefined>;
  onRunOperation: (name?: string) => void;
}

export const ExplorerContextKey: InjectionKey<ExplorerContext> = Symbol('ExplorerContext');

export function useExplorerContext(): ExplorerContext {
  const ctx = inject(ExplorerContextKey);
  if (!ctx) throw new Error('useExplorerContext() must be called inside an Explorer provider');
  return ctx;
}
