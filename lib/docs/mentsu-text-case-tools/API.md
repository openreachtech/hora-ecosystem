# API

Source: `lib/TextCaseConverter.js`, `lib/DeepKeyCaseConverter.js` (no `.d.ts` shipped
and no `"types"` field in `package.json`; extracted from JSDoc).

## Exports (`index.js`)

- `export { TextCaseConverter }` — named export of the class (no default export from `index.js`).
- `export { DeepKeyCaseConverter }` — named export of the class (no default export from `index.js`).

## Class: `TextCaseConverter`

Converts a single string between delimiter-case (e.g. `snake_case`, `kebab-case`) and
`camelCase`/`PascalCase`, using a configurable delimiter character (`_` by default).

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ delimiter = '_' } = {})` — static factory method. Returns an instance of `TextCaseConverter` (or subclass, via `this`).
- `#delimiter` — instance property, the delimiter character passed at construction (`'_'` by default via `.create()`).
- `#escapeDelimiter()` — instance method. Returns `#delimiter`, backslash-escaped if it is one of the regex special characters (`` . * + ? ^ $ { } ( ) [ ] | \ ``); otherwise returns it unchanged. Used internally to safely embed the delimiter in a `RegExp`.
- `#toCamelCase({ text })` — instance method. Replaces every occurrence of `#delimiter` followed by a word character with just the uppercased character (the delimiter is removed). Converts delimiter-separated text into `camelCase`. Note: it does not alter the first character of `text`, so a leading uppercase letter (e.g. `PascalCase` input) is left as-is.

  ```js
  const converter = TextCaseConverter.create() // delimiter: '_'

  converter.toCamelCase({ text: 'foo_bar_baz' })
  // 'fooBarBaz'
  ```

- `#toPascalCase({ text })` — instance method. Same replacement as `#toCamelCase()`, but the pattern also matches the very start of the string, so the first character is uppercased too. Converts delimiter-separated text into `PascalCase`.

  ```js
  const converter = TextCaseConverter.create() // delimiter: '_'

  converter.toPascalCase({ text: 'foo_bar_baz' })
  // 'FooBarBaz'
  ```

- `#toDelimiterCase({ text, strict = false })` — instance method. Inserts `#delimiter` before each uppercase letter, then lower-cases the whole string. With `strict: false` (default), a leading uppercase letter is skipped (no delimiter is inserted before position 0); with `strict: true`, a delimiter is inserted before every uppercase letter including one at position 0. Converts `camelCase`/`PascalCase` text into delimiter-case.

  ```js
  const converter = TextCaseConverter.create() // delimiter: '_'

  converter.toDelimiterCase({ text: 'fooBarBaz' })
  // 'foo_bar_baz'

  converter.toDelimiterCase({ text: 'FooBarBaz' })
  // 'foo_bar_baz' (strict: false, default — no leading delimiter)

  converter.toDelimiterCase({ text: 'FooBarBaz', strict: true })
  // '_foo_bar_baz' (strict: true — leading delimiter included)
  ```

  A `-` delimiter produces kebab-case instead:

  ```js
  const kebabConverter = TextCaseConverter.create({ delimiter: '-' })

  kebabConverter.toDelimiterCase({ text: 'fooBarBaz' })
  // 'foo-bar-baz'
  ```

## Class: `DeepKeyCaseConverter`

Recursively converts the keys of a plain object — including keys nested inside arrays
and nested objects — between `camelCase` and delimiter-case, using an internal
`TextCaseConverter`. Values that are not plain objects or arrays (including `null`,
class instances, primitives) are left untouched.

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ delimiter = '_' } = {})` — static factory method. Builds a `TextCaseConverter` via `.createTextCaseConverter()` and returns an instance of `DeepKeyCaseConverter` (or subclass, via `this`) wired to use it.
- `.createTextCaseConverter({ delimiter = '_' } = {})` — static method. Returns `TextCaseConverter.create({ delimiter })`. Used internally by `.create()`.
- `.isPlainObject({ value })` — static method. Returns `true` when `value` is non-`null`, `typeof value === 'object'`, and `value.constructor.name === 'Object'` (i.e. a plain object literal, not an array, `null`, or a class instance).
- `#textCaseConverter` — instance property, the `TextCaseConverter` instance used to convert individual keys.
- `#get:Ctor` — instance getter. Returns `this.constructor`, used internally to call static helpers (e.g. `.isPlainObject()`) polymorphically from instance methods.
- `#deepConvertKeysToCamelCase({ value })` — instance method (JSDoc-tagged `@public`). Recursively walks `value`: arrays are mapped element-by-element, plain objects have every key converted via `#textCaseConverter.toCamelCase()` while values are recursed into, and anything else is returned unchanged.

  ```js
  const deepConverter = DeepKeyCaseConverter.create() // delimiter: '_'

  deepConverter.deepConvertKeysToCamelCase({
    value: {
      foo_bar: 1,
      nested_object: {
        deep_key: 2,
      },
      list_field: [
        { item_key: 3 },
      ],
    },
  })
  // {
  //   fooBar: 1,
  //   nestedObject: { deepKey: 2 },
  //   listField: [{ itemKey: 3 }],
  // }
  ```

- `#deepConvertKeysToDelimiterCase({ value })` — instance method. Same recursive walk as `#deepConvertKeysToCamelCase()`, but converts each key via `#textCaseConverter.toDelimiterCase({ text: key, strict: true })`. Unlike `#deepConvertKeysToCamelCase()`, this method is not JSDoc-tagged `@public` in the source, but it is exposed the same way and is the natural inverse operation.

  ```js
  const deepConverter = DeepKeyCaseConverter.create() // delimiter: '_'

  deepConverter.deepConvertKeysToDelimiterCase({
    value: {
      fooBar: 1,
      nestedObject: { deepKey: 2 },
      listField: [{ itemKey: 3 }],
    },
  })
  // {
  //   foo_bar: 1,
  //   nested_object: { deep_key: 2 },
  //   list_field: [{ item_key: 3 }],
  // }
  ```

## Usage

```js
import { TextCaseConverter, DeepKeyCaseConverter } from '@openreachtech/mentsu-text-case-tools'

const converter = TextCaseConverter.create()

converter.toCamelCase({ text: 'foo_bar_baz' })
// 'fooBarBaz'

const deepConverter = DeepKeyCaseConverter.create()

deepConverter.deepConvertKeysToCamelCase({
  value: { foo_bar: 1, nested_object: { deep_key: 2 } },
})
// { fooBar: 1, nestedObject: { deepKey: 2 } }
```
