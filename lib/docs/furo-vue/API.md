# API

Package: `@openreachtech/furo-vue` 2.0.1 (Vue 3 components and helpers built on the `parcel` + Context pattern).

Source: `types/index.d.ts` (re-exports `types/generated/index.core.d.ts` and `types/generated/index.components.d.ts`), the `types` targets named in the `exports` map of `package.json` (`./toast`, `./icons`, `./icon-renderers`), and the per-component `*Context.d.ts` / `*EmitPayload.d.ts` files under `types/generated/`. Two facts are not in any declaration and come from files shipped in the same package: slot names of components that declare no `*Slots` type (marked "slots (manifest)", from `public/furo-vue/components.json`), and the event names of `FuroEditor` (declared only as `string`, taken from the same manifest). The `./nuxt` subpath ships no declaration, so its entry below is unconfirmed by a type file.

## Import paths (`exports` map)

- `@openreachtech/furo-vue`: 57 exports (7 core, 50 components), listed in the two sections below.
- `@openreachtech/furo-vue/toast`: 2 exports, `toast`, `toastQueue`.
- `@openreachtech/furo-vue/icons`: 1 export, `furoIconRegistry`.
- `@openreachtech/furo-vue/icon-renderers`: 1 export, `createIconifyRenderer`.
- `@openreachtech/furo-vue/nuxt`: default export is a Nuxt module (no declaration file).
- `@openreachtech/furo-vue/lib/<path>.js` and `@openreachtech/furo-vue/lib/<path>.vue`: wildcard subpaths. Types resolve to `types/generated/<path>.d.ts` and `types/generated/<path>.vue.d.ts`. They reach every internal file (for example `lib/contexts/BaseFuroContext.js`, `lib/emit-payload/BaseEmitPayload.js`, `lib/tools/TimerClerk.js`, each component's `*Context.js` and `*EmitPayload.js`).
- `@openreachtech/furo-vue/*`: maps to the raw file at that path.

Notation for member lists below.

| notation | meaning |
| :-- | :-- |
| `#name` | instance property, getter or method |
| `#get:name` | instance getter |
| `.name()` | static method |
| `.get:name` | static getter |

## Core exports of `@openreachtech/furo-vue`

- `BaseFuroContext`: base class of every component Context. Section "Class: BaseFuroContext".
- `BaseFuroContextAccessor`: base class of a Context's accessor (`context.$`). Section "Class: BaseFuroContextAccessor".
- `ToastQueue`: class behind `toast`. Section "Class: ToastQueue".
- `toast`, `toastQueue`: imperative toast helper and its queue instance (also under `./toast`). Section "Toast helper".
- `FuroIconRegistry`: class of the icon registry. Section "Class: FuroIconRegistry".
- `furoIconRegistry`: the shared registry instance (also under `./icons`). Section "Class: FuroIconRegistry".

## Component exports of `@openreachtech/furo-vue`

Each is the default export of a `.vue` file, imported by name from the package root. The declaration of each is a Vue `DefineComponent` exposing `context` (its Context instance) from `setup()`.

- Atoms (14): `FuroAvatar`, `FuroBadge`, `FuroButton`, `FuroCheckbox`, `FuroEmailField`, `FuroFileField`, `FuroIcon`, `FuroNumberField`, `FuroPasswordField`, `FuroRadio`, `FuroSwitch`, `FuroTextField`, `FuroTextarea`, `FuroToggle`
- Molecules (26): `FuroAccordion`, `FuroAttachment`, `FuroAutocompleteField`, `FuroAvatarGroup`, `FuroBreadcrumb`, `FuroCollapsible`, `FuroControlBlock`, `FuroDatePicker`, `FuroDateTimePicker`, `FuroDropdownMenu`, `FuroEditableField`, `FuroEmptyState`, `FuroErrorState`, `FuroPagination`, `FuroPopover`, `FuroScrollArea`, `FuroSearchField`, `FuroSectionHeader`, `FuroSelect`, `FuroSeparator`, `FuroSkeleton`, `FuroSplitter`, `FuroTimeField`, `FuroToggleGroup`, `FuroToolBar`, `FuroTooltip`
- Organisms (10): `FuroAlertDialog`, `FuroDialog`, `FuroDrawer`, `FuroEditor`, `FuroSidebar`, `FuroStepper`, `FuroTable`, `FuroTabs`, `FuroToast`, `FuroToaster`

Shared contract of all components:

- The main input is a `parcel` prop (an object; `null` or omitted is allowed except where the declaration types it `FuroXParcel | null` without `?`). A component never takes its state as separate props, except the extra `*Parcel` props named per component.
- Form controls bind with `v-model:value` (event `update:value`). Most also emit `change-value` (on input) and `commit-value` (on blur or enter) with an emit payload object. Overlay components use `open` in the parcel plus `open:change`, and the dialog-like ones also emit `update:open` (each entry below lists its events).
- Components whose `Props` type includes `import("vue").HTMLAttributes` (or `InputHTMLAttributes`, `TextareaHTMLAttributes`) also accept those native attributes, which fall through to the root element.
- Payload classes extend `BaseEmitPayload` (section below) and add the members listed per component.

## Class: BaseFuroContext

`BaseFuroContext<A, P, EE>` with `A extends typeof BaseFuroContextAccessor<*> | null = null`, `P extends ComponentCustomProps = {}`, `EE extends string | null = null`. A subclass is the "Context" of one component: `setup()` calls `.create({ props, componentContext })` and returns the instance to the template as `context`. Subclass it, overriding the static hooks.

- `.create({ props, componentContext })`: static factory. Param type `BaseFuroContextFactoryParams<{}>`. Returns `InstanceType<T>` (`this`-typed).
- `.get:ContextAccessor`: returns `typeof BaseFuroContextAccessor<*> | null`. Override to attach an accessor.
- `.get:EMIT_EVENT_NAME`: returns `Record<string, string>`. Override to declare event names.
- `.buildReactiveHash()`: returns `Record<string, Reactive<*>>`.
- `.buildRefHash()`: returns `Record<string, Ref<*>>`.
- `.buildShallowRefHash()`: returns `Record<string, ShallowRef<*>>`.
- `.buildModelRefHash()`: returns `Record<string, ModelRef<*>>`.
- `.createMutationObserver({ handler })`: `handler: MutationCallback`, returns `MutationObserver`.
- `constructor({ props, componentContext, reactiveHash, refHash, shallowRefHash, modelRefHash })`: param type `BaseFuroContextParams<P>` (`props: P & { parcel?: any }`, `componentContext: SetupContext<EE>`, the four hashes optional).
- `#props`: `P & { parcel?: any }`.
- `#componentContext`: `{ attrs, slots, emit, expose }`.
- `#reactiveHash`, `#refHash`, `#shallowRefHash`, `#modelRefHash`: the hashes passed to the constructor.
- `#accessor`: `BaseFuroContextAccessor<*>`.
- `#get:Ctor`: `typeof BaseFuroContext<*, *, *>`.
- `#createContextAccessor()`: returns `BaseFuroContextAccessor<*> | null`.
- `#get:$`: `InstanceType<A>`, the accessor instance.
- `#get:EMIT_EVENT_NAME`: `Record<string, EE>`.
- `#get:parcel`: `P['parcel'] | null`.
- `#get:attrs`: Vue `SetupContext['attrs']`.
- `#get:emit`: `(event: EE, ...args: Array<any>) => void`.
- `#get:expose`: Vue `SetupContext['expose']`.
- `#get:slots`: Vue `SetupContext['slots']`.
- `#get:watch`: Vue `watch`.
- `#hasBooleanAttribute({ name })`: `name: string`, returns `boolean`. True for any present fallthrough attribute value except `false` and absent (a bare attribute `''` and `0` count as on).
- `#setupComponent(args?)`: `args?: object`, returns `this` (for chaining). Override to call `expose` and `watch`.
- `#generateExposeHash()`: returns `Record<string, Function>`, the hash given to `expose()`.

## Class: BaseFuroContextAccessor

`BaseFuroContextAccessor<C extends BaseFuroContext<*>>`. Companion of a Context, reached as `context.$`.

- `.create({ context })`: static factory, param type `BaseFuroContextAccessorFactoryParams`, returns `InstanceType<T>`.
- `constructor({ context })`: param type `BaseFuroContextAccessorParams<C>` (`{ context: C }`).
- `#context`: the owning Context, typed `C`.

## Class: BaseEmitPayload (via `lib/emit-payload/BaseEmitPayload.js`)

`BaseEmitPayload<E extends Event = Event, C extends HTMLElement = HTMLElement>`. Parent of every component emit payload.

- `.create({ rawEvent })`: static factory, returns `InstanceType<T>`.
- `constructor({ rawEvent })`.
- `#rawEvent`: `E`.
- `#get:controlElement`: `C | null`.
- `#getElementAttribute({ key })`: `key: string`, returns `string | null`.
- `#parseStringAsNumber({ stringValue })`: `stringValue: string | null`, returns `number | null`.

## Class: TimerClerk (via `lib/tools/TimerClerk.js`)

- `.create({ onTick, timeInMilliseconds })`: `onTick: Function`, `timeInMilliseconds: number`, returns `InstanceType<T>`.
- `constructor({ onTick, timeInMilliseconds })`.
- `#onTick`, `#timeInMilliseconds`, `#lastTimer`: constructor values and the last timer handle.
- `#startTimer(...args)`: `args: Array<any>`, returns `void`.
- `#stopTimer()`: returns `void`.

## Toast helper (`toast`, `toastQueue`, import from the root or `/toast`)

- `toast.show(params?)`: `params?: { title?: string | null, description?: string | null, type?: string, durationInMilliseconds?: number | null, closeText?: string | null, actions?: Array<{ label: string, onClick?: () => void }> }`. Returns `number` (the toast key).
- `toast.hide(key)`: `key: number | string`, returns `void`.
- `toast.update(key, patch)`: `key: number | string`, `patch: object`, returns `void`.
- `toast.clear()`: returns `void`.
- `toast.configure(params?)`: `params?: ToastConfig`, returns `void`.
- `toastQueue`: the shared `ToastQueue` instance. Mount `<FuroToaster />` once so queued toasts render.

Types in `ToastQueue.d.ts`:

- `QueuedToast`: `{ key: number | string, title: string | null, description: string | null, type: string, durationInMilliseconds: number | null, closeText: string | null, actions: Array<{ actionKey: string, label: string }> }`.
- `ToastConfig`: `Omit<ToastParcel, "toasts">`, that is `label`, `position`, `swipeDirection`, `hotkey`, `durationInMilliseconds`, `maxVisible`, `richColors` (see `FuroToast`).
- `ToastQueueState`: `Reactive<{ toasts: Array<QueuedToast>, config: ToastConfig }>`.

Usage:

```js
import { toast } from '@openreachtech/furo-vue/toast'

const key = toast.show({ title: 'Saving', type: 'loading' })
toast.update(key, { type: 'success', title: 'Saved' })
```

## Class: ToastQueue

Reactive queue behind `toast`, consumed by `<FuroToaster>`. Keeps action handlers outside the serializable state.

- `.create({ stateReactive }?)`: `stateReactive?: ToastQueueState`, returns `ToastQueue`.
- `.resolveSharedInstance()`: returns `ToastQueue`, the one queue shared by every copy of the module in the realm.
- `.buildStateReactive()`: returns `ToastQueueState`.
- `constructor({ stateReactive })`.
- `#stateReactive`: `{ toasts, config }` state.
- `#nextId`: `number`.
- `#actionHandlerHash`: `Record<string, Record<string, () => void>>`.
- `#get:toasts`: `Array<QueuedToast>`.
- `#buildParcel()`: returns `object`, the parcel for `<FuroToast>`.
- `#reserveKey()`: returns `number`.
- `#registerActions({ key, actions })`: `key: number | string`, `actions: Array<{ label: string, onClick?: () => void }>`, returns `Array<{ actionKey: string, label: string }>`.
- `#addToast(params?)`: same param shape as `toast.show`, returns `number`.
- `#updateToast({ key, patch })`: `patch: Partial<QueuedToast>`, returns `void`.
- `#removeToast({ key })`: returns `void`.
- `#clearToasts()`: returns `void`.
- `#configure(params?)`: `params?: ToastConfig`, returns `void`.
- `#invokeAction({ key, actionKey })`: `actionKey: string`, returns `void`.

## Class: FuroIconRegistry

Registry of every icon name `<FuroIcon>` can draw. Drawing is offline, so a name must be registered (or answered by a resolver) to render. `furoIconRegistry` (root export and `/icons`) is the shared instance with the library's own icons registered; register application icons at start-up.

- `.create({ stateReactive, iconStorage }?)`: both optional, returns `FuroIconRegistry`.
- `.resolveSharedInstance()`: returns the registry shared by every copy of the module in the realm.
- `.createSharedInstance()`: returns a registry with the library's icons registered.
- `.buildStateReactive()`: returns `FuroIconRegistryState`.
- `.createIconStorage()`: returns `IconStorage`.
- `.buildStorableIconSet({ iconSet })`, `.extractIconSetPrefix({ iconSet })`, `.generateStoragePrefix({ iconSet })`, `.extractIconSetNames({ iconSet })`, `.isStorableIconSet({ iconSet })`: set helpers (`iconSet: IconSet`), returning `IconSet`, `string`, `string`, `Array<string>`, `boolean`.
- `.hasNumericDimensions({ shape, propertyNames })`: returns `boolean`.
- `.isDrawableIcon({ icon })`: `icon: IconShape`, returns `boolean`.
- `.hasIconSetEntry({ iconSet, name })`: returns `boolean`.
- `.buildStorableRenderer({ component })`: `component: IconRenderer | null`, returns `IconRenderer | null`.
- `.createOfflineRenderer()`: returns a Vue `Component`.
- `constructor({ stateReactive, iconStorage })`.
- `#stateReactive`, `#iconStorage`, `#get:Ctor`.
- `#registerIconSet({ iconSet })`: registers a whole set, returns `FuroIconRegistry`.
- `#registerIcon({ name, icon })`: `name: string` (prefix included), `icon: IconShape`, returns `FuroIconRegistry`.
- `#recordNames({ names })`: `names: Array<string>`, returns `FuroIconRegistry`.
- `#useIconResolver({ resolver })`: `resolver: IconResolver | null`, returns `FuroIconRegistry`.
- `#useIconRenderer({ component })`: `component: IconRenderer | null` (`null` uninstalls), returns `FuroIconRegistry`.
- `#hasIconRenderer()`: `boolean`. `#extractIconRenderer()`: `IconRenderer | null`. `#extractOfflineRenderer()`: `Component`.
- `#hasIcon({ name })`, `#hasRegisteredIcon({ name })`: `name: string | null`, return `boolean`.
- `#findRenderableIcon({ name })`: returns `string | IconShape | null`.
- `#resolveIcon({ name })`: `name: string`, returns `IconShape | null`.

Types: `IconShape = { body: string, width?: number, height?: number, [key]: any }`; `IconSet = { prefix?: string, width?: number, height?: number, icons: Record<string, IconShape>, aliases?: Record<string, any>, [key]: any }`; `IconResolver = ({ name }) => IconShape | null`; `IconRenderer = Component | string`; `IconStorage = { registerSet(iconSet, storagePrefix), registerIcon(name, icon) }`; `FuroIconRegistryState = Reactive<{ registeredNames: Set<string>, resolver: IconResolver | null, renderer: IconRenderer | null }>`.

`@openreachtech/furo-vue/icon-renderers`:

- `createIconifyRenderer()`: returns a Vue `Component` that draws any name in the icon catalogue. Install it with `furoIconRegistry.useIconRenderer({ component })`.

`@openreachtech/furo-vue/nuxt` (no declaration, read from `nuxt/index.js`, unconfirmed by types):

- default export: a Nuxt module. `meta.name` is `@openreachtech/furo-vue`, `configKey` is `furoVue`, option `iconComponentName: string | null` (default `null`). When `@nuxt/icon` is not yet a module of the app, it installs that module from the app's own dependencies, and throws an `Error` when the package is not installed. It adds a plugin that makes the app's icon component the renderer for names the registry lacks.

`types/furo-nuxt.d.ts` (reachable only as a raw file) declares a global `furo` namespace with `GraphqlClient`, `FormClerk`, `GraphqlConfig`, `Share`, `GraphqlShare`. It is not re-exported from `types/index.d.ts` and imports files outside `types/`, so treat it as unconfirmed.

## Components

Format per component: Props (the `parcel` keys and extra props), Events (name and payload), Slots. "Payload members" are the extra members of the payload class on top of `BaseEmitPayload`. Unless stated, `parcel` is optional and `Props` has only `parcel`.

### Atoms

- `FuroAvatar`
  - `parcel` (required key, nullable): `{ imageSource?: string, imageAlternativeText?: string, fallbackText?: string, fallbackDelay?: number, shape?: "circle" | "square" }`
  - Events: none. Slots (manifest): `fallback`.
- `FuroBadge`
  - `parcel` (nullable): `{ label?: string, count?: number, shape?: "text" | "count" | "state" | "dot", tone?: "accent" | "neutral" | "success" | "warning" | "error", emphasis?: "solid" | "subtle" | "outline", size?: "large" | "medium" | "small" }`
  - Events: none. Slots (manifest): `default { text }`.
- `FuroButton`
  - `parcel`: `{ variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link", size?: "default" | "sm" | "lg" | "icon", disabled?: boolean, loading?: boolean, asChild?: boolean, type?: "button" | "submit" | "reset" }`
  - Events: `click` (`ButtonEmitPayload`; payload members: `isDefaultPrevented(): boolean`).
  - Slots: `default`, `loading`.
- `FuroCheckbox`
  - `parcel`: `{ value?: boolean, indeterminate?: boolean, invalid?: boolean, disabled?: boolean, required?: boolean, size?: string }`
  - Events: `change-value` (`CheckboxEmitPayload`), `update:value` (`boolean`), `update:indeterminate` (`boolean`).
  - Payload members: `eventDetail`, `value: boolean | null`, `indeterminate: boolean`, `isIndeterminate()`, `isChecked()`, `isUnchecked()`.
  - Slots (manifest): `indicator`, `indeterminate-indicator`.
- `FuroEmailField`
  - Props: `Omit<InputHTMLAttributes, "type">` and `parcel`. `parcel`: `{ value?: string | null, invalid?: boolean }`
  - Events: `change-value`, `commit-value` (`EmailFieldEmitPayload`), `update:value` (`string | null`).
  - Payload members: `value: string | null`, `extractTrimmedValue()`, `hasEmptyText()`, `hasEmptyTrimmedText()`, `hasEnteredText()`, `hasEnteredTrimmedText()`.
  - Slots: none declared.
- `FuroFileField`
  - Props: `Omit<InputHTMLAttributes, "type">` and `parcel`. `parcel`: `{ invalid?: boolean }`
  - Events: `change-value` (`FileFieldEmitPayload`; members: `files`, `firstFile: File | null`, `isMultiple()`, `extractFiles(): Array<File>`, `hasEmptySelection()`, `hasSelectedFiles()`).
- `FuroIcon`
  - Props (not a parcel): `{ name: string, size?: string | number | null }`. `name` includes the collection prefix (for example `ph:check`); it must be registered in `furoIconRegistry` or answered by a resolver or renderer.
  - Events and slots: none.
- `FuroNumberField`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `Omit<reka-ui NumberFieldRootProps, "modelValue" | "defaultValue"> & { value?: number | null, invalid?: boolean, inputParcel?: (NumberFieldInputProps & InputHTMLAttributes) | null, decrementParcel?: NumberFieldDecrementProps | null, incrementParcel?: NumberFieldIncrementProps | null }`
  - Events: `change-value`, `commit-value` (`NumberFieldEmitPayload`), `update:value` (`number | null`).
  - Payload members: `eventDetail`, `value: number | null`, `hasEmptyValue()`, `hasEnteredValue()`, `extractMinValueAttribute()`, `extractMaxValueAttribute()`, `isGreaterThanOrEqualMin()`, `isLessThanOrEqualMax()`, `isWithinRange()`.
  - Slots: `increment { value: number }`, `decrement { value: number }`.
- `FuroPasswordField`
  - Props: `Omit<InputHTMLAttributes, "type">` and `parcel`. `parcel`: `{ value?: string | null, invalid?: boolean }`
  - Events: `change-value`, `commit-value` (`PasswordFieldEmitPayload`, same members as the email payload), `update:value` (declared with `PasswordFieldEmitPayload`, while the source emits `payload.value`, a `string | null`).
- `FuroRadio`
  - `parcel`: `{ value?: string | number | null, options?: Array<{ label: string, value: string | number, disabled?: boolean }>, invalid?: boolean, disabled?: boolean, required?: boolean, size?: string }`
  - Events: `change-value` (`RadioEmitPayload`; members: `eventDetail`, `value`, `isSelected()`), `update:value` (`string | number | null`).
  - Slots (manifest): `option-label { option }`.
- `FuroSwitch`
  - `parcel`: `{ value?: boolean, size?: "medium" | "small", disabled?: boolean, required?: boolean }`
  - Events: `change-value` (`SwitchEmitPayload`; members: `eventDetail`, `value`, `isChecked()`, `isUnchecked()`), `update:value` (`boolean`).
- `FuroTextField`
  - Props: `Omit<InputHTMLAttributes, "type">` and `parcel`. `parcel`: `{ value?: string | number | null, invalid?: boolean }`
  - Events: `change-value`, `commit-value` (`TextFieldEmitPayload`), `update:value` (declared with `TextFieldEmitPayload`, while the source emits `payload.value`, a `string | null`).
  - Payload members: `value: string | null`, `trimmedValue: string | null`, `extractTrimmedValue()`, `hasEmptyText()`, `hasEmptyTrimmedText()`, `hasEnteredText()`, `hasEnteredTrimmedText()`.
- `FuroTextarea`
  - Props: `TextareaHTMLAttributes` and `parcel`. `parcel`: `{ value?: string | null, invalid?: boolean }`
  - Events: `change-value`, `commit-value` (`TextareaEmitPayload`, same members as the text field payload), `update:value` (`string | null`).
- `FuroToggle`
  - `parcel`: `{ value?: boolean, variant?: "default" | "outline", size?: "default" | "sm" | "lg", disabled?: boolean }`
  - Events: `change-value` (`ToggleEmitPayload`; members: `eventDetail`, `value`, `isPressed()`, `isReleased()`), `update:value` (`boolean`).
  - Slots (manifest): `default { pressed }`.

### Molecules

- `FuroAccordion`
  - `parcel`: `{ value?: string | Array<string> | null, selectionMode?: "single" | "multiple", options?: Array<{ value: string, label?: string, disabled?: boolean }>, collapsible?: boolean, disabled?: boolean, orientation?: "vertical" | "horizontal" }`
  - Events: `change-value` (`AccordionEmitPayload`; members: `eventDetail`, `value`, `isExpanded({ value })`), `update:value` (`string | Array<string> | null`).
  - Slots (manifest): `header { option, expanded }`, `content { option, expanded }`.
- `FuroAttachment`
  - `parcel` (nullable): `{ fileName?: string, fileSize?: string, imageSource?: string, imageAlternativeText?: string, iconName?: string, uploading?: boolean, uploadProgress?: number | null, downloadable?: boolean, removable?: boolean, downloadLabel?: string, removeLabel?: string, uploadingLabel?: string }`
  - Events: `download`, `remove`, payload `{ fileName: string }`.
  - Slots: `glyph`, `actions`.
- `FuroAutocompleteField`
  - Props: `HTMLAttributes`, `parcel`, `inputParcel?: Omit<InputHTMLAttributes, "placeholder" | "value"> | null`.
  - `parcel`: `{ value?: FuroAutocompleteOption | Array<FuroAutocompleteOption> | FuroAcceptableValue | Array<FuroAcceptableValue> | null, options?: Array<FuroAutocompleteOption | FuroAcceptableValue>, optionLabel?: string | ((option) => string), optionValue?: string | ((option) => FuroAcceptableValue), placeholder?: string | null, loading?: boolean, invalid?: boolean, disabled?: boolean, textDirection?: "toRight" | "toLeft", multiple?: boolean, showClear?: boolean, searchKeyword?: string, localCompare?: boolean, debounceMilliseconds?: number, open?: boolean, openOnClick?: boolean, showSelectAll?: boolean, selectAllText?: string, emptyText?: string, creatable?: boolean, createOptionText?: string, maxVisibleChips?: number, chipOverflow?: "wrap" | "ellipsis" }`
  - Types: `FuroAcceptableValue = string | number | bigint | Record<string, any> | null`; `FuroAutocompleteOption = { label: string, value: FuroAcceptableValue, disabled?: boolean, icon?: { name: string, size?: string, style?, class? }, indicatorIcon?: same, separator?: boolean, options?: Array<FuroAutocompleteOption | FuroAcceptableValue>, [key]: any }` (group entries carry `options`).
  - Events: `change-value`, `commit-value`, `create-option` (`AutocompleteEmitPayload`), `update:value` (`FuroAutocompleteOption | null`), `update:search-keyword` (`string`), `search-keyword` (`{ searchKeyword: string }`), `update:open` (`boolean`).
  - Payload members: `eventDetail`, `searchKeyword`, `selectedOption`, `selectedIndex`, `selectedOptions`, `selectedGroupIndex`, `extractValue({ option }?)`, `extractValues()`, `hasEmptyValue()`, `hasSelectedValue()`, `extractTrimmedSearchKeyword()`, `matchesOption({ value }?)`.
  - Slots: `trigger-content`, `trigger-left`, `trigger-right`, `cancel`, `content-before`, `content-after`, `select-all { checked, indeterminate, disabled }`, `create-option { searchKeyword }`, `group { group, groupIndex }`, `group-label { group, groupIndex }`, `option { option, optionIndex, group?, groupIndex? }`, `option-text { option, optionIndex }`, `option-indicator { option, optionIndex }`, `separator { option, optionIndex }`, `empty { searchKeyword, loading }`, `loading { searchKeyword }`.
- `FuroAvatarGroup`
  - `parcel` (nullable): `{ avatars?: Array<{ imageSource?: string, imageAlternativeText?: string, fallbackText?: string }>, maxVisibleAvatars?: number, spacing?: "wide" | "narrow", size?: string }`
  - Events: none. Slots (manifest): `overflow { avatars, count }`.
- `FuroBreadcrumb`
  - `parcel` (nullable): `{ items?: Array<{ label: string, href?: string, disabled?: boolean }>, maxVisibleItems?: number }`
  - Events: none. Slots (manifest): `crumb { crumb }`, `overflow { items }`, `separator`.
- `FuroCollapsible`
  - `parcel`: `{ value?: boolean, disabled?: boolean }`
  - Events: `change-value` (`CollapsibleEmitPayload`; members: `eventDetail`, `value: boolean`, `isOpen()`), `update:value` (`boolean`).
  - Slots (manifest): `trigger { open }`, `default { open }`.
- `FuroControlBlock`
  - `parcel` (nullable): `{ label?: string | null, controlId?: string | null, errorMessages?: Array<string>, required?: boolean, orientation?: "vertical" | "horizontal" }`
  - Events: none. Slots (manifest): `default` (the control).
- `FuroDatePicker`
  - Props: `HTMLAttributes`, `parcel`, `triggerParcel?: Record<string, unknown> | null`, `contentParcel?: Record<string, unknown> | null`. `parcel`: `Record<string, unknown> & { value?: string | null, invalid?: boolean, placeholder?: string | null, disabled?: boolean, minValue?: string | null, maxValue?: string | null, displayFormat?: string | null, timezone?: string | null, closeOnSelect?: boolean | null, preventDeselect?: boolean | null, locale?: string | null, todayButtonText?: string | null, clearButtonText?: string | null }`
  - Events: `change-value`, `commit-value` (`DatePickerEmitPayload`; members: `eventDetail`, `value: string | null`, `hasEmptyValue()`, `hasValue()`), `update:value` (`string | null`).
  - Slots (manifest): `trigger-icon`, `prev-icon`, `next-icon`, `field-suffix`, `content-footer`.
- `FuroDateTimePicker`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `Record<string, unknown> & { value?: string | null, invalid?: boolean, placeholder?: string | null, disabled?: boolean, minValue?: string | null, maxValue?: string | null, timezone?: string | null, granularity?: "hour" | "minute" | "second" | null, step?: number | null, timeFormat?: number | null }`
  - Events: `change-value`, `commit-value` (`DateTimePickerEmitPayload`; members: `eventDetail`, `value`, `datePart`, `timePart` (all `string | null`), `hasEmptyValue()`, `hasValue()`), `update:value` (`string | null`).
- `FuroDropdownMenu`
  - Props: `HTMLAttributes`, `parcel`, `triggerParcel?: FuroButtonParcel | null`. `parcel`: `{ open?: boolean, disabled?: boolean, side?: "top" | "right" | "bottom" | "left", align?: "start" | "center" | "end", sideOffset?: number, preventCloseAutoFocus?: boolean, options?: Array<FuroDropdownMenuOption> }`
  - `FuroDropdownMenuOption = { label?: string, value?: string, disabled?: boolean, separator?: boolean, variant?: "default" | "destructive", type?: "action" | "checkbox" | "submenu", checked?: boolean, keepOpen?: boolean, options?: Array<FuroDropdownMenuOption> }`
  - Events: `open:change` (`{ open: boolean }`), `option:select` (`DropdownMenuOptionSelectEmitPayload`; members: `option: FuroDropdownMenuOption`, `isDefaultPrevented()`), `option:checked-change` (`{ option, checked: boolean }`).
  - Slots: `trigger`, `default`, `option-label { option, index }`.
- `FuroEditableField`
  - `parcel` (`& Attrs`, nullable): `{ value?: any, invalid?: boolean, disabled?: boolean, required?: boolean, readonly?: boolean, placeholder?: string, emptyPreviewText?: string, showActions?: boolean, showEditing?: boolean, showUndoChange?: boolean, submitMode?: "blur" | "enter" | "both" | "none", activationMode?: "dblclick" | "focus" | "none", collisionBoundary?: Ref<HTMLElement | null> | HTMLElement | null, editLabel?: string, undoLabel?: string, submitLabel?: string, cancelLabel?: string }`
  - Events: `commit-value` (`EditableEmitPayload`; members: `eventDetail`, `value`, `hasEmptyValue()`), `update-editing-state` (`"cancel" | "submit" | "edit"`).
  - Slots, all scoped with the same props `{ isEditing, modelValue, isEmpty, submit, committedValue, draftValue, updateDraftValue({ value }) }`: `preview`, `editor`, `edit-trigger`, `submit-trigger`, `cancel-trigger`, `undo-trigger`.
- `FuroEmptyState`
  - `parcel` (nullable): `{ title?: string, description?: string }`. Events: none. Slots (manifest): `icon`, `action`.
- `FuroErrorState`
  - `parcel` (nullable): `{ title?: string, description?: string }`. Events: none. Slots (manifest): `icon`, `action`.
- `FuroPagination`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ page?: number | null, offset?: number | null, limit?: number, totalRecords?: number, siblingCount?: number, showEdges?: boolean, disabled?: boolean }`
  - Events: `page:change` (`{ page: number, offset: number, limit: number }`), `update:page` (`number`).
  - Slots: `previous`, `next`, `ellipsis`, `page { page }`.
- `FuroPopover`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ side?: "top" | "right" | "bottom" | "left", align?: "start" | "center" | "end", sideOffset?: number, disabled?: boolean, modal?: boolean, open?: boolean | null }`
  - Events: `open:change` (`{ open: boolean }`). Slots: `trigger`, `content`.
