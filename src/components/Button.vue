<!-- /components/gql/explorer/Button.vue -->
<template>
  <button ref="buttonRef" v-bind="$attrs" :class="buttonClasses" @click="handleClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue-demi';
import { computed, ref } from 'vue-demi';

export type ButtonState = 'success' | 'error' | undefined;

interface ButtonProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  state?: ButtonState;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  state: undefined,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);

const buttonClasses = computed(() => [
  'graphiql-button',
  {
    success: props.state === 'success' ? 'graphiql-button-success' : '',
    error: props.state === 'error' ? 'graphiql-button-error' : '',
  },
  props.class,
]);

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<style scoped>
/* You can keep your original button.css styles here or import it */
.graphiql-button {
  /* Base styles from your original CSS */
}

.graphiql-button-success {
  /* success state styles */
}

.graphiql-button-error {
  /* error state styles */
}
</style>
