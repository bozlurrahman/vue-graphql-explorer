<!-- src/components/gql/ShortcutsDialog.vue -->
<script setup lang="ts">
import { vPortal } from '../directives/portal';
import { onBeforeUnmount, ref } from 'vue-demi';
import UnStyledButton from './UnStyledButton.vue';
import { SettingsIcon } from './icons';

const show = ref(false);

const open = () => {
  show.value = true;
};

const close = () => {
  show.value = false;
};

onBeforeUnmount(() => {
  show.value = false;
});

const shortcuts = [
  { key: 'Ctrl + Enter', desc: 'Execute query' },
  { key: 'Ctrl + Shift + P', desc: 'Prettify query' },
  { key: 'Ctrl + /', desc: 'Toggle comment' },
  { key: 'Ctrl + Space', desc: 'Autocomplete' },
];
</script>

<template>
  <div>
    <!-- Portal to body (was <Teleport>): first child, always rendered. -->
    <div v-portal>
      <div v-if="show" class="dialog-overlay" @click.self="close">
        <div class="dialog" @click.stop>
          <h2>Keyboard Shortcuts</h2>
          <table>
            <tr v-for="s in shortcuts" :key="s.key">
              <td>
                <kbd>{{ s.key }}</kbd>
              </td>
              <td>{{ s.desc }}</td>
            </tr>
          </table>
          <button @click="show = false">Close</button>
        </div>
      </div>
    </div>
    <div title="Open settings dialog">
      <UnStyledButton type="button" data-value="settings" aria-label="Open settings dialog" @click="open">
        <SettingsIcon aria-hidden="true" />
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
kbd {
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
</style>
