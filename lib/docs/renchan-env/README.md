# renchan-env

## Overview

* This is a module to integrate and manage `process.env` and `.env` file.

* You can prepare `.env` files for each `NODE_ENV`.

## Installation

* Node.js is required. If it is not already installed, please do so before proceeding.

  | tools | version |
  | :-- | :-- |
  | Node.js | ^20.19.2 |
  | npm | ^10.5.2 |

* You can install `renchan-env` with the following command:

  ```
  npm install @openreachtech/renchan-env
  ```

## Usage

### Naming filename of `.env`

Can switch using `.env` file by value of `process.env.NODE_ENV` automatically.

| value of `process.env.NODE_ENV` | filename of target `.env` |
| :-- | :-- |
| development | `.env.development` |
| staging | `.env.staging` |
| live | `.env.live` |
| production | `.env` |

### Code Example

We give a code example when `NODE_ENV` is `development`.

#### (1) Create `.env.development`

Create `.env.development` in project root

```
API_HOST = openreach.tech
API_KEY = hash-of-api-key
```

### (2) File for type resolution and handling of `.env.development`

Create env script as `path/as/you/like/app-env.js`

```js
const {
  EnvironmentFacade,
} = require('@openreachtech/renchan-env')

const facade = EnvironmentFacade.create()

module.exports = /** @type {EnvType} */ (
  facade.generateFacade()
)

/**
 * @typedef {{
 *   NODE_ENV: string
 *   API_HOST: string
 *   API_KEY: string
 * }} EnvType
 */
```

### (3) Call `.env.development` from Application Code.

```js
const ApiClient = require('api/ApiClient')
const env = require('path/as/you/like/app-env')

const client = new ApiClient({
  API_HOST: env.API_HOST,
  API_KEY: env.API_KEY,
})
```

## Exceptions

### No .env file

When can not open `.env` which target by value of NODE_ENV, throws as follows:

```
ENOENT: no such file or directory, open [project root]/.env.development
```

### No key of environment variable

If access to env instance with undefined key, throws as follows:

```
environment variable is not defined [access key]
```

```js
const env = require('path/as/you/like/app-env')

console.log(env.UNKNOWN_KEY) // throws 'environment variable is not defined [UNKNOWN_KEY]'
```

## License

This project is released under the Apache License 2.0.<br>
See [here](./LICENSE)

## Contribution

We welcome bug reports, feature requests, and code contributions.<br>
Please feel free to contact us through GitHub Issues or Pull Requests.<br>
We strive to meet user expectations and your contributions are highly appreciated!

```sh
git clone https://github.com/openreachtech/renchan-env.git
cd renchan-env
npm install
npm run lint
npm test
```

## Authors

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2024 Open Reach Tech Inc.
