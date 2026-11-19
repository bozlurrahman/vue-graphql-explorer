// src/stores/plugin.ts
import { defineExplorerStore, type ExplorerStore } from './registry';
import { ref } from 'vue-demi';
import { DOC_EXPLORER_PLUGIN, HISTORY_PLUGIN, type GraphiQLPlugin } from '../lib/explorer';
// import { useStorageStore } from './storage';

// const STORAGE_KEY_PLUGIN = 'visiblePlugin';

function pluginStoreSetup() {
  // const storage = useStorageStore();
  const plugins = ref<GraphiQLPlugin[]>([DOC_EXPLORER_PLUGIN, HISTORY_PLUGIN]);
  const visiblePlugin = ref<GraphiQLPlugin | null>(null);

  function findPlugin(plugin: GraphiQLPlugin | string | null) {
    if (!plugin) return null;

    return plugins.value.find(p => (typeof plugin === 'string' ? p.title === plugin : p === plugin)) || null;
  }

  function setVisiblePlugin(plugin: GraphiQLPlugin | string | null) {
    const newPlugin = findPlugin(plugin);

    if (visiblePlugin.value === newPlugin) return;

    visiblePlugin.value = newPlugin;

    // storage.set(STORAGE_KEY_PLUGIN, newPlugin?.title ?? '');
  }

  function initialize(initialVisible?: GraphiQLPlugin | string) {
    // const stored = storage.get<string>(STORAGE_KEY_PLUGIN);

    // const storedPlugin = plugins.value.find(p => p.title === stored);

    // if (storedPlugin) {
    //   visiblePlugin.value = storedPlugin;
    //   return;
    // }

    if (initialVisible) {
      visiblePlugin.value = findPlugin(initialVisible);
    }
  }

  function registerPlugins(pluginList: GraphiQLPlugin[]) {
    plugins.value = pluginList;
  }

  return {
    plugins,
    visiblePlugin,
    setVisiblePlugin,
    initialize,
    registerPlugins,
  };
}

export const usePluginStore: () => ExplorerStore<ReturnType<typeof pluginStoreSetup>> = defineExplorerStore(
  'plugin',
  pluginStoreSetup,
);
