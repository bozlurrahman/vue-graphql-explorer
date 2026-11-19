// Per-instance store registry. Replaces Pinia (Vue 3 only) so one source runs on Vue 2.7 and Vue 3.
//
// - `createExplorerStores()` makes an empty registry; `GraphqlExplorer.vue` creates one per explorer
//   and provides it, so two explorers on one page never share state and the host's Pinia is untouched.
// - `defineExplorerStore(id, setup)` mirrors Pinia's setup-store API: the returned `useXStore()` creates
//   the store on first use, as `reactive(setup())` (refs unwrapped like a Pinia store).
// - Vue 2's reactive() converts nested plain objects in place (and unwraps refs inside them); a store
//   that returns an object holding refs it still reads itself must wrap it in markRaw().
// - Each store runs inside the registry's detached effect scope, not the scope of the component that
//   first asked for it, so its watchers live until the explorer is destroyed.
import {
  effectScope,
  getCurrentInstance,
  inject,
  reactive,
  type EffectScope,
  type InjectionKey,
  type UnwrapNestedRefs,
} from 'vue-demi';

export interface ExplorerStores {
  readonly scope: EffectScope;
  readonly stores: Map<string, unknown>;
}

export const ExplorerStoresKey: InjectionKey<ExplorerStores> = Symbol('vue-graphql-explorer:stores');

// The registry whose stores are being created right now (stores may use other stores during setup).
let active: ExplorerStores | null = null;

export function createExplorerStores(): ExplorerStores {
  return { scope: effectScope(true), stores: new Map() };
}

export function disposeExplorerStores(registry: ExplorerStores): void {
  registry.scope.stop();
  registry.stores.clear();
}

/** Runs `fn` with `registry` as the current one, for code that runs before `provide` is visible. */
export function runWithExplorerStores<T>(registry: ExplorerStores, fn: () => T): T {
  const previous = active;
  active = registry;
  try {
    return fn();
  } finally {
    active = previous;
  }
}

function currentRegistry(): ExplorerStores {
  if (active) return active;
  if (getCurrentInstance()) {
    const injected = inject(ExplorerStoresKey, null);
    if (injected) return injected;
  }
  throw new Error('[vue-graphql-explorer] explorer stores used outside <GraphqlExplorer>');
}

// Unwraps refs like Pinia does: `store.schema` is the value, not the ref.
// Store files annotate `useXStore` with this type and `ReturnType<typeof setup>`, so declaration output
// names the setup function instead of inlining the whole unwrapped type (TS7056).
export type ExplorerStore<T> = UnwrapNestedRefs<T>;
type Store<T> = ExplorerStore<T>;

export function defineExplorerStore<T extends object>(id: string, setup: () => T): () => Store<T> {
  return function useStore(): Store<T> {
    const registry = currentRegistry();
    let store = registry.stores.get(id) as Store<T> | undefined;
    if (!store) {
      store = runWithExplorerStores(registry, () => registry.scope.run(() => reactive(setup()))!) as Store<T>;
      registry.stores.set(id, store);
    }
    return store;
  };
}
