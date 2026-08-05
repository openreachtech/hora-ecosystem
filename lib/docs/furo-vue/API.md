# API

Source: `lib/index.core.js`, `lib/index.components.js`, `lib/contexts/BaseFuroContext.js`, `lib/contexts/BaseFuroContextAccessor.js`, `lib/components/organisms/FuroToast/toast.js`, `lib/components/organisms/FuroToast/ToastQueue.js` (`types/index.d.ts` only re-exports `types/generated/index.core.d.ts` / `types/generated/index.components.d.ts`, which `vue-tsc` generates from the same JSDoc; no members are tagged `@public`, so the surface below is the natural consumer-facing surface — the pure-JS "core" pieces plus the Vue component catalog, as documented in the package's own README).

## Exports (`index.js`)

`index.js` re-exports the union of two internal barrels, unchanged:

```js
export * from './lib/index.core.js'
export * from './lib/index.components.js'
```

### Core (pure-JS) exports — `lib/index.core.js`

Loadable in a plain Node / CommonJS environment (no `.vue` files, no jsdom). Also reachable directly via `@openreachtech/furo-vue/lib/index.core.js`:

- `BaseFuroContext` (default export of `lib/contexts/BaseFuroContext.js`) — base class for a Vue component's "Context" object.
- `BaseFuroContextAccessor` (default export of `lib/contexts/BaseFuroContextAccessor.js`) — base class for a Context's companion accessor (`context.$`).
- `toast` — imperative global toast helper (object of functions). Also published at the subpath `@openreachtech/furo-vue/toast`.
- `toastQueue` — the `ToastQueue` singleton instance backing `toast`.
- `ToastQueue` (default export of `lib/components/organisms/FuroToast/ToastQueue.js`) — the class of `toastQueue`, exported so consumers can type it / construct their own.

### Component (Vue SFC) exports — `lib/index.components.js`

49 named exports, each the default export of a `.vue` single-file component. Grouped by layer (per the manifest at `public/furo-vue/components.json`):

- **Atoms:** `FuroAvatar`, `FuroBadge`, `FuroButton`, `FuroCheckbox`, `FuroEmailField`, `FuroFileField`, `FuroIcon`, `FuroNumberField`, `FuroPasswordField`, `FuroRadio`, `FuroSwitch`, `FuroTextField`, `FuroTextarea`, `FuroToggle`
- **Molecules:** `FuroAccordion`, `FuroAttachment`, `FuroAutocompleteField`, `FuroAvatarGroup`, `FuroBreadcrumb`, `FuroCollapsible`, `FuroControlBlock`, `FuroDatePicker`, `FuroDateTimePicker`, `FuroDropdownMenu`, `FuroEditableField`, `FuroEmptyState`, `FuroErrorState`, `FuroPagination`, `FuroPopover`, `FuroScrollArea`, `FuroSearchField`, `FuroSectionHeader`, `FuroSelect`, `FuroSeparator`, `FuroSkeleton`, `FuroSplitter`, `FuroTimeField`, `FuroToggleGroup`, `FuroToolBar`, `FuroTooltip`
- **Organisms:** `FuroAlertDialog`, `FuroDialog`, `FuroDrawer`, `FuroEditor`, `FuroSidebar`, `FuroStepper`, `FuroTable`, `FuroTabs`, `FuroToast`, `FuroToaster`

Per-component `props` / `parcel` keys / `events` / `slots` / `features` are not restated here — they are cataloged in full, and kept in sync by `npm run docs:manifest`, at:

- `public/furo-vue/components.json` — full JSON manifest, one entry per component.
- `public/furo-vue/llms.txt` — compact link index grouped by layer.
- `docs/COMPONENTS.md` (human catalog, GitHub only).

Every form-control component shares one contract: a `parcel` prop (reactive behavior object) plus `v-model:value`; most emit `change-value` (on input), `commit-value` (on blur/enter), and `update:value` (v-model sync) — check each component's `events` array in the manifest, since not all emit all three. Action components (e.g. `FuroButton`) emit their own typed payloads instead. Never import the underlying headless primitive (`reka-ui`, etc.) directly — only the Furo-defined `parcel`/event contract is public.

## Class: `BaseFuroContext`

Base class for a Vue component's "Context" object — the pattern every `furo-vue` component follows: `setup()` builds one `Context` instance (a subclass of `BaseFuroContext`) from `props` and the Vue `SetupContext`, and returns it to the template as `context`. Meant to be **subclassed**, not used directly; most members exist to be overridden by the subclass or invoked by it via `super`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |

- `.create({ props, componentContext })` — static factory method. Builds `reactiveHash`/`refHash`/`shallowRefHash`/`modelRefHash` via the four `.build*Hash()` hooks below, then returns `new this({ props, componentContext, reactiveHash, refHash, shallowRefHash, modelRefHash })`.
- `.get:ContextAccessor` — static getter. Returns the `BaseFuroContextAccessor` subclass to instantiate as `this.$`, or `null` (the default) if the subclass has no accessor.
- `.get:EMIT_EVENT_NAME` — static getter, meant to be overridden. Returns the event-name hash (`Record<string, string>`); default `{}`.
- `.buildReactiveHash()` / `.buildRefHash()` / `.buildShallowRefHash()` / `.buildModelRefHash()` — static methods, meant to be overridden. Each returns `{}` by default; a subclass overrides them to declare its `reactive()` / `ref()` / `shallowRef()` / `useModel()` state, which `.create()` then passes into the constructor.
- `.createMutationObserver({ handler })` — static method. Returns `new MutationObserver(handler)`.
- `#props` — instance property. The component's `props`, as passed to `setup()`.
- `#componentContext` — instance property. The Vue `SetupContext` (`{ attrs, slots, emit, expose }`), as passed to `setup()`.
- `#reactiveHash` / `#refHash` / `#shallowRefHash` / `#modelRefHash` — instance properties, set from the constructor's params (built by the static `.build*Hash()` hooks).
- `#accessor` — instance property, set in the constructor to `this.createContextAccessor()`.
- `#get:Ctor` — instance getter. `this.constructor`, typed as `typeof BaseFuroContext`.
- `#createContextAccessor()` — instance method. Returns `null` if `Ctor.ContextAccessor` is `null`; otherwise returns `Ctor.ContextAccessor.create({ context: this })`.
- `#get:$` — instance getter. The accessor instance (`this.accessor`) — the conventional access point for read-only derived values a subclass exposes to its template.
- `#get:EMIT_EVENT_NAME` — instance getter. Proxies `this.Ctor.EMIT_EVENT_NAME`.
- `#get:parcel` — instance getter. `this.props.parcel ?? null`.
- `#get:attrs` — instance getter. `this.componentContext.attrs`.
- `#get:emit` — instance getter. `this.componentContext.emit`.
- `#get:expose` — instance getter. `this.componentContext.expose`.
- `#get:slots` — instance getter. `this.componentContext.slots`.
- `#get:watch` — instance getter. Vue's `watch` function (re-exported for convenience inside subclass methods).
- `#setupComponent(args = {})` — instance method, meant to be overridden. Default implementation just `return this` (for chaining); a subclass overrides it to call `this.expose(...)`, set up `watch(...)`, etc., and should still `return this`.
- `#generateExposeHash()` — instance method, meant to be overridden. Default returns `{}`; a subclass overrides it to return the `{ name: fn }` hash passed to `expose()`.

## Class: `BaseFuroContextAccessor`

Base class for a Context's companion accessor object, reachable from a `Context` instance as `context.$` (via `BaseFuroContext#createContextAccessor()`). Meant to be subclassed alongside a `BaseFuroContext` subclass to expose read-only derived values to the template without polluting the Context's own surface.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `.staticMethod()` | static method |

- `.create({ context })` — static factory method. Returns `new this({ context })`.
- `#context` — instance property, set from the constructor. The owning `BaseFuroContext` instance.

## Class: `ToastQueue`

Imperative, reactive toast queue backing the global `toast` helper and consumed by `<FuroToaster>`. Holds the toast list and viewport config as one `reactive()` object, and bridges non-serializable `actions[].onClick` handlers to the controlled `<FuroToast>` parcel (the parcel is JSON-serializable; handlers are kept in a side table and invoked by key).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ stateReactive = this.buildStateReactive() } = {})` — static factory method. Returns `new this({ stateReactive })`.
- `.buildStateReactive()` — static method. Returns `reactive({ toasts: [], config: { ...DEFAULT_CONFIG } })`, where `DEFAULT_CONFIG` is `{ position: 'bottom-right', durationInMilliseconds: 4000, maxVisible: 3, label: 'Notifications', hotkey: null, richColors: false }`.
- `#stateReactive` — instance property. The reactive `{ toasts, config }` state.
- `#nextId` — instance property. Monotonically increasing counter used to mint toast keys, starting at `1`.
- `#actionHandlerHash` — instance property. `Record<key, Record<actionKey, onClick fn>>`, kept out of the reactive/serializable state.
- `#get:toasts` — instance getter. `this.stateReactive.toasts`.
- `#buildParcel()` — instance method. Returns `{ ...this.stateReactive.config, toasts: this.stateReactive.toasts }` — the parcel `<FuroToast>` is driven with.
- `#reserveKey()` — instance method. Returns the next toast key and increments `#nextId`.
- `#registerActions({ key, actions })` — instance method. Stores each action's `onClick` (or a no-op) in `#actionHandlerHash[key]`, keyed `action-0`, `action-1`, …, and returns the serializable `{ actionKey, label }` descriptors.
- `#addToast({ title, description, type, durationInMilliseconds, closeText, actions } = {})` — instance method. Defaults: `title = null`, `description = null`, `type = 'info'`, `durationInMilliseconds = null`, `closeText = null`, `actions = []`. Reserves a key, registers actions, appends the toast, and returns the key.
- `#updateToast({ key, patch })` — instance method. No-ops if `key` isn't found. Re-registers action handlers only if `patch.actions` is an array (otherwise keeps the existing descriptors); shallow-merges `patch` over the existing entry.
- `#removeToast({ key })` — instance method. Filters the toast out of `stateReactive.toasts` and deletes its entry from `#actionHandlerHash`.
- `#clearToasts()` — instance method. Resets `stateReactive.toasts` to `[]` and `#actionHandlerHash` to `{}`.
- `#configure(params = {})` — instance method. `Object.assign(this.stateReactive.config, params)`.
- `#invokeAction({ key, actionKey })` — instance method. Looks up `#actionHandlerHash[key]?.[actionKey]` and calls it; no-ops if not found.

