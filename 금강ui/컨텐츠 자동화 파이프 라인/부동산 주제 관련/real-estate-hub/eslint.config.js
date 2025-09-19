/*
 Title: ESLint configuration
 Purpose: Linting rules and plugins setup for TypeScript + React + Vite project.
 Created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Last-Modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Maintainer: Team GG
*/

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
