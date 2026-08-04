# API

Source: `lib/RootPath.js` (no `.d.ts` shipped; extracted from JSDoc).

## Exports (`index.js`)

- `export default rootPath` — a ready-made instance (`RootPath.create()`).
- `export { RootPath, rootPath }` — named exports of the class and the same instance.

## Class: `RootPath`

Resolves a path relative to a base directory.

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ base = process.cwd() } = {})` — static factory method. Returns an instance of `RootPath` (or subclass, via `this`). Throws `Error` if the project root is not correct.
- `#base` — instance property, the base directory path passed at construction.
- `#to(targetPath)` — instance method. Resolves `targetPath` against `#base` (`path.resolve(this.base, targetPath)`) and returns the resolved absolute path string.

## Usage

```js
import rootPath from '@openreachtech/mentsu-rootpath'

rootPath.to('app/tools/target.js')
// -> absolute path of app/tools/target.js from the project root
```

To use a custom base directory instead of `process.cwd()`:

```js
import { RootPath } from '@openreachtech/mentsu-rootpath'

const customRootPath = RootPath.create({ base: '/some/other/root' })
customRootPath.to('app/tools/target.js')
```
