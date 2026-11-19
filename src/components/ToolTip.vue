<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

interface Props {
  label: string | number | null;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

const props = withDefaults(defineProps<Props>(), {
  align: 'start',
  side: 'bottom',
  sideOffset: 5,
});

const isVisible = ref(false);
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const tooltipRef = useTemplateRef<HTMLElement>('tooltipRef');

function show() {
  isVisible.value = true;
  updatePosition();
}

function hide() {
  isVisible.value = false;
}

// function toggle() {
//   isVisible.value = !isVisible.value;
//   updatePosition();
// }

function updatePosition() {
  if (!triggerRef.value || !tooltipRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const tooltipEl = tooltipRef.value;

  let top = 0;
  let left = 0;

  switch (props.side) {
    case 'top':
      top = triggerRect.top - tooltipEl.offsetHeight - props.sideOffset;
      break;
    case 'bottom':
      top = triggerRect.bottom + props.sideOffset;
      break;
    case 'left':
      left = triggerRect.left - tooltipEl.offsetWidth - props.sideOffset;
      break;
    case 'right':
      left = triggerRect.right + props.sideOffset;
      break;
  }

  if (props.side === 'top' || props.side === 'bottom') {
    if (props.align === 'start') {
      left = triggerRect.left;
    } else if (props.align === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - tooltipEl.offsetWidth / 2;
    } else {
      left = triggerRect.right - tooltipEl.offsetWidth;
    }
  } else {
    if (props.align === 'start') {
      top = triggerRect.top;
    } else if (props.align === 'center') {
      top = triggerRect.top + triggerRect.height / 2 - tooltipEl.offsetHeight / 2;
    } else {
      top = triggerRect.bottom - tooltipEl.offsetHeight;
    }
  }

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}

function onClickOutside(event: MouseEvent) {
  if (
    tooltipRef.value &&
    !tooltipRef.value.contains(event.target as Node) &&
    triggerRef.value &&
    !triggerRef.value.contains(event.target as Node)
  ) {
    hide();
  }
}

onMounted(() => {
  window.addEventListener('scroll', updatePosition);
  window.addEventListener('resize', updatePosition);
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updatePosition);
  window.removeEventListener('resize', updatePosition);
  document.removeEventListener('click', onClickOutside);
});
</script>

<template>
  <span ref="triggerRef" @mouseenter="show" @mouseleave="hide" @focus="show" @blur="hide">
    <slot />
    <Teleport to="body">
      <div v-show="isVisible" ref="tooltipRef" class="graphiql-tooltip" role="tooltip">
        {{ label }}
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.graphiql-tooltip {
  position: fixed;
  background: hsl(var(--color-base));
  border: var(--popover-border);
  border-radius: var(--border-radius-4);
  box-shadow: var(--popover-box-shadow);
  color: hsl(var(--color-neutral));
  font-size: inherit;
  padding: var(--px-4) var(--px-6);
  font-family: var(--font-family);
}
</style>
