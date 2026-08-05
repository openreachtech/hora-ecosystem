# `@openreachtech/furo-vue`

`furo-vue` is a library that supports Vue development.

## Installation

Requires Node.js `^20.19.2` and npm `^10.9.0` (the versions the CI builds against).

```sh
npm install @openreachtech/furo-vue
```

When using GitHub Packages (the `@openreachtech` scope), the following two items are
required:

1. Add the registry to your project's `.npmrc`:

   ```
   @openreachtech:registry=https://npm.pkg.github.com
   ```

2. Authenticate with `npm login`:

   ```sh
   npm login --registry https://npm.pkg.github.com
   ```

## Getting Started

This guide takes a brand-new project (one that has never used `furo-vue`) from
zero to a rendered component. It targets **Nuxt 3** (the primary consumer
stack); plain Vue 3 + Vite differs only in how you register components (use
`app.component(...)` or per-component imports instead of a Nuxt plugin).

> **For AI agents initializing a project:** follow the numbered steps below in
> order. To pick and call components, read the machine-readable manifest at
> `node_modules/@openreachtech/furo-vue/public/furo-vue/components.json` and use
> the `furo-vue-components` skill (`skills/furo-vue-components/SKILL.md`).

### (1) Import the design tokens (required)

Every component reads CSS custom properties from a single token entry. Import it
**once** in your app. Without it, components render unstyled.

Nuxt — add it to `nuxt.config` `css`:

```js
// nuxt.config.js
export default defineNuxtConfig({
  css: [
    '@openreachtech/furo-vue/lib/assets/css/furo.css',
  ],
})
```

Plain Vue 3 — import it in your entry file:

```js
// main.js
import '@openreachtech/furo-vue/lib/assets/css/furo.css'
```

### (2) Enable light / dark theme

Tokens are defined for both themes and switch off a `data-theme` attribute on
`<html>`. Set it to `light` (default) or `dark` — component CSS responds
automatically, no media query needed.

```html
<html data-theme="light">
```

To toggle at runtime, set the attribute on `document.documentElement`:

```js
document.documentElement.setAttribute('data-theme', 'dark')
```

### (3) Render your first component

Components are named exports. Import only what you use.

```vue
<script>
import {
  FuroButton,
} from '@openreachtech/furo-vue'

export default {
  components: {
    FuroButton,
  },
}
</script>

<template>
  <FuroButton :parcel="{ variant: 'default' }">
    Create record
  </FuroButton>
</template>
```

To register components globally instead of per-file (optional), create a Nuxt
plugin:

```js
// plugins/furo-vue.js
import * as furoVue from '@openreachtech/furo-vue'

export default defineNuxtPlugin(nuxtApp => {
  Object.entries(furoVue)
    .filter(([name]) => name.startsWith('Furo'))
    .forEach(([name, component]) => {
      nuxtApp.vueApp.component(name, component)
    })
})
```

### (4) The component contract

Every form-control component shares one public surface — learn it once, it
applies everywhere:

- **Props:** `parcel` (a reactive behavior object) plus `v-model:value`.
- **Events:** most controls emit `change-value` (on input), `commit-value`
  (on blur / enter), and `update:value` (v-model sync). Not all do — read each
  component's `events` array in the manifest. Action components (e.g.
  `FuroButton`) emit their own typed payloads.
- **No primitive imports:** the public contract is Furo-defined; never import
  the underlying headless library.
- **Logic in the Context, not the template.**

```vue
<template>
  <FuroTextField
    v-model:value="form.name"
    :parcel="{ placeholder: 'Full name' }"
    @commit-value="context.onCommitName({ payload: $event })"
  />
</template>
```

### (5) Labeled form fields

Wrap any field atom in `FuroControlBlock` to add a label, hint, and error
message:

```vue
<template>
  <FuroControlBlock :parcel="{ label: 'Email', error: context.emailError }">
    <FuroEmailField
      v-model:value="form.email"
      :parcel="{ placeholder: 'you@example.com' }"
    />
  </FuroControlBlock>
</template>
```

### (6) Toasts

Mount `<FuroToaster />` once near your app root, then call the imperative
`toast` helper from anywhere (client-side only):

```vue
<template>
  <FuroToaster />
  <!-- the rest of your app -->
</template>
```

```js
import {
  toast,
} from '@openreachtech/furo-vue/toast'

toast.show({ title: 'Saved', type: 'success' })
```

