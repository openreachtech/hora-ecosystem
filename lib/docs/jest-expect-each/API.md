# API

Source: `lib/setup-expect-each.js` (no `.d.ts` wired via `package.json`'s `"types"`; extracted from JSDoc).

## Exports (`index.js` / `"main"`)

- `module.exports.setupExpectEach = function setupExpectEach () { ... }` — a single named export. Calling it (once) adds an `expect.each(actualValues)` matcher to Jest's global `expect`. No members are tagged `@public`; the surface below is the whole exported API (a single function).

## Function: `setupExpectEach()`

Call once (e.g. at the top of a setup file or test file) to install `expect.each`.

- `expect.each(actualValues)` — returns a `Proxy` over `expect` that, for any matcher name accessed on it (e.g. `.toBe`, `.toEqual`, ...), returns a callback applying that matcher to **every** element of `actualValues`:
  - `expect.each(actualValues).toBe(expectedValue)` — asserts every element of `actualValues` equals the single `expectedValue`.
  - `expect.each(actualValues).toBe.each(expectedValues)` — asserts `actualValues[i]` matches `expectedValues[i]` for each index (arrays must be the same length; see Error Handling below). Any array-shaped entry in `expectedValues` is spread as multiple matcher arguments.
  - `expect.each(actualValues).not.<matcher>(...)` — negated form, same per-element/each semantics.
  - `expect.each(promises).resolves.<matcher>(...)` / `.rejects.<matcher>(...)` — async form; awaits all elements' matcher assertions in parallel via `Promise.all`, including the `.each(...)` plural variant and `.not`.

## Error Handling

When using the plural `.each(expectedValues)` form, `actualValues.length` and `expectedValues.length` must match:
- `actualValues.length > expectedValues.length` throws `Error('expect.each() received lacked array')`.
- `actualValues.length < expectedValues.length` throws `Error('expect.each() received excess array')`.

Thrown errors have the internal `setup-expect-each.js` stack frames stripped out before being re-thrown, so Jest failure output points at the caller's test code.

## Usage

```js
const setupExpectEach = require('@openreachtech/jest-expect-each')
setupExpectEach()

test('all values should be 100', () => {
  expect.each([100, 100, 100]).toBe(100)
})

test('values should match per index', () => {
  expect.each([100, 200, 300]).toBe.each([100, 200, 300])
})

test('all promises resolve to expected values', async () => {
  await expect.each([Promise.resolve(100), Promise.resolve(100)])
    .resolves
    .toBe(100)
})
```
