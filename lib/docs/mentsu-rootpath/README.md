# mentsu-rootpath

# Overview

This provides the class for generating directories and files with relative positions from the project root in ECMAScript Modules development environments.

# Installation

Node.js is required. If you haven't installed it yet, please install it first.

| Tool | Version |
| :-- | :-- |
| Node.js | ^20.14.0 |
| npm | ^10.9.2 |

## Command

You can install `mentsu-rootpath` with the following command:

```
npm install @openreachtech/mentsu-rootpath
```

# Usage

When your project root path is `/User/your-name/project-name/`:

```
const rootPath = RootPath.create()

console.log(
  rootPath.to('app/tools/')
)
// '//User/your-name/project-name/app/tools'
```

```
const rootPath = RootPath.create()

console.log(
  rootPath.to('app/tools/target.js')
)
// '//User/your-name/project-name/app/tools/target.js'
```

# License

This project is released under the Apache License 2.0.

For more details, please see [in the LICENSE file](./LICENSE).

# Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/mentsu-rootpath.git
cd mentsu-rootpath
npm install
npm run lint
npm test
```

# Developer

[Open Reach Tech Inc.](https://openreach.tech)

# Copyright

© 2025 Open Reach Tech Inc.