## Object: `toast`

A plain object of bound convenience functions over the `toastQueue` singleton — the recommended way to trigger toasts from anywhere (client-side only; `toastQueue` is a module-level singleton, so on the server it would be shared across requests).

- `toast.show(params)` — shows a toast; `params` is the same shape as `ToastQueue#addToast`'s argument. Returns the toast key (`number`).
- `toast.hide(key)` — dismisses the toast with that key. Delegates to `toastQueue.removeToast({ key })`.
- `toast.update(key, patch)` — merges `patch` into the existing toast (e.g. to flip a `loading` toast to `success`). Delegates to `toastQueue.updateToast({ key, patch })`.
- `toast.clear()` — removes all toasts. Delegates to `toastQueue.clearToasts()`.
- `toast.configure(params)` — merges `params` into the shared viewport config (`position`, `durationInMilliseconds`, `maxVisible`, `richColors`, …). Delegates to `toastQueue.configure(params)`.

`toastQueue` itself (also exported) is the singleton instance these functions close over; import it directly only if you need `toastQueue.toasts` or another `ToastQueue` member that `toast` doesn't expose.

## Usage

Design tokens must be imported once (Nuxt `css` array or a plain `import`) before any component renders styled — see the package README for that step; it is not part of the JS API.

Rendering a component (the `parcel` + `v-model:value` contract):