- `FuroScrollArea`
  - `parcel` (nullable): `{ orientation?: "vertical" | "horizontal" | "both", scrollbarVisibility?: "hover" | "scroll" | "glimpse" | "auto" | "always", scrollHideDelay?: number }`
  - Events: none. Slots (manifest): `default`.
- `FuroSearchField`
  - `parcel` (nullable): `{ value?: string | number | null, invalid?: boolean }`
  - Events: `change-value`, `commit-value` (`TextFieldEmitPayload`, the same class as `FuroTextField`), `update:value` (`string | null`).
  - Slots (manifest): `icon`, `trailing`.
- `FuroSectionHeader`
  - `parcel` (nullable): `{ title?: string, headingLevel?: number, size?: "large" | "medium", divided?: boolean }`
  - Events: none. Slots (manifest): `leading`, `title`, `actions`.
- `FuroSelect`
  - Props: `HTMLAttributes`, `parcel`, `triggerParcel?: reka-ui SelectTriggerProps | null`, `portalParcel?: reka-ui SelectPortalProps | null`, `contentParcel?: reka-ui SelectContentProps | null`. `parcel`: `reka-ui SelectRootProps & Record<string, unknown> & { placeholder?: string | null, loading?: boolean, invalid?: boolean, textDirection?: "toRight" | "toLeft", options?: Array<FuroSelectOption>, optionLabel?: string | ((option) => string), optionValue?: string | ((option) => FuroSelectValue) }`
  - Types: `FuroSelectValue = string | number | bigint | Record<string, unknown> | null`; `FuroSelectOption = reka-ui (SelectItemProps & SelectItemTextProps & SelectItemIndicatorProps) & { label: string | null, value: FuroSelectValue, disabled?: boolean, separator?: boolean, options?: Array<FuroSelectOption> | null, [key]: any }`.
  - Events: `change-value`, `commit-value` (`SelectEmitPayload`), `update:value` (`FuroSelectValue | Array<FuroSelectValue> | null`).
  - Payload members: `eventDetail`, `value`, `values`, `selectedOption`, `selectedIndex`, `selectedOptions`, `selectedIndices`, `hasEmptyValue()`, `hasSelectedValue()`, `matchesOption({ value })`.
  - Slots: `trigger-content`, `trigger-text`, `trigger-icon`, `trigger-loading-icon`, `scroll-up-button`, `scroll-down-button`, `content-before`, `content-after`, `group { group, groupIndex }`, `group-label { group, groupIndex }`, `option { option, optionIndex, group?, groupIndex? }`, `option-text { option, optionIndex }`, `option-indicator { option, optionIndex }`, `separator { option, optionIndex }`, `empty { loading }`.
