<!-- components/HistoryItem.vue -->
<template>
  <li :class="clsx('graphiql-history-item', isEditable && 'editable')">
    <template v-if="isEditable">
      <input ref="inputRef" type="text" :value="item.label" placeholder="Type a label" @keydown="handleKeyDown" />
      <UnStyledButton type="button" @click="handleSave">Save</UnStyledButton>
      <UnStyledButton type="button" @click="handleClose">
        <CloseIcon />
      </UnStyledButton>
    </template>
    <template v-else>
      <ToolTip label="Set active">
        <UnStyledButton
          type="button"
          class="graphiql-history-item-label"
          aria-label="Set active"
          @click="handleHistoryItemClick"
        >
          {{ displayName }}
        </UnStyledButton>
      </ToolTip>
      <ToolTip label="Edit label">
        <UnStyledButton
          type="button"
          class="graphiql-history-item-action"
          aria-label="Edit label"
          @click="handleEditLabel"
        >
          <PenIcon aria-hidden="true" />
        </UnStyledButton>
      </ToolTip>
      <ToolTip :label="item.favorite ? 'Remove favorite' : 'Add favorite'">
        <UnStyledButton
          type="button"
          class="graphiql-history-item-action"
          :aria-label="item.favorite ? 'Remove favorite' : 'Add favorite'"
          @click="handleToggleFavorite"
        >
          <component :is="item.favorite ? StarFilledIcon : StarIcon" aria-hidden="true" />
        </UnStyledButton>
      </ToolTip>
      <ToolTip label="Delete from history">
        <UnStyledButton
          type="button"
          class="graphiql-history-item-action"
          aria-label="Delete from history"
          @click="handleDeleteItemFromHistory"
        >
          <TrashIcon aria-hidden="true" />
        </UnStyledButton>
      </ToolTip>
    </template>
  </li>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ToolTip from '~/components/ToolTip.vue';
import { clsx } from '~/lib/common';
import { formatQuery } from '~/lib/explorer';
import type { QueryStoreItem } from '~/stores/history';
import { CloseIcon, PenIcon, StarFilledIcon, StarIcon, TrashIcon } from '../icons';
import UnStyledButton from '../UnStyledButton.vue';

const props = defineProps<{
  item: QueryStoreItem & { index?: number };
}>();

const { editLabel, toggleFavorite, deleteFromHistory, setActive } = useHistoryStore();
const { headerEditor, queryEditor, variableEditor } = useEditorStore();

const inputRef = useTemplateRef<HTMLInputElement>('inputRef');
const isEditable = ref(false);

onMounted(() => {
  if (isEditable.value) {
    inputRef.value?.focus();
  }
});

watch(isEditable, value => {
  if (value) {
    nextTick(() => inputRef.value?.focus());
  }
});

const displayName = computed(() => props.item.label || props.item.operationName || formatQuery(props.item.query));

function handleSave() {
  isEditable.value = false;
  const { index, ...item } = props.item;
  editLabel({ ...item, label: inputRef.value?.value }, index);
}

function handleClose() {
  isEditable.value = false;
}

function handleEditLabel() {
  isEditable.value = true;
}

function handleHistoryItemClick() {
  const { query, variables, headers } = props.item;
  queryEditor?.setValue(query ?? '');
  variableEditor?.setValue(variables ?? '');
  headerEditor?.setValue(headers ?? '');
  setActive(props.item);
}

function handleDeleteItemFromHistory() {
  deleteFromHistory(props.item);
}

function handleToggleFavorite() {
  toggleFavorite(props.item);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Esc') {
    isEditable.value = false;
  } else if (e.key === 'Enter') {
    isEditable.value = false;
    editLabel({ ...props.item, label: (e.target as HTMLInputElement).value });
  }
}
</script>

<style scoped>
/* Assuming style.css content is included or imported */
</style>
