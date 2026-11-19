<!-- components/gql/doc/Fields.vue -->
<template>
  <ExplorerSection v-if="fields.length > 0" title="Fields">
    <Field v-for="field in fields" :key="field.name" :field="field" />
  </ExplorerSection>
  <template v-if="deprecatedFields.length > 0">
    <template v-if="showDeprecated || fields.length === 0">
      <ExplorerSection title="Deprecated Fields">
        <Field v-for="field in deprecatedFields" :key="field.name" :field="field" />
      </ExplorerSection>
    </template>
    <button v-else type="button" @click="showDeprecated = true">Show Deprecated Fields</button>
  </template>
</template>

<script setup lang="ts">
import type { GraphQLNamedType } from 'graphql';
import { isInputObjectType, isInterfaceType, isObjectType } from 'graphql';
import { computed, ref } from 'vue';
import type { ExplorerFieldDef } from '../../lib/explorer';
import ExplorerSection from './ExplorerSection.vue';
import Field from './Field.vue';

const props = defineProps<{
  type: GraphQLNamedType;
}>();

const showDeprecated = ref(false);

const fieldMap = computed(() => {
  if (!isObjectType(props.type) && !isInterfaceType(props.type) && !isInputObjectType(props.type)) {
    return {};
  }
  return props.type.getFields();
});

const fields = computed<ExplorerFieldDef[]>(() => {
  const result: ExplorerFieldDef[] = [];
  const deprecated: ExplorerFieldDef[] = [];
  for (const name in fieldMap.value) {
    const field = fieldMap.value[name]!;
    if (field.deprecationReason) {
      deprecated.push(field);
    } else {
      result.push(field);
    }
  }
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  deprecatedFields.value = deprecated;
  return result;
});

const deprecatedFields = ref<ExplorerFieldDef[]>([]);
</script>