- `FuroSeparator`
  - `parcel` (nullable): `{ orientation?: "horizontal" | "vertical", decorative?: boolean }`. Events and slots: none.
- `FuroSkeleton`
  - `parcel` (nullable): `{ variant?: "text" | "circle" | "rectangle", width?: string, height?: string, animated?: boolean }`. Events and slots: none.
- `FuroSplitter`
  - `parcel`: `{ orientation?: "horizontal" | "vertical", appearance?: "default" | "plain", panels?: Array<{ id?: string, defaultSize?: number, minSize?: number, maxSize?: number, collapsible?: boolean, collapsedSize?: number, sizeUnit?: "%" | "px" }> }`
  - Events: `change-value` (`SplitterEmitPayload`; members: `eventDetail`, `layout: Array<number>`, `extractPaneSize({ index })`), `update:value` (`Array<number>`).
  - Slots (manifest): `panel { panel, index, id }`, `handle { index }`.
- `FuroTimeField`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `Record<string, unknown> & { value?: string | null, invalid?: boolean, placeholder?: string | null, disabled?: boolean, readonly?: boolean, minValue?: string | null, maxValue?: string | null, timeFormat?: number | null, granularity?: "hour" | "minute" | "second" | null, step?: number | null, stepSnapping?: boolean | null, timezone?: string | null, decrementLabel?: string, incrementLabel?: string }`
  - Events: `change-value`, `commit-value` (`TimeFieldEmitPayload`; members: `eventDetail`, `value`, `hasEmptyValue()`, `hasValue()`), `update:value` (`string | null`).
