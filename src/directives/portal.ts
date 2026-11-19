// Vue 2.7 + Vue 3 replacement for <Teleport to="body">: moves the element to document.body once mounted
// and removes it when the owner unmounts. One object carries both hook names (Vue 3: mounted/unmounted,
// Vue 2: inserted/unbind).
//
// Rules for callers:
// - Put v-portal on an element that is always rendered (use v-if / v-show on its children, not on it).
// - Make it the FIRST child of its parent: Vue inserts new siblings before the next sibling's element,
//   and a moved element is no longer in the parent.
function move(el: HTMLElement): void {
  if (typeof document !== 'undefined' && el.parentNode !== document.body) document.body.appendChild(el);
}

function remove(el: HTMLElement): void {
  el.parentNode?.removeChild(el);
}

export const vPortal = {
  mounted: move,
  inserted: move,
  unmounted: remove,
  unbind: remove,
};
