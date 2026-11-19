// Vue 3 adapter for the shared component spec (resolved as `#mount` by the root vitest.config.ts).
import { flushPromises, mount } from '@vue/test-utils';
import type { MountExplorer } from './types';

export const vueMajor = 3;

export const mountExplorer: MountExplorer = (component, props) => {
  const wrapper = mount(component as any, { props, attachTo: document.body });
  return { wrapper: wrapper as any, unmount: () => wrapper.unmount() };
};

export { flushPromises };
