// src/stores/documentation.ts
import { defineExplorerStore, type ExplorerStore } from './registry';
import { shallowRef } from 'vue-demi';
import type { ExplorerNavStackItem } from '../lib/explorer';

const initialItem: ExplorerNavStackItem = { name: 'Docs' };

function documentationStoreSetup() {
  // Replaced on every change (never mutated in place): Vue 2 cannot track a shallow reactive array,
  // and the GraphQL defs inside stay raw so identity compares work.
  const navStack = shallowRef<ExplorerNavStackItem[]>([initialItem]);

  const push = (item: ExplorerNavStackItem) => {
    const last = navStack.value.at(-1);
    if (last?.def !== item.def) {
      navStack.value = [...navStack.value, item];
    }
  };

  const pop = () => {
    if (navStack.value.length > 1) {
      navStack.value = navStack.value.slice(0, -1);
    }
  };

  const reset = () => {
    navStack.value = navStack.value.slice(0, 1);
  };

  return {
    navStack,
    push,
    pop,
    reset,
  };
}

export const useDocumentationStore: () => ExplorerStore<ReturnType<typeof documentationStoreSetup>> =
  defineExplorerStore('documentation', documentationStoreSetup);
