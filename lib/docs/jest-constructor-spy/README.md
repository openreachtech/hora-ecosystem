# ConstructorSpy for Jest
`ConstructorSpy` is a module designed to spy on the constructor of JavaScript class in Jest. It allows developers to easily track and monitor the usage of the constructor in their Jest tests.

## Installation

* Node.js is required. If it is not installed yet, please do so before proceeding.

  | tools | version |
  | :-- | :-- |
  | Node.js | >= 20.0.0 |
  | npm | >= 10.0.0 |

* A testing tool such as Jest is required. The following is an example of how to install Jest. If you prefer to use a different testing tool, please refer to its specific installation guide. Require Jest version 29.5.0 or greater.

  ```
  npm install --save-dev jest
  ```

* Create a `.npmrc` file in the root directory of your project and add any necessary configurations. This might be required for installing certain npm packages.

* Please add the following line to your `.npmrc` file.

  ```
  @openreachtech:registry=https://npm.pkg.github.com
  ```

* You can install `ConstructorSpy` with Jest version 29.5.0 or greater by the following command:

  ```
  npm install --save-dev @openreachtech/jest-constructor-spy
  ```

## Usage

* When you design a class with factory method, `ConstructorSpy` can test to call constructor from the factory method.

```javascript
const { ConstructorSpy } = require('@openreachtech/jest-constructor-spy')

class Sample {
  constructor (value) {
    this.value
  }

  static createWithDefaultValue () {
    return new this(12000)
  }
}

test('to call constructor with 12000', () => {
  const SpiedSample = ConstructorSpy.create({ jest })
    .spyOn(Sample)

  SpiedSample.createWithDefaultValue()

  expect(SpiedSample.__spy__)
    .toHaveBeenCalledWith(12000)
})
```

## Setup in `jest.config.js`

* You can refer to an instance of `ConstructorSpy` by `constructorSpy` in each test by using the following in `setupFilesAfterEnv` in `jest.config.js`.


```javascript
// jest.config.js

module.exports = {
  setupFilesAfterEnv: [
    ...

    '@openreachtech/jest-constructor-spy/config/setupAfterEnv.js',

    ...
  ], ...
}
```

```javascript
// __tests__/test.js

class Sample {
  constructor (value) {
    this.value
  }

  static createWithDefaultValue () {
    return new this(12000)
  }
}

test('to call constructor with 12000', () => {
  const SpiedSample = constructorSpy.spyOn(Sample)

  SpiedSample.createWithDefaultValue()

  expect(SpiedSample.__spy__)
    .toHaveBeenCalledWith(12000)
})
```

## License

This project is released under the MIT License.

For more details, please see [in the LICENSE file](./LICENSE).

## Contribution

* We welcome bug reports, feature requests, and code contributions. Please feel free to contact us through GitHub Issues or Pull Requests. Your contributions are highly appreciated!

## Authors

* Open Reach Tech Inc.

* We strive to meet user expectations and welcome any kind of feedback.