- `FuroToggleGroup`
  - `parcel`: `{ value?: string | Array<string> | null, selectionMode?: "single" | "multiple", options?: Array<{ value: string, label?: string, disabled?: boolean }>, variant?: "default" | "outline", size?: "default" | "sm" | "lg", disabled?: boolean, orientation?: "horizontal" | "vertical" }`
  - Events: `change-value` (`ToggleGroupEmitPayload`; members: `eventDetail`, `value`, `isSelected({ value })`), `update:value` (`string | Array<string> | null`).
  - Slots (manifest): `option { option, pressed }`.
- `FuroToolBar`
  - `parcel` (nullable): `{ orientation?: "horizontal" | "vertical", textDirection?: "toRight" | "toLeft", loopFocus?: boolean }`. Events: none. Slots (manifest): `default`.
- `FuroTooltip`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ text?: string, side?: "top" | "right" | "bottom" | "left", align?: "start" | "center" | "end", sideOffset?: number, delayDuration?: number, disabled?: boolean, open?: boolean | null }`
  - Events: `open:change` (`{ open: boolean }`). Slots: `trigger`, `content`.

### Organisms

- `FuroAlertDialog`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ open?: boolean | null, disabled?: boolean, title?: string | null, description?: string | null, confirmText?: string, cancelText?: string, tone?: "default" | "destructive", closeOnEscape?: boolean, size?: "sm" | "default" | "lg", busy?: boolean, initialFocus?: string | null }`
  - Events: `confirm`, `cancel` (no payload), `open:change` (`{ open: boolean }`), `update:open` (`boolean`).
  - Slots: `trigger`, `title`, `description`, `default`, `footer { confirm, cancel }`.
