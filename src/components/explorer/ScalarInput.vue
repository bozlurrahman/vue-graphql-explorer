<!-- nuxt/components/gql/explorer/ScalarInput.vue -->
<template>
  <span :style="{ color }">
    {{ argType.name === 'String' ? '"' : '' }}
    <input
      ref="inputRef"
      :style="inputStyles"
      type="text"
      :value="value"
      :name="argType.name"
      @change="emit('set-arg-value', $event)"
    />
    {{ argType.name === 'String' ? '"' : '' }}
  </span>
</template>

<script setup lang="ts">
import { Kind, type GraphQLArgument, type ValueNode } from 'graphql';
import { computed, onMounted } from 'vue';
import { useExplorerContext } from '~/composables/useExplorerContext';
import { unwrapInputType } from '~/lib/explorer';

type ScalarInputProps = {
  arg: GraphQLArgument;
  argValue: ValueNode;
};

const props = defineProps<ScalarInputProps>();
const emit = defineEmits<{
  'set-arg-value': [event: Event];
}>();

const ctx = useExplorerContext();
const inputRef = useTemplateRef<HTMLInputElement>('inputRef');

const argType = computed(() => unwrapInputType(props.arg.type));
const value = computed(() => {
  if (props.argValue.kind === Kind.STRING) {
    return props.argValue.value;
  } else if (
    props.argValue.kind === Kind.INT ||
    props.argValue.kind === Kind.FLOAT ||
    props.argValue.kind === Kind.ENUM ||
    props.argValue.kind === Kind.BOOLEAN
  ) {
    return props.argValue.value.toString();
  } else if (props.argValue.kind === Kind.LIST) {
    return props.argValue.values.toString();
  } else if (props.argValue.kind === Kind.OBJECT) {
    return props.argValue.fields.toString();
  } else if (props.argValue.kind === Kind.NULL) {
    return '';
  }
  return String(props.argValue);
});

const color = computed(() =>
  props.argValue.kind === 'StringValue' ? ctx.styleConfig.value.colors.string : ctx.styleConfig.value.colors.number,
);

const inputStyles = computed(() => ({
  border: 'none',
  borderBottom: '1px solid #888',
  outline: 'none',
  width: `${Math.max(1, Math.min(15, value.value.length + 2))}ch`,
  color: color.value,
}));

onMounted(() => {
  const input = inputRef.value;
  if (input && document.activeElement && !(document.activeElement instanceof HTMLTextAreaElement)) {
    input.focus();
    input.select();
  }
});
</script>
