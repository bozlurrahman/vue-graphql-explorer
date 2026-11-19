<script setup lang="ts">
defineProps<{
  label: string;
  active?: boolean;
}>();

const emit = defineEmits(['click']);
</script>

<template>
  <button class="toolbar-btn" :class="{ active }" :title="label" :aria-label="label" @click="emit('click', $event)">
    <slot />
  </button>
</template>

<style scoped>
.toolbar-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #333;
}

.toolbar-btn:hover {
  background: #e8e8e8;
}

.toolbar-btn.active {
  background: #d0e4ff;
  color: #0066cc;
}
</style>
