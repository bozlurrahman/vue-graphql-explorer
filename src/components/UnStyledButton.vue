<!-- /components/gql/explorer/UnStyledButton.vue -->
<template>
  <button v-bind="$attrs" :class="buttonClasses" @click="handleClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue';
import { computed } from 'vue';
interface UnStyledButtonProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  [key: string]: any;
}

const props = defineProps<UnStyledButtonProps>();
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
const buttonClasses = computed(() => ['graphiql-un-styled', props.class]);

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<style scoped>
.graphiql-un-styled,
button.graphiql-un-styled {
  all: unset;
  border-radius: var(--border-radius-4);
  cursor: pointer;
}
.graphiql-un-styled:hover,
button.graphiql-un-styled:hover {
  background-color: hsla(var(--color-neutral), var(--alpha-background-light));
}

.graphiql-un-styled:active,
button.graphiql-un-styled:active {
  background-color: hsla(var(--color-neutral), var(--alpha-background-medium));
}

.graphiql-un-styled:focus,
button.graphiql-un-styled:focus {
  outline: hsla(var(--color-neutral), var(--alpha-background-heavy)) auto 1px;
}

.graphiql-button,
button.graphiql-button {
  background-color: hsla(var(--color-neutral), var(--alpha-background-light));
  border: none;
  border-radius: var(--border-radius-4);
  color: hsl(var(--color-neutral));
  cursor: pointer;
  font-size: var(--font-size-body);
  padding: var(--px-8) var(--px-12);
}

.graphiql-button:hover,
button.graphiql-button:hover,
.graphiql-button:active,
button.graphiql-button:active {
  background-color: hsla(var(--color-neutral), var(--alpha-background-medium));
}

.graphiql-button:focus,
button.graphiql-button:focus {
  outline: hsla(var(--color-neutral), var(--alpha-background-heavy)) auto 1px;
}

.graphiql-button.graphiql-button-success,
button.graphiql-button.graphiql-button-success {
  background-color: hsla(var(--color-success), var(--alpha-background-heavy));
}
.graphiql-button.graphiql-button-error,
button.graphiql-button.graphiql-button-error {
  background-color: hsla(var(--color-error), var(--alpha-background-heavy));
}
</style>
