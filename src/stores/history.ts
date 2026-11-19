// nuxt/lib/history.ts
import { parse } from 'graphql';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type QueryStoreItem = {
  query?: string;
  variables?: string;
  headers?: string;
  operationName?: string;
  label?: string;
  favorite?: boolean;
};

export const useHistoryStore = defineStore('history', () => {
  const MAX_HISTORY_LENGTH = 20;

  // Two separate storage instances
  const historyStorage = createQueryStorage('queries', MAX_HISTORY_LENGTH);
  const favoritesStorage = createQueryStorage('favorites', null);

  const allItems = computed(() => [...historyStorage.items.value, ...favoritesStorage.items.value]);

  const MAX_QUERY_SIZE = 100000;

  const shouldSaveQuery = (query?: string, variables?: string, headers?: string, lastSaved?: QueryStoreItem) => {
    if (!query) return false;
    if (query.length > MAX_QUERY_SIZE) return false;

    try {
      parse(query);
    } catch {
      return false;
    }

    if (!lastSaved) return true;

    return !(
      JSON.stringify(query) === JSON.stringify(lastSaved.query) &&
      JSON.stringify(variables) === JSON.stringify(lastSaved.variables) &&
      JSON.stringify(headers) === JSON.stringify(lastSaved.headers)
    );
  };

  // ==================== Public API ====================

  const addToHistory = ({ query, variables, headers, operationName }: QueryStoreItem) => {
    if (!shouldSaveQuery(query, variables, headers, historyStorage.fetchRecent())) {
      return;
    }

    historyStorage.push({ query, variables, headers, operationName });
  };

  const toggleFavorite = (item: QueryStoreItem) => {
    const newItem = { ...item };

    if (item.favorite) {
      newItem.favorite = false;
      favoritesStorage.remove(newItem);
      historyStorage.push(newItem);
    } else {
      newItem.favorite = true;
      favoritesStorage.push(newItem);
      historyStorage.remove(newItem);
    }
  };

  const editLabel = (item: QueryStoreItem, index?: number) => {
    if (item.favorite) {
      favoritesStorage.edit({ ...item, favorite: true }, index);
    } else {
      historyStorage.edit(item, index);
    }
  };

  const deleteFromHistory = (item: QueryStoreItem, clearFavorites = false) => {
    if (item.favorite || clearFavorites) {
      favoritesStorage.remove(item);
    }
    if (!item.favorite || clearFavorites) {
      historyStorage.remove(item);
    }
  };

  const setActive = (item: QueryStoreItem) => {
    // You can extend this later to load into editors
  };

  return {
    items: allItems,
    addToHistory,
    toggleFavorite,
    editLabel,
    deleteFromHistory,
    setActive,
    // Optional: expose raw storages if needed
    historyStorage,
    favoritesStorage,
  };
});

// ==================== Reusable Query Storage Logic ====================

const createQueryStorage = (key: string, maxSize: number | null = null) => {
  const items = ref<QueryStoreItem[]>([]);
  const storage = useStorageStore();
  const load = () => {
    const raw = storage.get(key);
    if (raw) {
      items.value = JSON.parse(String(raw))[key] || [];
    } else {
      items.value = [];
    }
  };

  const save = () => {
    storage.set(key, JSON.stringify({ [key]: items.value }));
  };

  const push = (item: QueryStoreItem) => {
    const newItems = [...items.value, item];

    if (maxSize && newItems.length > maxSize) {
      newItems.shift();
    }

    // Retry logic for quota errors
    for (let attempts = 0; attempts < 5; attempts++) {
      const response = storage.set(key, JSON.stringify({ [key]: newItems }));
      if (!(response as any)?.error) {
        items.value = newItems;
        return;
      } else if ((response as any).isQuotaError && maxSize) {
        newItems.shift();
      } else {
        return;
      }
    }
  };

  const edit = (item: QueryStoreItem, index?: number) => {
    if (typeof index === 'number' && items.value[index]) {
      items.value.splice(index, 1, item);
      save();
      return;
    }

    const existingIndex = items.value.findIndex(
      x =>
        x.query === item.query &&
        x.variables === item.variables &&
        x.headers === item.headers &&
        x.operationName === item.operationName,
    );

    if (existingIndex !== -1) {
      items.value.splice(existingIndex, 1, item);
      save();
    }
  };

  const remove = (item: QueryStoreItem) => {
    const index = items.value.findIndex(
      x =>
        x.query === item.query &&
        x.variables === item.variables &&
        x.headers === item.headers &&
        x.operationName === item.operationName,
    );
    if (index !== -1) {
      items.value.splice(index, 1);
      save();
    }
  };

  const contains = (item: QueryStoreItem) =>
    items.value.some(
      x =>
        x.query === item.query &&
        x.variables === item.variables &&
        x.headers === item.headers &&
        x.operationName === item.operationName,
    );

  const fetchRecent = () => items.value.at(-1);

  // Initial load
  load();

  return {
    items,
    push,
    edit,
    remove,
    contains,
    fetchRecent,
    save,
  };
};