### (7) Discover every component

- Human catalog (grouped by layer, with use cases): [docs/COMPONENTS.md](https://github.com/openreachtech/furo-vue/blob/main/docs/COMPONENTS.md)
- Machine-readable manifest (for AI agents and tooling): `public/furo-vue/components.json`
- llms.txt: `public/furo-vue/llms.txt`

Maintainers regenerate these from the doc registry with:

```sh
npm run docs:manifest
```

### (8) GraphQL, fetchers, and page templates (out of scope here)

`furo-vue` ships presentational atoms, molecules, and organisms only. GraphQL
launchers, fetcher/submitter adapters, and page-level templates (ListView,
DetailView, …) live in the consumer app. See
[docs/product/overview.md](https://github.com/openreachtech/furo-vue/blob/main/docs/product/overview.md)
for the scope boundary and
[docs/furo-vue/architecture.md](https://github.com/openreachtech/furo-vue/blob/main/docs/furo-vue/architecture.md)
for layer rules.

### (9) Importing logic in a Node / test environment

The main entry (`@openreachtech/furo-vue`) re-exports Vue SFCs, which a plain
Node / CommonJS test runner (e.g. Jest without a Vue transform) cannot parse.
When you only need the **pure-JS surface** — `BaseFuroContext`,
`BaseFuroContextAccessor`, the imperative `toast` helper, `toastQueue`,
`ToastQueue` — import the logic-only entry, which pulls no `.vue` files and loads
in a jsdom-free Node environment:

```js
import {
  BaseFuroContext,
} from '@openreachtech/furo-vue/lib/index.core.js'
```

Component (`.vue`) tests still go through the full entry under a jsdom + Vue
transform.

## Using with Claude (AI agents)

`furo-vue` ships machine-readable docs so an AI agent (Claude Code, Cursor, etc.)
can scaffold components correctly without guessing the API. After install they
live inside the package:

- `node_modules/@openreachtech/furo-vue/public/furo-vue/llms.txt` — a compact,
  link-based index of every component grouped by layer.
- `node_modules/@openreachtech/furo-vue/public/furo-vue/components.json` — the
  full manifest: for each component its `import` path, `props`, `parcel` keys,
  `events`, `slots`, and `features`.

### Point Claude Code at the manifest

Add a pointer in your project's `CLAUDE.md` (or `AGENTS.md`) so the agent reads
the contract before writing furo-vue code:

```markdown
## furo-vue component library

When building UI with `@openreachtech/furo-vue`, follow its machine-readable contract:

- Index: `node_modules/@openreachtech/furo-vue/public/furo-vue/llms.txt`
- Full API manifest: `node_modules/@openreachtech/furo-vue/public/furo-vue/components.json`

Contract for every component: pass a reactive `parcel` object plus `v-model:value`,
listen to Furo emits (`change-value`, `commit-value`, `update:value`), and use the
documented slots. Do not reach into the underlying headless primitive.
```

### Ask Claude to load it on demand

In a Claude Code session you can also just say:

> Read `node_modules/@openreachtech/furo-vue/public/furo-vue/components.json` and
> build a login form using FuroTextField, FuroPasswordField, and FuroButton.

The manifest is regenerated from the doc registry by maintainers with
`npm run docs:manifest`, so it always matches the shipped components.

### Add the furo-vue skill (Claude Code)

The repo ships a Claude Code skill, `furo-vue-components`, that routes a request
("which component for X") to the right component and its contract via the
manifest. The skill is **not** in the npm package, so copy it from the repo into
your project's `.claude/skills/`:

```sh
# from a checkout of furo-vue
cp -R skills/furo-vue-components <your-project>/.claude/skills/

# or fetch just the skill file from GitHub
mkdir -p .claude/skills/furo-vue-components
curl -fsSL https://raw.githubusercontent.com/openreachtech/furo-vue/main/skills/furo-vue-components/SKILL.md \
  -o .claude/skills/furo-vue-components/SKILL.md
```

Claude Code auto-discovers skills under `.claude/skills/`. Once copied, ask
Claude to build UI and it invokes the skill, loads the manifest, and calls
components with the correct `parcel` + `v-model:value` + emits contract.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/furo-vue.git
cd furo-vue
npm install
npm run lint
npm test
```

## License

This project is released under the MIT License.

For more details, please see [in the LICENSE file](./LICENSE).

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
