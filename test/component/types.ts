// The subset of the VTU wrapper API that is the same in v1 (Vue 2.7) and v2 (Vue 3).
export interface DomWrapper {
  exists(): boolean;
  text(): string;
  html(): string;
  attributes(name: string): string | undefined;
  trigger(event: string): Promise<void>;
  find(selector: string): DomWrapper;
  element: HTMLElement;
}

export type MountExplorer = (
  component: unknown,
  props: Record<string, unknown>,
) => { wrapper: DomWrapper; unmount: () => void };
