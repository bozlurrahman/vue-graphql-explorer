<!-- components/gql/doc/ExplorerSection.vue -->
<template>
  <div>
    <div class="graphiql-doc-explorer-section-title">
      <!-- eslint-disable-next-line vue/no-v-html -- static SVG icon bundled with the package -->
      <div v-html="icon" />
      {{ title }}
    </div>
    <div class="graphiql-doc-explorer-section-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import ArgumentIcon from '../icons/argument.svg?raw';
import DeprecatedArgumentIcon from '../icons/deprecated-argument.svg?raw';
import DeprecatedEnumValueIcon from '../icons/deprecated-enum-value.svg?raw';
import DeprecatedFieldIcon from '../icons/deprecated-field.svg?raw';
import DirectiveIcon from '../icons/directive.svg?raw';
import EnumValueIcon from '../icons/enum-value.svg?raw';
import FieldIcon from '../icons/field.svg?raw';
import ImplementsIcon from '../icons/implements.svg?raw';
import RootTypeIcon from '../icons/root-type.svg?raw';
import TypeIcon from '../icons/type.svg?raw';

const props = defineProps<{
  title:
    | 'Root Types'
    | 'Fields'
    | 'Deprecated Fields'
    | 'Type'
    | 'Arguments'
    | 'Deprecated Arguments'
    | 'Implements'
    | 'Implementations'
    | 'Possible Types'
    | 'Enum Values'
    | 'Deprecated Enum Values'
    | 'Directives'
    | 'All Schema Types';
}>();

const TYPE_TO_ICON = {
  Arguments: ArgumentIcon,
  'Deprecated Arguments': DeprecatedArgumentIcon,
  'Deprecated Enum Values': DeprecatedEnumValueIcon,
  'Deprecated Fields': DeprecatedFieldIcon,
  Directives: DirectiveIcon,
  'Enum Values': EnumValueIcon,
  Fields: FieldIcon,
  Implements: ImplementsIcon,
  Implementations: TypeIcon,
  'Possible Types': TypeIcon,
  'Root Types': RootTypeIcon,
  Type: TypeIcon,
  'All Schema Types': TypeIcon,
};

const icon = TYPE_TO_ICON[props.title];
</script>
<style>
.graphiql-doc-explorer-section-title {
  align-items: center;
  display: flex;
  gap: var(--px-8);
  font-size: var(--font-size-hint);
  font-weight: var(--font-weight-medium);
  line-height: 1;
}
.graphiql-doc-explorer-section-title > svg {
  height: var(--px-16);
  margin-right: var(--px-8);
  width: var(--px-16);
}

.graphiql-doc-explorer-section-content {
  margin-left: var(--px-8);
  margin-top: var(--px-16);
}
.graphiql-doc-explorer-section-content > * + * {
  margin-top: var(--px-8);
}

.content > div > * {
  margin-bottom: var(--px-20);
}
</style>
