<script setup lang="ts">
import { computed } from 'vue';
import PlayIcon from '../../../components/gql/icons/play.svg?raw';
import StopIcon from '../../../components/gql/icons/stop.svg?raw';

const execution = useExecutionStore();
const editorStore = useEditorStore();

const showDropdown = ref(0);
const isRunning = computed(() => execution.isFetching || execution.isSubscribed);

const toggle = () => {
  if (execution.isFetching) return;

  if (editorStore.activeOperations.length < 2) {
    if (isRunning.value) {
      execution.stop();
    } else {
      execution.run();
    }
  } else {
    if (isRunning.value) {
      execution.stop();
    } else {
      showDropdown.value = !showDropdown.value ? 1 : 0;
    }
  }
};
</script>

<template>
  <button
    class="execute-btn"
    :class="{ running: isRunning }"
    :title="isRunning ? 'Stop execution' : 'Execute query (Ctrl+Enter)'"
    @click="toggle"
  >
    <div v-if="isRunning" v-html="StopIcon"></div>
    <div v-else v-html="PlayIcon"></div>
  </button>
  <div v-if="showDropdown && editorStore.activeOperations.length > 1" class="dropdown-menu">
    <div
      v-for="(operation, index) in editorStore.activeOperations"
      :key="index"
      class="dropdown-item"
      @click.stop="
        () => {
          execution.run(operation.name?.value);
          showDropdown = 0;
        }
      "
    >
      {{ operation.name?.value || `Unnamed` }}
    </div>
  </div>
</template>

<style scoped>
.execute-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.execute-btn.running {
  background: #dc3545;
}

.execute-btn:hover {
  opacity: 0.9;
}
</style>
