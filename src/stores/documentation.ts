// src/stores/documentation.ts
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { ExplorerNavStackItem } from '../lib/explorer';

const initialItem: ExplorerNavStackItem = { name: 'Docs' };

export const useDocumentationStore = defineStore('documentation', () => {
  const navStack = reactive<ExplorerNavStackItem[]>([initialItem]);

  const push = (item: ExplorerNavStackItem) => {
    const last = navStack.at(-1);
    if (last?.def !== item.def) {
      navStack.push(item);
    }
  };

  const pop = () => {
    if (navStack.length > 1) {
      navStack.pop();
    }
  };

  const reset = () => {
    navStack.splice(1);
  };

  return {
    navStack,
    push,
    pop,
    reset,
  };
});
