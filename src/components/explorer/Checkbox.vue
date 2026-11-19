<!-- eslint-disable vue/no-v-html -->
<!-- components/Checkbox.vue -->
<template>
  <span v-html="checked ? styleConfig.checkboxChecked : styleConfig.checkboxUnchecked"></span>
</template>

<script setup lang="ts">
import type { StyleConfig } from '~/lib/explorer';

defineProps<{ checked: boolean; styleConfig: StyleConfig }>();
</script>
