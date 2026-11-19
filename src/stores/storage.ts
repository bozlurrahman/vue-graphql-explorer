import { defineExplorerStore, useExplorerOptions, type ExplorerStore } from './registry';
import { del as vueDel, onScopeDispose, ref, set as vueSet } from 'vue-demi';
import type { StorageValue } from '../lib/explorer';

const DEFAULT_NAMESPACE = 'graphiql';

function storageStoreSetup() {
  // Fixed when the store is created: changing `storageKey` later does not move stored data.
  const STORAGE_NAMESPACE = useExplorerOptions().storageKey || DEFAULT_NAMESPACE;
  // Keys are added and removed with vueSet / vueDel: Vue 2 does not track new keys on plain assignment.
  const data = ref<Record<string, StorageValue>>({});

  function key(name: string) {
    return `${STORAGE_NAMESPACE}:${name}`;
  }

  // null during SSR and when the browser blocks storage (sandboxed iframe, cookies disabled): reading
  // `window.localStorage` then throws a SecurityError. The explorer then keeps its state in memory only.
  function getLocalStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  }

  function load(keyName: string) {
    const ls = getLocalStorage();
    if (!ls) return null;

    let raw: string | null;
    try {
      raw = ls.getItem(key(keyName));
    } catch {
      return null;
    }

    if (raw === null) return null;

    try {
      const parsed = JSON.parse(raw);
      vueSet(data.value, keyName, parsed);
      return parsed;
    } catch {
      vueSet(data.value, keyName, raw);
      return raw;
    }
  }

  function get<T = StorageValue>(keyName: string): T | null {
    if (keyName in data.value) {
      return data.value[keyName] as T;
    }

    return load(keyName) as T | null;
  }

  function set(keyName: string, value: StorageValue) {
    vueSet(data.value, keyName, value);

    const ls = getLocalStorage();
    if (!ls) return;

    if (value === null || value === undefined) {
      removeStored(ls, key(keyName));
      return;
    }

    try {
      ls.setItem(key(keyName), JSON.stringify(value));
    } catch (error) {
      // Quota exceeded or storage blocked: report instead of throwing (history drops old items and retries).
      const isQuotaError = error instanceof DOMException && error.name === 'QuotaExceededError';
      return { error: true, isQuotaError };
    }
  }

  function remove(keyName: string) {
    vueDel(data.value, keyName);

    const ls = getLocalStorage();
    if (ls) removeStored(ls, key(keyName));
  }

  function removeStored(ls: Storage, fullKey: string) {
    try {
      ls.removeItem(fullKey);
    } catch {
      // Storage blocked: nothing stored to remove.
    }
  }

  function clear() {
    data.value = {};

    const ls = getLocalStorage();
    if (!ls) return;

    Object.keys(ls).forEach(k => {
      if (k.startsWith(`${STORAGE_NAMESPACE}:`)) removeStored(ls, k);
    });
  }

  function syncTabs() {
    if (typeof window === 'undefined') return;

    const onStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith(`${STORAGE_NAMESPACE}:`)) return;

      const keyName = event.key.replace(`${STORAGE_NAMESPACE}:`, '');

      if (event.newValue === null) {
        vueDel(data.value, keyName);
        return;
      }

      try {
        vueSet(data.value, keyName, JSON.parse(event.newValue));
      } catch {
        vueSet(data.value, keyName, event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    // The registry's effect scope stops when the explorer unmounts.
    onScopeDispose(() => window.removeEventListener('storage', onStorage));
  }

  syncTabs();

  return {
    data,
    get,
    set,
    remove,
    clear,
  };
}

export const useStorageStore: () => ExplorerStore<ReturnType<typeof storageStoreSetup>> = defineExplorerStore(
  'storage',
  storageStoreSetup,
);
