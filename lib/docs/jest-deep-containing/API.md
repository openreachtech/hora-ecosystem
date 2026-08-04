# API

Source: `lib/setup-expect-deepContaining.js`, `lib/DeepContainingConverter.js` (no `.d.ts` wired via `package.json`'s `"types"`; extracted from JSDoc).

## Exports

This package has no conventional class export from an `index.js` — its `"main"` (`lib/setup-expect-deepContaining.js`) is a **setup file with a side effect**: when loaded (via Jest's `setupFilesAfterEnv`), it splices a new `deepContaining` method onto the global `expect` object (using `@openreachtech/mentsu-gene-chain-splicer`).

- `expect.deepContaining(value, { skipsArray = false } = {})` — the method this package adds to `expect`. Recursively converts `value` into nested `expect.objectContaining(...)` (and, unless `skipsArray` is `true`, `expect.arrayContaining(...)` for arrays), so a matcher built from it only requires the received value to *contain* the given shape rather than equal it exactly.
- `DeepContainingConverter` — the class doing the actual conversion, used internally by the setup file above. Not exported publicly, but its shape is documented here since it's the load-bearing logic:

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |

  - `.create({ rawExpect = expect, skipsArray = false } = {})` — static factory method.
  - `.returnsAsIs({ value })` — static method. `true` when `value` is `null`, not an object, or not a plain `Object`/`Array` (i.e. left untouched by conversion).
  - `.isConvertTargetObject({ value })` — static method. `true` when `value.constructor.name` is `'Array'` or `'Object'`.
  - `#deepConvert({ value })` — instance method (`@public`). Recursively walks `value`: arrays become `expect.arrayContaining(...)` (or a plain converted array if `skipsArray`), plain objects become `expect.objectContaining(...)` with each property recursively converted, everything else is returned as-is.
  - `#extractKeys({ value })` — instance method. Returns own string keys plus own symbol keys of `value`.
  - `#get:Ctor` — instance getter. Returns `this.constructor`.

## Usage

```js
// jest.config.js
export default {
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@openreachtech/jest-deep-containing/lib/setup-expect-deepContaining.js',
  ],
}
```

```js
test('matches nested objects partially', () => {
  const expected = expect.deepContaining({
    user: { id: 123, name: 'John' },
  })

  expect({
    user: { id: 123, name: 'John', email: 'john-doe@example.com' },
  }).toEqual(expected) // passes — extra keys are OK
})
```

Pass `{ skipsArray: true }` as the second argument to require arrays to match exactly (order and length) instead of using `expect.arrayContaining(...)`.
