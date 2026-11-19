<!-- components/gql/doc/EnumValues.vue -->
<template>
  <ExplorerSection v-if="values.length > 0" title="Enum Values">
    <EnumValue v-for="value in values" :key="value.name" :value="value" />
  </ExplorerSection>
  <template v-if="deprecatedValues.length > 0">
    <template v-if="showDeprecated || values.length === 0">
      <ExplorerSection title="Deprecated Enum Values">
        <EnumValue v-for="value in deprecatedValues" :key="value.name" :value="value" />
      </ExplorerSection>
    </template>
    <button v-else type="button" @click="showDeprecated = true">Show Deprecated Values</button>
  </template>
</template>

<script setup lang="ts">
import type { GraphQLEnumValue, GraphQLNamedType } from 'graphql';
import { isEnumType } from 'graphql';
import { computed, ref } from 'vue';
import EnumValue from './EnumValue.vue';
import ExplorerSection from './ExplorerSection.vue';

const props = defineProps<{
  type: GraphQLNamedType;
}>();

const showDeprecated = ref(false);

const valuesList = computed(() => (isEnumType(props.type) ? props.type.getValues() : []));

const values = computed<GraphQLEnumValue[]>(() => {
  const result: GraphQLEnumValue[] = [];
  const deprecated: GraphQLEnumValue[] = [];
  for (const value of valuesList.value) {
    if (value.deprecationReason) {
      deprecated.push(value);
    } else {
      result.push(value);
    }
  }
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  deprecatedValues.value = deprecated;
  return result;
});

const deprecatedValues = ref<GraphQLEnumValue[]>([]);
</script>
