# mentsu-gene-chain-splicer

A JavaScript utility for dynamically extending object instances by splicing methods into their prototype chain.

# Installation

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

## Install

```bash
npm install @openreachtech/mentsu-gene-chain-splicer
```

# Usage

Import the module:

```js
import {
  GeneChainSplicer,
} from '@openreachtech/mentsu-gene-chain-splicer'
```

## (1) Basic Example

Override a single method:

```js
class AlphaCore {
  firstValue () {
    return 1000
  }
}

const alphaCore = new AlphaCore()

const splicer = GeneChainSplicer.create({
  core: alphaCore,
})

splicer.spliceGene({
  mixin: {
    firstValue () {
      return 1999
    },
  },
})

console.log(alphaCore.firstValue()) // 1999
```

## (2) Multiple Members

Override multiple members at once:

```js
class BetaCore {
  firstValue () {
    return 2000
  }

  secondValue () {
    return 3000
  }
}

const betaCore = new BetaCore()

const splicer = GeneChainSplicer.create({
  core: betaCore,
})

splicer.spliceGene({
  mixin: {
    firstValue () {
      return 2999
    },

    secondValue () {
      return 3999
    },
  },
})

console.log(betaCore.firstValue()) // 2999
console.log(betaCore.secondValue()) // 3999
```

## (3) Method Chaining

Chain multiple `spliceGene()` calls:

```js
class GammaCore {
  firstValue () {
    return 4000
  }

  secondValue () {
    return 5000
  }
}

const gammaCore = new GammaCore()

const splicer = GeneChainSplicer.create({
  core: gammaCore,
})

splicer
  .spliceGene({
    mixin: {
      firstValue () {
        return 4999
      },
    },
  })
  .spliceGene({
    mixin: {
      secondValue () {
        return 5999
      },
    },
  })

console.log(gammaCore.firstValue()) // 4999
console.log(gammaCore.secondValue()) // 5999
```

## (4) Splice Order

Later splices take precedence over earlier ones:

```js
class DeltaCore {
  firstValue () {
    return 6000
  }
}

const deltaCore = new DeltaCore()

const splicer = GeneChainSplicer.create({
  core: deltaCore,
})

splicer
  .spliceGene({
    mixin: {
      firstValue () {
        return 6999
      },
    },
  })
  .spliceGene({
    mixin: {
      firstValue () {
        return 6888
      },
    },
  })

console.log(deltaCore.firstValue()) // 6888
```

# Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

```bash
git clone https://github.com/openreachtech/mentsu-gene-chain-splicer.git
cd mentsu-gene-chain-splicer
npm install
npm run lint
npm test
```

# License

This project is released under the Apache License 2.0.

For more details, please see [in the LICENSE file](./LICENSE).

# Developer

[Open Reach Tech Inc.](https://openreach.tech)

# Copyright

© 2026 Open Reach Tech Inc.
