# API

Source: `lib/EnvironmentFacade.js`, `lib/EnvironmentResolver.js`, `lib/DotenvLoader.js`. `types/index.d.ts` only re-exports these modules and one type alias; no members are tagged `@public`, so the surface below is the primary usage pattern shown in the package's own README.

## Exports (`index.js` / `types/index.d.ts`)

- `EnvironmentFacade` — the main entry point.
- `EnvironmentResolver`, `DotenvLoader` — lower-level pieces used internally by `EnvironmentFacade`.
- `EnvironmentFacadeInterface` (type only) — the shape returned by `#generateFacade()`: the resolved env hash plus the boolean-check methods below.

## Class: `EnvironmentFacade`

Wraps the resolved environment (merged `.env.<NODE_ENV>` file + `process.env`) with convenience accessors.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ processEnv = process.env } = {})` — static factory method. Loads the `.env.<NODE_ENV>` file (via `EnvironmentResolver`/`DotenvLoader`) and merges it with `processEnv`.
- `.createResolver({ processEnv = process.env } = {})` — static method. Returns the `EnvironmentResolver` instance used internally by `.create()`.
- `#get:env` — instance getter. The resolved environment hash (a read-only `Proxy`; unknown keys resolve to `null` rather than `undefined`).
- `#get:nodeEnv` — instance getter. `env.NODE_ENV`, or `null` if unset.
- `#isProduction()` / `#isDevelopment()` / `#isStaging()` / `#isLive()` — instance methods. `true` when `nodeEnv` equals `'production'` / `'development'` / `'staging'` / `'live'` respectively.
- `#isPreProduction()` — instance method. `true` when `!isProduction()`.
- `#generateFacade()` — instance method. Returns a `Proxy` over `env` where the methods/getters above (`isProduction`, `nodeEnv`, etc.) are also directly accessible on the returned object, alongside every environment variable key. **This is the object applications actually use** (see Usage).

## `.env` file selection (via `EnvironmentResolver`/`DotenvLoader`)

Selected automatically from `process.env.NODE_ENV`:

| `NODE_ENV` | file |
| :-- | :-- |
| `development` | `.env.development` |
| `staging` | `.env.staging` |
| `live` | `.env.live` |
| `production` | *(none — `process.env` only)* |

Throws `ENOENT` if the target `.env.<NODE_ENV>` file doesn't exist (except for `production`). Accessing an undefined environment-variable key on the generated facade throws `environment variable is not defined [key]`.

## Usage

```js
import { EnvironmentFacade } from '@openreachtech/renchan-env'

const env = EnvironmentFacade.create().generateFacade()

env.NODE_ENV
env.API_HOST // from .env.<NODE_ENV> or process.env
env.isProduction()
```
