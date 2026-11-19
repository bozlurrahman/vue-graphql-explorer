// Vue 2.7 adapter for the shared component spec (resolved as `#mount` by toolchain/vue2/vitest.config.ts,
// which also points `@vue/test-utils` at v1 and `vue` at Vue 2.7).
import * as vtu from '@vue/test-utils';
import type { MountExplorer } from './types';

export const vueMajor = 2;

// Typechecked against the v2 types in the root; at runtime this is v1, which takes `propsData` and `destroy()`.
const mount = vtu.mount as any;

export const mountExplorer: MountExplorer = (component, props) => {
  const wrapper = mount(component as any, { propsData: props, attachTo: document.body });
  return { wrapper: wrapper as any, unmount: () => wrapper.destroy() };
};

// VTU v1 has no flushPromises.
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
