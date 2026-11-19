<!-- components/gql/doc/PossibleTypes.vue -->
<template>
  <ExplorerSection v-if="possibleTypes.length > 0" :title="title">
    <div v-for="possibleType in possibleTypes" :key="possibleType.name">
      <TypeLink :type="possibleType" />
    </div>
  </ExplorerSection>
</template>

<script setup lang="ts">
import type { GraphQLNamedType } from 'graphql';
import { isAbstractType, isInterfaceType } from 'graphql';
import { computed } from 'vue-demi';
import { useSchemaStore } from '../../stores/schema';
import ExplorerSection from './ExplorerSection.vue';
import TypeLink from './TypeLink.vue';

const props = defineProps<{
  type: GraphQLNamedType;
}>();

const schemaStore = useSchemaStore();

const possibleTypes = computed(() =>
  schemaStore.schema && isAbstractType(props.type) ? schemaStore.schema.getPossibleTypes(props.type) : [],
);

const title = computed(() => (isInterfaceType(props.type) ? 'Implementations' : 'Possible Types'));
</script>
