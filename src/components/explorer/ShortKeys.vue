<template>
  <div>
    <table class="graphiql-table">
      <thead>
        <tr>
          <th>Short Key</th>
          <th>Function</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="[title, keys] in SHORT_KEYS" :key="title">
          <td>
            <template v-for="(key, i) in keys">
              <code :key="`key-${key}`" class="graphiql-key">{{ key }}</code>
              <span v-if="i < keys.length - 1" :key="`plus-${key}`">+</span>
            </template>
          </td>

          <td>{{ title }}</td>
        </tr>
      </tbody>
    </table>

    <p>
      This instance of Graph
      <em>i</em>
      QL uses
      <code>{{ keyMap }}</code>
      .
    </p>
  </div>
</template>

<script setup lang="ts">
import { SHORT_KEYS } from '../../lib/explorer';
defineProps<{
  keyMap: { type: string; required: true };
}>();
</script>
