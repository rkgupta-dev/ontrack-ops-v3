import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from '@vue/eslint-config-prettier'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierConfig,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // public/*.js files run in a service-worker context, not the browser
    // window context the rest of the app assumes (firebase-messaging-sw.js
    // uses importScripts + the classic-worker `self`/`clients` globals).
    name: 'app/service-worker-globals',
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        importScripts: 'readonly',
        self: 'readonly',
        clients: 'readonly',
        firebase: 'readonly',
      },
    },
  },
]
