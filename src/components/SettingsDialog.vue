<!-- src/components/gql/SettingsDialog.vue -->
<script setup lang="ts">
import { vPortal } from '../directives/portal';
import { onBeforeUnmount, ref } from 'vue-demi';
import UnStyledButton from './UnStyledButton.vue';
import { KeyboardShortcutIcon } from './icons';
import { useEditorStore } from '../stores/editor';

const show = ref(false);
const persistHeaders = ref(false);
const editorStore = useEditorStore();

const open = () => {
  persistHeaders.value = editorStore.shouldPersistHeaders;
  show.value = true;
};

const close = () => {
  show.value = false;
};

const save = () => {
  editorStore.shouldPersistHeaders = persistHeaders.value;
  close();
};

onBeforeUnmount(() => {
  show.value = false;
});
</script>

<template>
  <div class="graphiql-contents">
    <!-- Portal to body (was <Teleport>): first child, always rendered. -->
    <div v-portal>
      <div v-if="show" class="dialog-overlay" @click.self="close">
        <div class="dialog" @click.stop>
          <h2>Settings</h2>

          <label>
            <input v-model="persistHeaders" type="checkbox" />
            Persist Headers
          </label>

          <div class="actions">
            <button @click="save">Save</button>
            <button @click="close">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    <div title="Open short keys dialog">
      <UnStyledButton type="button" data-value="short-keys" aria-label="Open short keys dialog" @click="open">
        <KeyboardShortcutIcon aria-hidden="true" />
      </UnStyledButton>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 420px;
  max-width: 90vw;
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
