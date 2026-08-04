# API

Source: `lib/ConstructorSpy.js` (no `.d.ts` shipped; extracted from JSDoc).

## Exports (`index.js`)

- `module.exports = { ConstructorSpy }` — named export of the class (no default export). Also registers `constructorSpy` as a global via `config/setupAfterEnv.js` when added to Jest's `setupFilesAfterEnv`.

## Class: `ConstructorSpy`

Wraps a class so its constructor calls can be asserted on in Jest, even when the class is only ever instantiated indirectly (e.g. via a static factory method).

| notation | members |
| :-- | :-- |
| `.staticMethod()` | static method |
| `#instanceMethod()` | instance method |

- `.create({ jest })` — static factory method. `jest` is the global Jest object (needed for `jest.fn()`).
- `#spyOn(TargetClass)` — instance method (`@public` on the equivalent global-setup mixin; documented as the sole public entry point here). Returns a subclass of `TargetClass` whose constructor calls `jest.fn()` on every invocation (including via `super(...)` from further subclasses/factories) and exposes the spy as a static getter `__spy__` on the returned class.

## Usage

```js
const { ConstructorSpy } = require('@openreachtech/jest-constructor-spy')

class Sample {
  constructor (value) {
    this.value = value
  }

  static createWithDefaultValue () {
    return new this(12000)
  }
}

test('calls constructor with 12000', () => {
  const SpiedSample = ConstructorSpy.create({ jest }).spyOn(Sample)

  SpiedSample.createWithDefaultValue()

  expect(SpiedSample.__spy__).toHaveBeenCalledWith(12000)
})
```

Alternatively, register `@openreachtech/jest-constructor-spy/config/setupAfterEnv.js` in `jest.config.js`'s `setupFilesAfterEnv` to get a ready-made `constructorSpy` global (`constructorSpy.spyOn(Sample)`), instead of calling `ConstructorSpy.create({ jest })` yourself.
