// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default tseslint.config(
  { ignores: ['dist/**', '**/node_modules/**', 'playground/*/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Same relaxations as intelli-app-operations/nuxt/eslint.config.mjs.
      'vue/html-self-closing': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      // Internal component names (Button, Tabs, Field) are never registered globally.
      'vue/multi-word-component-names': 'off',
      // Vue 2 has no fragments: one root element per template (EXP-03 makes this pass).
      'vue/no-multiple-template-root': 'error',
    },
  },
);