- `FuroDialog`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ open?: boolean | null, disabled?: boolean, modal?: boolean, title?: string | null, description?: string | null, closeText?: string, closeOnOutsideClick?: boolean, closeOnEscape?: boolean, size?: "sm" | "default" | "lg" | "fullscreen", busy?: boolean, initialFocus?: string | null }`
  - Events: `open:change` (`{ open: boolean }`), `update:open` (`boolean`).
  - Slots: `trigger`, `title`, `description`, `default { close }`, `footer { close }`, `close`.
- `FuroDrawer`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ open?: boolean | null, disabled?: boolean, modal?: boolean | "trap-focus", title?: string | null, description?: string | null, closeText?: string, closeOnOutsideClick?: boolean, closeOnEscape?: boolean, side?: "left" | "right" | "top" | "bottom", size?: "sm" | "default" | "lg" | "fullscreen", snapPoints?: Array<number | string> | null, activeSnapPoint?: number | string | null, sequentialSnap?: boolean, swipeToOpen?: boolean, dragHandle?: boolean, busy?: boolean, initialFocus?: string | null }`
  - Events: `open:change` (`{ open: boolean }`), `update:open` (`boolean`), `snap:change` (`{ snapPoint: number | string | null }`), `update:activeSnapPoint` (`number | string | null`).
  - Slots: `trigger`, `title`, `description`, `default { close }`, `footer { close }`, `close`.
