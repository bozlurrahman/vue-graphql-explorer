<!-- components/gql/doc/FieldDocumentation.vue -->
<script setup lang="ts">
import type { ExplorerFieldDef } from '../../lib/explorer';
import Arguments from './Arguments.vue';
import DeprecationReason from './DeprecationReason.vue';
import Directives from './Directives.vue';
import ExplorerSection from './ExplorerSection.vue';
import MarkdownContent from './MarkdownContent.vue';
import TypeLink from './TypeLink.vue';

defineProps<{
  field: ExplorerFieldDef;
}>();
</script>

<template>
  <div class="graphiql-contents">
    <MarkdownContent v-if="field.description" type="description" :markdown="field.description" />
    <DeprecationReason :preview="false" :reason="field.deprecationReason" />
    <ExplorerSection title="Type">
      <TypeLink :type="field.type" />
    </ExplorerSection>
    <Arguments :field="field" />
    <Directives :field="field" />
  </div>
</template>
