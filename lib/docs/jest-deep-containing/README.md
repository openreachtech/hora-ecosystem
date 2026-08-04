# @openreachtech/jest-deep-containing

A Jest matcher extension that provides deep object and array matching with `expect.objectContaining()` and `expect.arrayContaining()` recursively applied.

# Installation

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- ESM (ECMAScript Modules) only

## Install

```bash
npm install --save-dev @openreachtech/jest-deep-containing
```

# Usage

Configure Jest to load the extension in your `jest.config.js`:

```js
export default {
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@openreachtech/jest-deep-containing/lib/setup-expect-deepContaining.js',
  ],
}
```

For TypeScript support, add the type definitions to your `jest.d.ts`:

```ts
// jest.d.ts
import '@openreachtech/jest-deep-containing/types/jest-expect.deepContaining.d.ts'
```

## (1) Basic Nested Object Matching

Match nested objects partially:

```js
test('matches nested objects partially', () => {
  const expected = expect.deepContaining({
    user: {
      id: 123,
      name: 'John',
    },
  })

  const received = {
    user: {
      id: 123,
      name: 'John',
      email: 'john-doe@example.com', // ✅️ extra attribute
    },
  }

  expect(received)
    .toEqual(expected)
})
```

## (2) Array Matching

By default, arrays are matched using `expect.arrayContaining()`:

```js
test('matches arrays partially', () => {
  const expected = expect.deepContaining({
    values: [
      100,
      200,
    ],
  })

  const received = {
    values: [
      200, // ✅️ order doesn't matter
      100,
      300, // ✅️ extra item is OK
    ],
  }

  expect(received)
    .toEqual(expected) // ✅️ matched
})
```

## (3) Skipping Array Matching

Disable array containing behavior with `{ skipsArray: true }`:

```js
test('matches arrays exactly when skipsArray is true', () => {
  const expected = expect.deepContaining({
    values: [
      100,
      200,
      300,
    ],
  }, {
    skipsArray: true,
  })

  const received = {
    values: [
      100, // ✅️ Exact match required (order and length)
      200,
      300,
    ],
  }

  expect(received)
    .toEqual(expected) // ✅️ matched
})
```

## (4) Deep Nested Structures

Works with deeply nested objects and arrays:

```js
test('matches deeply nested structures', () => {
  const expected = expect.deepContaining({
    entity: {
      users: [
        { id: 1, name: 'Alice' },
      ],
      group: {
        total: 2,
      }
    }
  })

  const received = {
    entity: {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Betty', role: 'user' }, // ✅️ extra item of users.
      ],
      group: {
        total: 2,
        page: 1, // ✅️
        timestamp: '2026-02-10T11:22:33.999Z', // ✅️
      },
    }
  }

  expect(received)
    .toEqual(expected) // ✅️ matched
})
```

# Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

```bash
git clone git@github.com:openreachtech/jest-deep-containing.git
cd jest-deep-containing
npm install
npm run lint
npm test
```

# License

This project is released under the MIT License.

For more details, please see the [LICENSE](./LICENSE) file.

# Developer

[Open Reach Tech Inc.](https://openreach.tech)

# Copyright

© 2026 Open Reach Tech Inc.
