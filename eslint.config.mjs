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
      // Vue 2 cannot key <template v-for>; keys go on the child elements (valid in Vue 3 too).
      'vue/no-v-for-template-key-on-child': 'off',
      'vue/no-v-for-template-key': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Shared Vue 2.7 + Vue 3 source only (the playgrounds use their own Vue directly).
    files: ['src/**/*.{ts,vue}'],
    rules: {
      // Vue 3.4+/3.5+ only APIs and Vue 3-only components.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'vue', message: "Import from 'vue-demi'." },
            {
              name: 'vue-demi',
              importNames: [
                'capitalize',
                'camelize',
                'hyphenate',
                'Fragment',
                'Teleport',
                'Suspense',
                'useTemplateRef',
                'useId',
                'useModel',
              ],
              message: 'Vue 3 only; not exported by Vue 2.7.',
            },
            { name: 'pinia', message: 'Use defineExplorerStore (src/stores/registry.ts).' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/^(useTemplateRef|defineModel|useId|useModel)$/]',
          message: 'Vue 3.4+ only; not available in Vue 2.7.',
        },
      ],
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'VElement[rawName=/^(Teleport|Suspense|KeepAlive)$/]',
          message: 'Not in Vue 2.7: use v-portal (src/directives/portal.ts).',
        },
      ],
    },
  },
);
