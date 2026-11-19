<!-- components/gql/doc/ImplementsInterfaces.vue -->
<template>
  <ExplorerSection v-if="interfaces.length > 0" title="Implements">
    <div v-for="implementedInterface in interfaces" :key="implementedInterface.name">
      <TypeLink :type="implementedInterface" />
    </div>
  </ExplorerSection>
</template>

<script setup lang="ts">
import type { GraphQLNamedType } from 'graphql';
import { isObjectType } from 'graphql';
import { computed } from 'vue';
import ExplorerSection from './ExplorerSection.vue';
import TypeLink from './TypeLink.vue';

const props = defineProps<{
  type: GraphQLNamedType;
}>();

const interfaces = computed(() => (isObjectType(props.type) ? props.type.getInterfaces() : []));
</script>
