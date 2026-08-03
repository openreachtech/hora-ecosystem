import {
  default as openreachtechConfig,
} from '@openreachtech/eslint-config'

export default [
  ...openreachtechConfig,

  {
    languageOptions: {
      globals: {
        constructorSpy: 'readonly',
      },
    },
  },

  {
    files: [
      'tests/**/*.js',
    ],
    rules: {
      'max-classes-per-file': 'off',
    },
  },
]
