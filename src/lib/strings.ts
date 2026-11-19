// Vue 3 exports `capitalize` from 'vue'; Vue 2.7 does not, so the shared source keeps its own.
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
