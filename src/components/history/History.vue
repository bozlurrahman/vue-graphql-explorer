<!-- components/History.vue -->
<template>
  <section aria-label="History" class="graphiql-history">
    <div class="graphiql-history-header">
      History
      <Button
        v-if="clearStatus || items.length > 0"
        :state="clearStatus || undefined"
        :disabled="!items.length"
        @click="handleClearStatus"
      >
        {{ clearStatus ? { success: 'Cleared', error: 'Failed to Clear' }[clearStatus] : 'Clear' }}
      </Button>
    </div>

    <ul v-if="favorites.length" class="graphiql-history-items">
      <HistoryItem v-for="item in favorites" :key="item.index" :item="item" />
    </ul>

    <div v-if="favorites.length && items.length" class="graphiql-history-item-spacer" />

    <ul v-if="items.length" class="graphiql-history-items">
      <HistoryItem v-for="item in items" :key="item.index" :item="item" />
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue-demi';
import HistoryItem from './HistoryItem.vue';
import Button from '../Button.vue';
import { useHistoryStore } from '../../stores/history';

const { items: all, deleteFromHistory } = useHistoryStore();

const items = computed(() => {
  const reversed = all
    .slice()
    .map((item, i) => ({ ...item, index: i }))
    .reverse();
  const favorites = reversed.filter(item => item.favorite);
  return favorites.length ? reversed.filter(item => !item.favorite) : reversed;
});

const favorites = computed(() =>
  all
    .slice()
    .map((item, i) => ({ ...item, index: i }))
    .reverse()
    .filter(item => item.favorite),
);

const clearStatus = ref<'success' | 'error' | null>(null);

watch(clearStatus, newStatus => {
  if (newStatus) {
    setTimeout(() => {
      clearStatus.value = null;
    }, 2000);
  }
});

function handleClearStatus() {
  try {
    for (const item of items.value) {
      deleteFromHistory(item, true);
    }
    clearStatus.value = 'success';
  } catch {
    clearStatus.value = 'error';
  }
}
</script>
