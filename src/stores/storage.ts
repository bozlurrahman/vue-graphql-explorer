import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StorageValue } from '../lib/explorer';

const STORAGE_NAMESPACE = 'graphiql';

export const useStorageStore = defineStore('storage', () => {
  const data = ref<Record<string, StorageValue>>({});

  function key(name: string) {
    return `${STORAGE_NAMESPACE}:${name}`;
  }

  function isClient() {
    return typeof window !== 'undefined';
  }

  function load(keyName: string) {
    if (!isClient()) return null;

    const raw = localStorage.getItem(key(keyName));

    if (raw === null) return null;

    try {
      const parsed = JSON.parse(raw);
      data.value[keyName] = parsed;
      return parsed;
    } catch {
      data.value[keyName] = raw;
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
    data.value[keyName] = value;

    if (!isClient()) return;

    if (value === null || value === undefined) {
      localStorage.removeItem(key(keyName));
      return;
    }

    localStorage.setItem(key(keyName), JSON.stringify(value));
  }

  function remove(keyName: string) {
    delete data.value[keyName];

    if (!isClient()) return;

    localStorage.removeItem(key(keyName));
  }

  function clear() {
    data.value = {};

    if (!isClient()) return;

    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`${STORAGE_NAMESPACE}:`)) {
        localStorage.removeItem(k);
      }
    });
  }

  function syncTabs() {
    if (!isClient()) return;

    window.addEventListener('storage', event => {
      if (!event.key?.startsWith(`${STORAGE_NAMESPACE}:`)) return;

      const keyName = event.key.replace(`${STORAGE_NAMESPACE}:`, '');

      if (event.newValue === null) {
        delete data.value[keyName];
        return;
      }

      try {
        data.value[keyName] = JSON.parse(event.newValue);
      } catch {
        data.value[keyName] = event.newValue;
      }
    });
  }

  if (isClient()) {
    syncTabs();
  }

  return {
    data,
    get,
    set,
    remove,
    clear,
  };
});
