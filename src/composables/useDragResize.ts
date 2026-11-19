// src/composables/useDragResize.ts
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue-demi';
import debounce from '../lib/explorer';
import type { Ref } from 'vue-demi';
import { useStorageStore } from '../stores/storage';

type ResizableElement = 'first' | 'second';

type UseDragResizeArgs = {
  firstRef: Ref<HTMLElement | null>;
  secondRef: Ref<HTMLElement | null>;
  dragBarRef: Ref<HTMLElement | null>;
  defaultSizeRelation?: number;
  direction: 'horizontal' | 'vertical';
  initiallyHidden?: ResizableElement;
  onHiddenElementChange?: (hiddenElement: ResizableElement | null) => void;
  sizeThresholdFirst?: number;
  sizeThresholdSecond?: number;
  storageKey?: string;
};

const DEFAULT_FLEX = 1;
const HIDE_FIRST = 'hide-first';
const HIDE_SECOND = 'hide-second';

export function useDragResize({
  firstRef,
  secondRef,
  dragBarRef,
  defaultSizeRelation = DEFAULT_FLEX,
  direction,
  initiallyHidden,
  onHiddenElementChange,
  sizeThresholdFirst = 100,
  sizeThresholdSecond = 100,
  storageKey,
}: UseDragResizeArgs) {
  const storage = useStorageStore();

  const hiddenElement = ref<ResizableElement | null>(null);
  const defaultFlex = `${defaultSizeRelation}`;

  const store = debounce(500, (value: string) => {
    if (storageKey) {
      storage?.set(storageKey, value);
    }
  });

  const initHidden = () => {
    const storedValue = storageKey && storage?.get(storageKey);

    if (storedValue === HIDE_FIRST || initiallyHidden === 'first') {
      hiddenElement.value = 'first';
    } else if (storedValue === HIDE_SECOND || initiallyHidden === 'second') {
      hiddenElement.value = 'second';
    } else {
      hiddenElement.value = null;
    }
  };

  const setHiddenElement = (element: ResizableElement | null) => {
    if (element !== hiddenElement.value) {
      hiddenElement.value = element;
      onHiddenElementChange?.(element);
    }
  };

  const setupLayout = () => {
    const storedValue = (storageKey && storage?.get(storageKey)) || defaultFlex;

    if (firstRef.value) {
      firstRef.value.style.display = 'flex';
      firstRef.value.style.flex = String(
        storedValue === HIDE_FIRST || storedValue === HIDE_SECOND ? defaultFlex : storedValue,
      );
    }

    if (secondRef.value) {
      secondRef.value.style.display = 'flex';
      secondRef.value.style.flex = '1';
    }

    if (dragBarRef.value) {
      dragBarRef.value.style.display = 'flex';
    }
  };

  const hide = (elementType: ResizableElement) => {
    const el = elementType === 'first' ? firstRef.value : secondRef.value;
    if (!el) return;

    el.style.left = '-1000px';
    el.style.position = 'absolute';
    el.style.opacity = '0';
    el.style.height = '500px';
    el.style.width = '500px';

    if (firstRef.value) {
      const flex = parseFloat(firstRef.value.style.flex);
      if (!Number.isFinite(flex) || flex < 1) {
        firstRef.value.style.flex = '1';
      }
    }
  };

  const show = (elementType: ResizableElement) => {
    const el = elementType === 'first' ? firstRef.value : secondRef.value;
    if (!el) return;

    el.style.width = '';
    el.style.height = '';
    el.style.opacity = '';
    el.style.position = '';
    el.style.left = '';

    if (storage && storageKey) {
      const storedValue = storage.get(storageKey);
      if (firstRef.value && storedValue !== HIDE_FIRST && storedValue !== HIDE_SECOND) {
        firstRef.value.style.flex = String(storedValue || defaultFlex);
      }
    }
  };

  watch(hiddenElement, () => {
    if (hiddenElement.value === 'first') hide('first');
    else show('first');

    if (hiddenElement.value === 'second') hide('second');
    else show('second');
  });

  let cleanupFns: (() => void)[] = [];

  const setupDrag = () => {
    if (!dragBarRef.value || !firstRef.value || !secondRef.value) return;

    const dragBar = dragBarRef.value;
    const first = firstRef.value;
    const wrapper = first.parentElement!;

    const eventProp = direction === 'horizontal' ? 'clientX' : 'clientY';
    const rectProp = direction === 'horizontal' ? 'left' : 'top';
    const adjRectProp = direction === 'horizontal' ? 'right' : 'bottom';
    const sizeProp = direction === 'horizontal' ? 'clientWidth' : 'clientHeight';

    const handleMouseDown = (downEvent: MouseEvent) => {
      downEvent.preventDefault();

      const offset = downEvent[eventProp] - dragBar.getBoundingClientRect()[rectProp];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (moveEvent.buttons === 0) return handleMouseUp();

        const firstSize = moveEvent[eventProp] - wrapper.getBoundingClientRect()[rectProp] - offset;

        const secondSize =
          wrapper.getBoundingClientRect()[adjRectProp] - moveEvent[eventProp] + offset - dragBar[sizeProp];

        if (firstSize < sizeThresholdFirst) {
          setHiddenElement('first');
          store(HIDE_FIRST);
        } else if (secondSize < sizeThresholdSecond) {
          setHiddenElement('second');
          store(HIDE_SECOND);
        } else {
          setHiddenElement(null);
          const newFlex = `${firstSize / secondSize}`;
          first.style.flex = newFlex;
          store(newFlex);
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const reset = () => {
      if (firstRef.value) {
        firstRef.value.style.flex = defaultFlex;
      }
      store(defaultFlex);
      setHiddenElement(null);
    };

    dragBar.addEventListener('mousedown', handleMouseDown);
    dragBar.addEventListener('dblclick', reset);

    cleanupFns.push(() => {
      dragBar.removeEventListener('mousedown', handleMouseDown);
      dragBar.removeEventListener('dblclick', reset);
    });
  };

  onMounted(async () => {
    initHidden();
    await nextTick();
    setupLayout();
    setupDrag();
  });

  onBeforeUnmount(() => {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  });

  // Re-setup when refs become available (e.g. v-show reveals them)
  watch([firstRef, dragBarRef, secondRef], async ([newFirst, newDragBar, newSecond]) => {
    if (newFirst && newDragBar && newSecond) {
      cleanupFns.forEach(fn => fn());
      cleanupFns = [];
      await nextTick();
      setupLayout();
      setupDrag();
    }
  });

  return {
    firstRef,
    secondRef,
    dragBarRef,
    hiddenElement,
    setHiddenElement,
  };
}