- `FuroEditor`
  - `parcel` (nullable): `{ value?: string (HTML), placeholder?: string, readOnly?: boolean, appearance?: "editor" | "plain", autofocus?: boolean | "start" | "end" | "all" | number, contentAttributes?: Record<string, string>, toolbar?: Array<Array<string>>, attachedFiles?: Array<any>, labels?: Partial<labels>, mention?: { searchMentions({ query }): Promise<Array<{ id: string | number, label: string }>> }, image?: { uploadImage({ file }): Promise<{ src: string, alt?: string }> }, actionOverrides?: Record<string, ({ control, command, editor }) => void> }`. `labels` keys (all `string`): `normalText`, `heading1` to `heading4`, `colorDefault`, `colorRed`, `colorBlue`, `colorGreen`, `colorOrange`, `colorPurple`, `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`, `heading`, `textColor`, `textAlign`, `bold`, `italic`, `underline`, `strike`, `bullets`, `numbers`, `blockquote`, `link`, `mention`, `image`, `overflow`, `linkDialogTitle`, `linkUrlLabel`, `linkDisplayTextLabel`, `linkSave`, `linkCancel`.
  - Events (declaration keys `UPDATE_VALUE`, `CHANGE_VALUE`, `COMMIT_VALUE`, `UPDATE_ATTACHED_FILES`, `ADD_MENTION`, `ADD_FILES`, `IMAGE_ERROR`, all typed `string`; names from the manifest): `update:value` (HTML `string`), `change-value` (`{ value }`), `commit-value` (`{ value }`, on blur), `update:attachedFiles` (`Array<*>`), `mention:add` (`{ id, label }`), `files:add` (`{ files }`), `image:error` (`{ file, error }`).
  - Slots: `toolbar-start`, `toolbar-dropdown-icon`, `toolbar-control-icon`, `toolbar-end`, `attachments`, `footer` (scoped props of these are typed only by internal template types; manifest lists `toolbar-start { command, editor }`, `toolbar-end { command, editor }`, `attachments { attachedFiles, remove, isEditable }`).
  - A name in `parcel.toolbar` outside the toolbar vocabulary makes the Context throw an `Error` (`throwOnUnknownToolbarName`), and production builds drop the name instead.
