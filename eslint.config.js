import {
  default as openreachtechConfig,
} from '@openreachtech/eslint-config'

export default [
  ...openreachtechConfig,

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
