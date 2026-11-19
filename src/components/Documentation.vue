<!-- src/components/gql/Documentation.vue -->
<script setup lang="ts">
import type { GraphQLSchema } from 'graphql';
import { isType } from 'graphql';
import { computed } from 'vue';
import type { ExplorerFieldDef } from '../lib/explorer';
import { useDocumentationStore } from '../stores/documentation';
import { useSchemaStore } from '../stores/schema';
import FieldDocumentation from './doc/FieldDocumentation.vue';
import SchemaDocumentation from './doc/SchemaDocumentation.vue';
import TypeDocumentation from './doc/TypeDocumentation.vue';

const docStore = useDocumentationStore();
const schemaStore = useSchemaStore();

const current = computed(() => docStore.navStack.at(-1));

const goBack = () => docStore.pop();
</script>

<template>
  <div class="documentation">
    <div class="header">
      <button v-if="docStore.navStack.length > 1" class="back" @click="goBack">←</button>
      <strong>{{ current?.name || 'Schema' }}</strong>
    </div>

    <div class="content">
      <div v-if="schemaStore.isFetching">Loading...</div>
      <div v-else-if="schemaStore.fetchError">{{ schemaStore.fetchError }}</div>
      <div v-else-if="!schemaStore.schema">No schema</div>
      <div v-else-if="docStore.navStack.length == 1">
        <SchemaDocumentation :schema="schemaStore.schema as GraphQLSchema"></SchemaDocumentation>
      </div>
      <div v-else-if="isType(current?.def)">
        <TypeDocumentation :type="current?.def"></TypeDocumentation>
      </div>
      <div v-else-if="current?.def">
        <FieldDocumentation :field="current.def as ExplorerFieldDef"></FieldDocumentation>
      </div>
    </div>
  </div>
</template>

<style scoped>
.documentation {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  padding: 12px;
  border-bottom: 1px solid rgba(221, 221, 221, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(248, 248, 248, 0.1);
}
.back {
  background: none;
  border: none;
  cursor: pointer;
}
.content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
.root-type {
  padding: 8px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}
.root-type:hover {
  background: #f0f8ff;
}
.type-desc {
  margin-bottom: 16px;
  color: #444;
  font-style: italic;
}
.fields h4 {
  margin: 16px 0 8px;
  color: #666;
}
</style>