- `FuroSidebar`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ groups?: Array<{ key: string, label?: string | null, items?: Array<{ key: string, label: string, icon?: string | null, disabled?: boolean, items?: Array<{ key: string, label: string, disabled?: boolean }> }> }>, activeKey?: string | null, expandedKeys?: Array<string> | null, collapsed?: boolean, searchable?: boolean, searchValue?: string | null, searchPlaceholder?: string | null, searchLabel?: string, label?: string }`
  - Events: `navigate` (`{ key: string, parentKey: string | null }`), `update:activeKey` (`string`), `expand-change` (`{ key: string, expanded: boolean }`), `update:expandedKeys` (`Array<string>`), `search-change`, `search-commit` (`TextFieldEmitPayload`), `update:searchValue` (`string | null`).
  - Slots: `header`, `footer`, `search`, `item { entry, active, expanded, collapsed }`, `sub-item { entry, parent, active }`.
- `FuroStepper`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ steps?: Array<{ value: string | number, title?: string, description?: string, slotName?: string, disabled?: boolean }>, value?: number | null, orientation?: "horizontal" | "vertical", linear?: boolean, showPanels?: boolean, disabled?: boolean }`
  - Events: `step:change` (`{ value: number }`), `update:value` (`number`).
  - Slots: any name, each scoped `{ value?, step?, completed? }` (manifest names: `<value>` or `<slotName>`, `indicator-<value>`, `title-<value>`).
