import globals from 'globals'

import {
  coreConfig,
  jsdocPluginConfig,
  openreachtechPluginConfig,
  stylisticPluginConfig,
} from '@openreachtech/eslint-config'

// TODO: Replace with a named export once `@openreachtech/eslint-config`
// exposes `eslintCommentsPluginConfig` from its index.js. This deep path
// works only because the package declares no `exports` field.
import eslintCommentsPluginConfig from '@openreachtech/eslint-config/lib/configurations/plugins/eslint-comments.js'

export default [
  coreConfig,

  stylisticPluginConfig,

  jsdocPluginConfig,

  eslintCommentsPluginConfig,

  openreachtechPluginConfig,

  {
    ignores: [
      '**/node_modules/**',

      './playground/**',
    ],
  },

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
      },
      sourceType: 'module',
    },
  },

  {
    files: [
      '**/*.cjs',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
]
