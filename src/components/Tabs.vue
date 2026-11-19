<!-- src/components/gql/Tabs.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import ToolTip from '../ToolTip.vue';
import { CloseIcon, PlusIcon } from './icons';
import UnStyledButton from './UnStyledButton.vue';

// const emit = defineEmits(['reorder', 'close']);
const editorStore = useEditorStore();
const executionStore = useExecutionStore();
const tabs = computed(() => editorStore.tabs);
const activeIndex = computed(() => editorStore.activeTabIndex);

const addTab = () => {
  editorStore.addTab();
};

const switchTab = (index: number) => {
  if (index === activeIndex.value) return; // ✅ no-op if same tab

  if (executionStore.isSubscribed || executionStore.isFetching) {
    executionStore.stop(); // ✅ only stop if something is actually running
  }

  editorStore.changeTab(index);
};

const closeTab = (index: number) => {
  editorStore.closeTab(index);
  // emit('close', index);
};

const draggingIndex = ref<number | null>(null);

function onDragStart(index: number) {
  draggingIndex.value = index;
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault();

  if (draggingIndex.value === null || draggingIndex.value === index) return;

  const newValues = [...editorStore.tabs];
  const [moved] = newValues.splice(draggingIndex.value, 1);
  if (moved) newValues.splice(index, 0, moved);

  draggingIndex.value = index;
  editorStore.moveTab(newValues);
}

function onDragEnd() {
  draggingIndex.value = null;
}
</script>

<template>
  <ul class="graphiql-tabs" role="tablist">
    <li
      v-for="(tab, i) in tabs"
      :key="tab.id"
      class="graphiql-tab"
      :class="{ 'graphiql-tab-active': i === activeIndex }"
      draggable="true"
      role="tab"
      :aria-selected="i === activeIndex ? 'true' : undefined"
      @dragstart="onDragStart(i)"
      @dragover="onDragOver($event, i)"
      @dragend="onDragEnd"
    >
      <button type="button" class="graphiql-tab-button" @click="switchTab(i)">
        {{ tab.title || 'Untitled' }}
      </button>

      <ToolTip label="Close Tab">
        <button type="button" aria-label="Close Tab" class="graphiql-tab-close" @click.stop="closeTab(i)">
          <CloseIcon />
        </button>
      </ToolTip>
    </li>
    <ToolTip label="Add tab">
      <UnStyledButton type="button" class="graphiql-tab-add" aria-label="Add tab" @click="addTab">
        <PlusIcon aria-hidden="true" />
      </UnStyledButton>
    </ToolTip>
  </ul>
</template>

<style scoped>
.graphiql-tabs {
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: var(--px-12);
}
.graphiql-tabs > :not(:first-child) {
  margin-left: var(--px-12);
}

.graphiql-tab {
  align-items: stretch;
  border-radius: var(--border-radius-8);
  color: hsla(var(--color-neutral), var(--alpha-secondary));
  display: flex;
}
.graphiql-tab > button.graphiql-tab-close {
  visibility: hidden;
}
.graphiql-tab.graphiql-tab-active > button.graphiql-tab-close,
.graphiql-tab:hover > button.graphiql-tab-close,
.graphiql-tab:focus-within > button.graphiql-tab-close {
  visibility: unset;
}

.graphiql-tab.graphiql-tab-active {
  background-color: hsla(var(--color-neutral), var(--alpha-background-heavy));
  color: hsla(var(--color-neutral), 1);
}

button.graphiql-tab-button {
  padding: var(--px-4) 0 var(--px-4) var(--px-8);
}

button.graphiql-tab-close {
  align-items: center;
  display: flex;
  padding: var(--px-4) var(--px-8);
}
button.graphiql-tab-close > svg {
  height: var(--px-8);
  width: var(--px-8);
}
</style>