- `FuroTable`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ columns?: Array<{ field: string, label?: string, sortable?: boolean, align?: "start" | "center" | "end", width?: string }>, rows?: Array<Record<string, unknown>>, rowKey?: string, selectable?: boolean, selectedRowKeys?: Array<string | number> | null, sort?: { field: string, direction: "asc" | "desc" } | null, loading?: boolean, errorMessage?: string | null, emptyText?: string, virtual?: { itemSize: number, height: number, overscan?: number, endThreshold?: number } | null, totalRecords?: number | null, rowOffset?: number, resizable?: boolean, compact?: boolean, gridLines?: boolean, rowActionsLabel?: string, rowActionsWidth?: string }`
  - Events: `sort:change` (`{ field: string, direction: "asc" | "desc" | null }`), `selection:change` (`{ selectedRowKeys }`), `update:selectedRowKeys` (`Array<string | number>`), `range:change` (`{ first, last }`), `reach-end` (`{ first, last, loadedCount, totalRecords }`), `row:click` (`{ row, rowKey: string | number | null }`).
  - Slots: `header-cell { column }`, `cell { row, column, value }`, `loading`, `empty`, `error { message }`, `placeholder { index }`, `row-actions { row }`, `pagination`, `footer { selection: { keys, count } }`.
- `FuroTabs`
  - Props: `HTMLAttributes` and `parcel`. `parcel`: `{ tabs?: Array<{ value: string, label: string, slotName?: string, disabled?: boolean, attrs?: Record<string, string | number | boolean>, class?: string }>, value?: string | null, orientation?: "horizontal" | "vertical", variant?: "line" | "solid", scrollable?: boolean, showPanels?: boolean, showIndicator?: boolean, disabled?: boolean, scrollPreviousLabel?: string, scrollNextLabel?: string }`
  - Events: `tab:change` (`{ value: string }`), `update:value` (`string`).
  - Slots: any name, each scoped `{ value: string, label?: string }` (manifest names: `<value>` or `<slotName>`, `label-<value>`).
- `FuroToast`
  - Controlled toast stack: the parent owns `parcel.toasts` and removes an entry on `dismiss`. Use `toast` with `FuroToaster` instead for imperative toasts.
  - Props: `HTMLAttributes` and `parcel`. `parcel` (`ToastParcel`): `{ toasts?: Array<ToastEntry>, position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right", durationInMilliseconds?: number, swipeDirection?: "right" | "left" | "up" | "down", label?: string, hotkey?: Array<string> | null, maxVisible?: number, richColors?: boolean }`. `ToastEntry`: `{ key: string | number, title?: string | null, description?: string | null, type?: "info" | "success" | "warning" | "error" | "loading", durationInMilliseconds?: number | null, closeText?: string, actionText?: string | null, actions?: Array<{ actionKey: string, label: string }>, actionPending?: boolean }`
  - Events: `dismiss` (`{ key }`), `action` (`{ key, actionKey: string }`).
  - Slots: `title { toast }`, `description { toast }` (`toast` is a normalized entry with `key`, `title`, `description`, `type`, `durationInMilliseconds`, `closeText`, `actions`, `hasActions`, `actionPending`, `isLoading`).
- `FuroToaster`
  - No props, events or slots declared. Mount once near the app root; it renders `toastQueue` and routes `dismiss` and `action` back to it. Configure it through `toast.configure()`.

## Other declaration files reachable only through the wildcard subpaths

Present under `types/generated/` and not documented above because they are internal building blocks, not read member by member: each component's `*Context.d.ts` (class named after the file, extends `BaseFuroContext`), `FuroIconifyRendererContext`, `furoIconData` (exports the `FURO_ICON_COLLECTION` icon data object), `FuroDropdownMenuOptionRows.vue`, `FuroSelectOptionText.vue`, `FuroEditorMentionMenu.vue`, `FuroEditorCommandContext`, `FuroEditorMentionMenuContext`, `FuroTableRowItemContext`, `PreserveNewlinesPasteExtension`, `build-editor-extensions`, `mention-suggestion`, `paste-link-segments`, and `processors/EditorCollisionProcessor`, `processors/ObjectProcessor` under `FuroEditableField`.

## Usage

Render a control with the `parcel` + `v-model:value` contract:

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
  <FuroControlBlock :parcel="{ label: 'Email', errorMessages: errors }">
    <FuroTextField
      v-model:value="form.email"
      :parcel="{ invalid: errors.length > 0 }"
      @commit-value="onCommit($event.value)"
    />
  </FuroControlBlock>
</template>
```

Build a custom component on `BaseFuroContext`:

```js
import BaseFuroContext from '@openreachtech/furo-vue/lib/contexts/BaseFuroContext.js'

export default class SampleFieldContext extends BaseFuroContext {
  static get EMIT_EVENT_NAME () {
    return {
      CHANGE_VALUE: 'change-value',
    }
  }
}
```

## Changes from the 1.x document

- Added root exports `FuroIconRegistry` and `furoIconRegistry`, subpaths `./icons`, `./icon-renderers`, `./nuxt`, and the `./lib/*.js`, `./lib/*.vue`, `./*` wildcards.
- Component count is 50 (the 1.x text said 49 but listed 50 names). The component names are unchanged.
- `BaseFuroContext#hasBooleanAttribute({ name })` and `ToastQueue.resolveSharedInstance()` appear here and were not in the 1.x document.
- Parcel keys, events, slots and payload classes are now listed per component here, where the 1.x document pointed to a manifest.
