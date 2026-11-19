// Vue 2 and Vue 3 take different data objects in h(): Vue 2 nests props / DOM props
// ({ props }, { domProps: { innerHTML } }); Vue 3 takes them flat. Render functions in the shared
// source call these helpers instead of h() directly. The types follow Vue 3 (vue-demi's typings).
import { h, isVue2, type Component } from 'vue-demi';

export function hWithProps(component: Component, props: Record<string, unknown>) {
  return isVue2 ? h(component, { props } as any) : h(component, props);
}

export function hWithHtml(tag: string, html: string) {
  return isVue2 ? h(tag, { domProps: { innerHTML: html } } as any) : h(tag, { innerHTML: html });
}
