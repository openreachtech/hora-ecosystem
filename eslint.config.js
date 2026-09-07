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

  {
    ignores: [
      // Scratch space. `.gitignore` already excludes it, but flat config does
      // not read `.gitignore`, so without this entry a throwaway script left
      // here fails `npm run lint` locally while CI — which never checks out an
      // ignored directory — stays green, and nothing points at the cause.
      '.scratch/',
    ],
  },
]
