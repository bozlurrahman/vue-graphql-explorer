<!-- components/gql/doc/TypeDocumentation.vue -->
<template>
  <template v-if="isNamedType(type)">
    <MarkdownContent v-if="type.description" type="description" :markdown="type.description" />
    <ImplementsInterfaces :type="type" />
    <Fields :type="type" />
    <EnumValues :type="type" />
    <PossibleTypes :type="type" />
  </template>
</template>

<script setup lang="ts">
import type { GraphQLNamedType } from 'graphql';
import { isNamedType } from 'graphql';
import EnumValues from './EnumValues.vue';
import Fields from './Fields.vue';
import ImplementsInterfaces from './ImplementsInterfaces.vue';
import MarkdownContent from './MarkdownContent.vue';
import PossibleTypes from './PossibleTypes.vue';

defineProps<{
  type: GraphQLNamedType;
}>();
</script>
