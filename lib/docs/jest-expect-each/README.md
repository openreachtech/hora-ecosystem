# jest-expect-each

A Jest extension that adds `expect.each()` for testing multiple values efficiently.

# Overview

`jest-expect-each` is a Jest extension developed by Open Reach Tech Inc. that allows you to run the same assertion against multiple values in a concise and readable way.

# Installation

```bash
npm install @openreachtech/jest-expect-each
```

# Setup

Add the following line to your Jest setup file (e.g., `jest.setup.js`):

```javascript
const setupExpectEach = require('@openreachtech/jest-expect-each')

setupExpectEach()
```

Or import it at the top of individual test files:

```javascript
const setupExpectEach = require('@openreachtech/jest-expect-each')

setupExpectEach()
```

# Usage

## Basic Usage: Single Expected Value

Test multiple actual values against one common expected value:

```javascript
test('all values should be 100', () => {
  const actualValues = [100, 100, 100, 100]
  const expectedValue = 100

  expect.each(actualValues)
    .toBe(expectedValue)
})
```

## Advanced Usage: Multiple Expected Values

Test each actual value against its corresponding expected value:

```javascript
test('values should match their multiplied results', () => {
  const actualValues = [1, 2, 3, 4].map(it => it * 100)
  const expectedValues = [100, 200, 300, 400]

  expect.each(actualValues)
    .toBe.each(expectedValues)
})
```

## Working with Promises

### Using `resolves`

```javascript
test('all promises should resolve to expected values', async () => {
  const promises = [
    Promise.resolve(100),
    Promise.resolve(100),
    Promise.resolve(100)
  ]

  await expect.each(promises)
    .resolves
    .toBe(100)
})
```

### Using `rejects`

```javascript
test('all promises should reject with error', async () => {
  const promises = [
    Promise.reject(new Error('failed')),
    Promise.reject(new Error('failed'))
  ]

  await expect.each(promises)
    .rejects
    .toThrow('failed')
})
```

## Using `not` Matcher

```javascript
test('no value should be 999', () => {
  const actualValues = [100, 200, 300]

  expect.each(actualValues)
    .not
    .toBe(999)
})
```

# TypeScript Support

When using TypeScript or type checking in VS Code, import `types/jest-expect.each.d.ts` in your package.

# Error Handling

When using `.each()` with multiple expected values, the array lengths must match:

- If `actualValues.length > expectedValues.length`: throws `"expect.each() received lacked array"`
- If `actualValues.length < expectedValues.length`: throws `"expect.each() received excess array"`

# License

This project is released under the MIT License.

See [LICENSE](./LICENSE) for details.

# Contributing

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through [GitHub Issues](https://github.com/openreachtech/jest-expect-each/issues).

```bash
git clone https://github.com/openreachtech/jest-expect-each.git
cd jest-expect-each
npm install
npm run lint
npm test
```

# Developers

[Open Reach Tech Inc.](https://openreach.tech)

# Copyright

© 2026 Open Reach Tech Inc.