```vue
<script>
import {
  FuroTextField,
  FuroControlBlock,
} from '@openreachtech/furo-vue'

export default {
  components: {
    FuroTextField,
    FuroControlBlock,
  },
}
</script>

<template>
  <FuroControlBlock :parcel="{ label: 'Email', error: context.emailError }">
    <FuroTextField
      v-model:value="form.email"
      :parcel="{ placeholder: 'you@example.com' }"
      @commit-value="context.onCommitEmail({ payload: $event })"
    />
  </FuroControlBlock>
</template>
```

Imperative toasts (mount `<FuroToaster />` once near the app root, then call `toast` from anywhere client-side):

```js
import {
  toast,
} from '@openreachtech/furo-vue/toast'

const key = toast.show({ title: 'Saving…', type: 'loading' })
// ... after the async work resolves:
toast.update(key, { type: 'success', title: 'Saved' })
```

Building a custom Furo-style component on top of `BaseFuroContext` (the pattern every shipped component follows internally — subclass `BaseFuroContext`, override the static hooks, call it from `setup()`):

```js
// MyFieldContext.js
import BaseFuroContext from '@openreachtech/furo-vue/lib/contexts/BaseFuroContext.js'

export default class MyFieldContext extends BaseFuroContext {
  static get EMIT_EVENT_NAME () {
    return {
      CHANGE_VALUE: 'change-value',
    }
  }

  onInput ({ payload }) {
    this.emit(this.EMIT_EVENT_NAME.CHANGE_VALUE, payload.target.value)
  }
}
```

```js
// MyField.vue <script>
import MyFieldContext from './MyFieldContext.js'

export default {
  props: {
    parcel: {
      type: [Object, null],
      default: null,
    },
  },
  emits: Object.values(MyFieldContext.EMIT_EVENT_NAME),
  setup (props, componentContext) {
    const context = MyFieldContext.create({ props, componentContext })

    return { context }
  },
}
```
