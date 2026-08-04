# API

Source: `lib/**/*.js` (no `.d.ts` shipped — no `"types"` field in `package.json`; extracted from JSDoc). Cross-checked against the base classes in `@openreachtech/renchan-tools-external-api` (which this package extends) and against the upstream repo's own `samples/*.js` scripts (fetched from `github.com/openreachtech/renchan-tools-coinpayments`), which demonstrate the real, current usage pattern end-to-end, including one captured log of an actual response.

**Discrepancy notice**: the shipped `README.md` (identical on npm and on GitHub `main`) documents a `CoinpaymentsClient` facade with methods such as `.fetchCallbackAddress()`, `.fetchRates()`, etc., and payload classes named `RatesPayload`, `TransactionByIdPayload`, `TransactionsByIdsPayload`. **None of these exist** in `index.js` or anywhere under `lib/`. The classes actually exported — verified against both the installed code and the upstream `samples/*.js` — are the ones documented below. Treat the "Setup Client"/"Methods" section of the README as aspirational/outdated; the API surface here is what actually ships.

## Exports (`index.js`)

`index.js` has a single CJS export: `module.exports` is one plain object (not a class, no default/named ESM-style split, no `index.mjs`), namespaced by feature:

```js
module.exports = {
  bases: {
    RequestLauncher: BaseCoinpaymentsRequestLauncher,
  },
  CallbackAddress: {
    Capsule, Payload, PayloadErrorResolver, PayloadValidator, RequestFetcher,
  },
  ExchangeRates: {
    Capsule, Payload, PayloadErrorResolver, PayloadValidator, RequestFetcher, Enum, ExchangeRate,
  },
  Transaction: {
    Capsule, Payload, PayloadErrorResolver, PayloadValidator, RequestFetcher, Enum,
  },
  TransactionIds: {
    Capsule, Payload, PayloadErrorResolver, PayloadValidator, RequestFetcher, Enum, TransactionId,
  },
  Withdrawal: {
    Capsule, RequestSender, Enum,
    bases: { Payload, PayloadErrorResolver, PayloadValidator },
    Merchant: { Payload, PayloadErrorResolver, PayloadValidator },
  },
}
```

Consumers destructure the namespace they need, e.g. `const { CallbackAddress } = require('@openreachtech/renchan-tools-coinpayments')` then use `CallbackAddress.Payload` / `CallbackAddress.RequestFetcher`.

## Consumer-facing surface

No class or member in this package is JSDoc-tagged `@public`. Documented below is the natural consumer-facing surface, which is exactly what the package's own `samples/*.js` scripts use: **`Payload` → `RequestFetcher`/`RequestSender` → `Capsule`**, one triad per CoinPayments API operation. `PayloadValidator` and `PayloadErrorResolver` are wired up automatically inside `XPayload.create()` and are not called directly by consumers in the documented workflow; the plain `Enum` objects are lookup tables for valid parameter values. Both are covered briefly in [Internal helper classes and enums](#internal-helper-classes-and-enums) for completeness.

## Configuration

Every `RequestFetcher`/`RequestSender` builds its own CoinPayments client (from the `coinpayments` npm package) unless one is supplied explicitly. `BaseCoinpaymentsRequestLauncher.createCoinpaymentsOptions(environment)` reads:

| env var | used as |
| :-- | :-- |
| `COINPAYMENTS_KEY` | `key` |
| `COINPAYMENTS_SECRET` | `secret` |

`environment` defaults to `Environment.create().env` from `@openreachtech/renchan-env` (resolved per `NODE_ENV`, e.g. `.env.development`). Register an account and API key/secret at https://www.coinpayments.net/register first.

## Class: `bases.RequestLauncher` (`BaseCoinpaymentsRequestLauncher`)

Base class of every `RequestFetcher`/`RequestSender` below. Extends `BaseRequestLauncher` from `@openreachtech/renchan-tools-external-api`.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ client = this.createClient() } = {})` — static factory method, inherited from `BaseRequestLauncher`. Builds the CoinPayments client automatically unless one is passed in.
- `.createClient(environment)` — static method, override. Delegates to `.createCoinpaymentsClient(environment)`; when called with no argument (the normal case, via `.create()`'s default parameter), `environment` is `undefined` and `.createCoinpaymentsClient()`'s own default (`this.environment`) takes over.
- `.createCoinpaymentsClient(environment = this.environment)` — static method. Returns `new Coinpayments({ key, secret })` (the `coinpayments` npm package's client).
- `.createCoinpaymentsOptions(environment)` — static method. Builds `{ key: environment.COINPAYMENTS_KEY, secret: environment.COINPAYMENTS_SECRET }`.
- `#client` — instance property, inherited. The underlying `Coinpayments` client instance.
- `#get:CapsuleClass` — instance getter, inherited, abstract. Throws `'this function must be inherited'` unless a subclass overrides it with the relevant `*Capsule` class.
- `#launchRequest(payload)` — instance method, inherited, `async`. Returns `Promise<BaseCapsule>`. If `payload.isInvalid()`, resolves to a capsule wrapping the validation error without calling the API; otherwise calls `#requestToClient(payload.toActualParams())` and wraps the response (or any thrown error) into `CapsuleClass`. **Never rejects.**
- `#requestToClient(actualParams)` — instance method, abstract in the base class; each concrete subclass below overrides it to call one specific method on the CoinPayments SDK client.

Each feature group's `RequestFetcher`/`RequestSender` only overrides `#get:CapsuleClass` and `#requestToClient()`.

## Class: `CallbackAddress.Payload` (`CallbackAddressPayload`)

Extends `BasePayload` from `@openreachtech/renchan-tools-external-api`. Builds the params for the "Get Callback Address" CoinPayments operation.

| notation | members |
| :-- | :-- |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ params })` — static factory method, inherited from `BasePayload`. `params`: `{ currency: string, ipnUrl?: string, label?: string, eip55?: number }`. `currency` is the only required field.
- `#get:conversionTable` — instance getter, override. Maps `ipnUrl → ipn_url`, and passes `currency` / `label` / `eip55` through unchanged, to match CoinPayments' own field names.
- `#toActualParams()` — instance method, inherited. Applies `conversionTable` to `params` and returns the CoinPayments-shaped request object.
- `#isValid()` / `#isInvalid()` — instance methods, inherited. Valid only if `params.currency` is non-null (enforced via the internal `CallbackAddressPayloadValidator`).

## Class: `CallbackAddress.RequestFetcher` (`CallbackAddressRequestFetcher`)

Extends `bases.RequestLauncher`. Wraps CoinPayments' `getCallbackAddress`.

- `.create()` — static factory method, inherited.
- `#get:CapsuleClass` — returns `CallbackAddressCapsule`.
- `#requestToClient(actualParams)` — calls `this.client.getCallbackAddress(actualParams)`.
- `#launchRequest(payload)` — inherited; returns `Promise<CallbackAddressCapsule>`.

## Class: `CallbackAddress.Capsule` (`CallbackAddressCapsule`)

Extends `BaseCapsule` from `@openreachtech/renchan-tools-external-api`.

- `#hasError()` / `#hasReturned()` — instance methods, inherited. `#hasError()` returns `#error` itself (the `Error`, so truthy — not literally `true` — when set, otherwise `null`); `#hasReturned()` returns `!hasError()`, a real boolean.
- `#get:address` — instance getter. The deposit address string from the response, or `null` if there is no response.

## Class: `ExchangeRates.Payload` (`ExchangeRatesPayload`)

Builds the params for the "Rates / Coin List" operation.

- `.create({ params })` — `params`: `{ shorthandMode?: number, coinAcceptanceMode?: number }`, both optional.
- `#get:conversionTable` — maps `shorthandMode → short`, `coinAcceptanceMode → accepted`.
- `#isValid()` — valid only if `shorthandMode` is one of `ExchangeRatesEnum.shortHandMode` (`OFF: 0` / `ON: 1`) and `coinAcceptanceMode` is one of `ExchangeRatesEnum.coinAcceptanceMode` (`ACCEPTED_ONLY: 1` / `ALL_FIAT_COINS: 2`), when given.

## Class: `ExchangeRates.RequestFetcher` (`ExchangeRatesRequestFetcher`)

- `.create()` — static factory method, inherited.
- `#get:CapsuleClass` — returns `ExchangeRatesCapsule`.
- `#requestToClient(actualParams)` — calls `this.client.rates(actualParams)`.

## Class: `ExchangeRates.Capsule` (`ExchangeRatesCapsule`)

- `#hasError()` / `#hasReturned()` — inherited.
- `#get:rateHash` — instance getter. Returns a `Proxy` over the raw response; indexing it by a currency key (e.g. `rateHash.BTC`) lazily builds and returns an `ExchangeRates.ExchangeRate` for that key, or `null` (via the proxy's `get` trap, which delegates to `#getExchangeRate()`) if the key is missing from the response.
- `#getExchangeRate(currencyKey)` — instance method. Same lookup as above, callable directly; returns `ExchangeRate?`, `null` if `currencyKey` isn't in the response.

## Class: `ExchangeRates.ExchangeRate` (`ExchangeRate`)

Plain value wrapper around one currency's raw rate entry (not a `BaseCapsule` subclass — constructed directly by `ExchangeRatesCapsule`).

- `.create({ rawRate })` — static factory method.
- `#rawRate` — instance property. The raw per-currency object from the API response.
- `#get:canConvert` — `boolean`, from `rawRate.can_convert`.
- `#get:capabilities` — `Array<string>`, defaults to `[]`. Subset of `"payments" | "wallet" | "transfers" | "convert" | "dest_tag"`.
- `#get:hasPaymentsCapability` / `#get:hasWalletCapability` / `#get:hasTransfersCapability` / `#get:hasConvertCapability` / `#get:hasDestinationTagCapability` — `boolean` convenience checks against `capabilities`.
- `#get:chain` / `#get:contract` / `#get:isAccepted` — pass through undocumented-by-CoinPayments fields present in real responses (`rawRate.chain` / `.contract` / `.accepted`).
- `#get:cloudStatus` — `rawRate.status` (`'online' | 'maintenance'`, etc).
- `#get:displayName` — `rawRate.name`.
- `#get:explorerUrl` — `rawRate.explorer`.
- `#get:imageUrl` — `rawRate.image`.
- `#get:isFiat` — `boolean`, from `rawRate.is_fiat`.
- `#get:lastUpdatedAt` — `Date?`, parsed from `rawRate.last_update` (`null` if absent).
- `#get:numberOfConfirms` — `number`, `parseInt(rawRate.confirms)`.
- `#get:rateToBtc` — `BigNumber`, from `rawRate.rate_btc`.
- `#get:transactionFee` — `BigNumber`, from `rawRate.tx_fee`.

## Class: `Transaction.Payload` (`TransactionPayload`)

Builds the params for the "Get Transaction Info" operation.

- `.create({ params })` — `params`: `{ transactionId: string, fullMode?: number }`. `transactionId` is required.
- `#get:conversionTable` — maps `transactionId → txid`, `fullMode → full`.
- `#isValid()` — requires `transactionId` non-null; `fullMode`, if given, must be `TransactionEnum.fullMode.OFF` (`0`) or `.ON` (`1`).

## Class: `Transaction.RequestFetcher` (`TransactionRequestFetcher`)

- `.create()` — static factory method, inherited.
- `#get:CapsuleClass` — returns `TransactionCapsule`.
- `#requestToClient(actualParams)` — calls `this.client.getTx(actualParams)`.

## Class: `Transaction.Capsule` (`TransactionCapsule`)

- `#hasError()` / `#hasReturned()` — inherited.
- `#get:createdAt` / `#get:expiresAt` — `Date?`, from `time_created` / `time_expires`.
- `#get:paymentStatus` — `number?` (`-1` cancelled, `0` pending, `1` success); `#get:paymentStatusText` — the human-readable form.
- `#get:isPaymentStatusCanceled` / `#get:isPaymentStatusPending` / `#get:isPaymentStatusSuccess` — `boolean` convenience checks on `paymentStatus`.
- `#get:currencyType` — `'fiat' | 'coins'`; `#get:isFiat` / `#get:isCoins` — convenience checks on it.
- `#get:coin` — coin code string.
- `#get:amountAsInteger` / `#get:amountAsFloat` (`BigNumber`) — amount to send, in Satoshis vs. as a decimal.
- `#get:receivedAmountAsInteger` / `#get:receivedAmountAsFloat` (`BigNumber`) — same, for the amount received so far.
- `#get:numberOfReceivedConfirms` — `number`, `parseInt(recv_confirms)`.
- `#get:paymentAddress` — address the buyer should send funds to.

## Class: `TransactionIds.Payload` (`TransactionIdsPayload`)

Builds the params for the "Get Transaction ID List" operation.

- `.create({ params })` — `params`: `{ limit?: string | number, startingTransactionId?: string, startedAt?: Date | string | number, allMode?: string | number }`, all optional.
- `#get:conversionTable` — maps `limit → limit`, `startingTransactionId → start`, `startedAt → newer`, `allMode → all`.
- `#get:valueConverterHash` — override. Converts `startedAt` to `new Date(startedAt).getTime().toString()`, and `allMode` to its string form, before sending.
- `#isValid()` — when given: `limit` must be an integer `1`–`100`; `startingTransactionId` must be an alphanumeric string (`/^[0-9a-zA-Z]+$/`); `startedAt` must parse into a valid `Date`; `allMode` must be `TransactionIdsEnum.allMode.SELLERS_ONLY` (`0`) or `.SELLERS_AND_BUYERS` (`1`). All four fields are optional, so an empty `params` object is valid.

## Class: `TransactionIds.RequestFetcher` (`TransactionIdsRequestFetcher`)

- `.create()` — static factory method, inherited.
- `#get:CapsuleClass` — returns `TransactionIdsCapsule`.
- `#requestToClient(actualParams)` — calls `this.client['getTxList'](actualParams)` (bracket syntax used only to satisfy an internal ESLint identifier-suffix rule; equivalent to `.getTxList(...)`).

## Class: `TransactionIds.Capsule` (`TransactionIdsCapsule`)

- `#hasError()` / `#hasReturned()` — inherited.
- `#get:transactionIds` — instance getter. Maps the raw response array into `Array<TransactionIds.TransactionId>`; `[]` if there's no response.

## Class: `TransactionIds.TransactionId` (`TransactionId`)

Plain value wrapper around one item of the transaction-ID list response. Shape differs depending on whether the request used `allMode`.

- `.create({ transactionId })` — static factory method. `transactionId` is either a raw `string` (default mode) or `{ txid: string, user_is: string }` (when `allMode` was set).
- `#getTransactionId()` — instance method. Returns the plain transaction ID string either way.
- `#get:userPosition` — `'seller' | 'buyer'`. Always `'seller'` outside of `allMode` (matching the CoinPayments default), otherwise `rawTransactionId.user_is`.
- `#get:isSeller` / `#get:isBuyer` — `boolean` convenience checks on `userPosition`.

## Class: `Withdrawal.RequestSender` (`WithdrawalRequestSender`)

Same shape as the other `RequestFetcher` classes, named `RequestSender` because it sends a create-withdrawal request rather than fetching data.

- `.create()` — static factory method, inherited.
- `#get:CapsuleClass` — returns `WithdrawalCapsule`.
- `#requestToClient(actualParams)` — calls `this.client.createWithdrawal(actualParams)`.

## Class: `Withdrawal.Capsule` (`WithdrawalCapsule`)

- `#hasError()` / `#hasReturned()` — inherited.
- `#get:withdrawalId` — the CoinPayments withdrawal ID string.
- `#get:amount` — `BigNumber`, amount withdrawn.
- `#get:isWaitingMailConfirmation` — `boolean`. `true` unless the response's `status` is exactly `1` (`1` = created with no email confirmation needed; anything else, including `0`, means still waiting).

## Class: `Withdrawal.bases.Payload` (`BaseWithdrawalPayload`)

Shared base of the withdrawal payload; builds params for "Create Withdrawal". Not used directly by consumers — use `Withdrawal.Merchant.Payload` (below), the one concrete subclass shipped.

- `.create({ params })` — `params`: `{ amount: BigNumber | string | number, currency: string, addsTransactionFee?: boolean, baseCurrency?: string, destinationTag?: string, ipnUrl?: string, noMailConfirmation?: boolean, note?: string }`.
- `#get:conversionTable` — maps to CoinPayments' field names: `addsTransactionFee → add_tx_fee`, `baseCurrency → currency2`, `destinationTag → dest_tag`, `ipnUrl → ipn_url`, `noMailConfirmation → auto_confirm`; `amount`, `currency`, `note` pass through.
- `#get:valueConverterHash` — converts `amount` via `new BigNumber(amount).toNumber()`, and coerces `addsTransactionFee` / `noMailConfirmation` to `1`/`0`.
- `#isValid()` (via `BaseWithdrawalPayloadValidator`) — requires a numeric `amount`, and a `string` `currency`; `baseCurrency` / `destinationTag` / `ipnUrl` / `note`, if given, must also be non-empty strings. `addsTransactionFee` / `noMailConfirmation` are always accepted (no type check).

## Class: `Withdrawal.Merchant.Payload` (`MerchantWithdrawalPayload`)

Extends `Withdrawal.bases.Payload`; the payload actually used to create a withdrawal to a specific address.

- `.create({ params })` — `params` extends the base params with `address: string` (destination wallet address).
- `#get:conversionTable` — base table plus `address → address`.
- `#isValid()` (via `MerchantWithdrawalPayloadValidator`) — base checks, plus: `address` must pass `@openreachtech/renchan-tools-crypto-currency`'s `CryptoCurrencyAddressValidator` for the given `currency` (i.e. the address must be a syntactically valid address for that specific coin/chain). Fails closed (`false`) if no validator recognizes the `currency` at all.

## Internal helper classes and enums

Not part of the documented consumer workflow above (no direct calls in the package's own `samples/*.js`), but exported and reachable if needed:

| export | role |
| :-- | :-- |
| `CallbackAddress.PayloadValidator` / `.PayloadErrorResolver` | `CallbackAddressPayload`'s internal validator (`currency` required) / error `'invalid params to call callback address'`. |
| `ExchangeRates.PayloadValidator` / `.PayloadErrorResolver` | `ExchangeRatesPayload`'s internal validator (see `.Payload` above) / error `'invalid params to call exchange rates'`. |
| `ExchangeRates.Enum` | `{ shortHandMode: { OFF: 0, ON: 1 }, coinAcceptanceMode: { ACCEPTED_ONLY: 1, ALL_FIAT_COINS: 2 } }`. |
| `Transaction.PayloadValidator` / `.PayloadErrorResolver` | `TransactionPayload`'s internal validator (see `.Payload` above) / error `'invalid params to call transaction'`. |
| `Transaction.Enum` | `{ fullMode: { OFF: 0, ON: 1 } }`. |
| `TransactionIds.PayloadValidator` / `.PayloadErrorResolver` | `TransactionIdsPayload`'s internal validator (see `.Payload` above) / error `'invalid params to get transaction ids'`. |
| `TransactionIds.Enum` | `{ allMode: { SELLERS_ONLY: 0, SELLERS_AND_BUYERS: 1 } }`. |
| `Withdrawal.bases.PayloadValidator` / `.PayloadErrorResolver` | `BaseWithdrawalPayload`'s internal validator (see `Withdrawal.bases.Payload` above) / error `'invalid params to create withdrawal'`. |
| `Withdrawal.Merchant.PayloadValidator` / `.PayloadErrorResolver` | `MerchantWithdrawalPayload`'s internal validator (adds address checking) / error `'invalid params to create withdrawal by merchant'`. |
| `Withdrawal.Enum` | `{ addsTransactionFee: { OFF: 0, ON: 1 }, noMailConfirmation: { OFF: 0, ON: 1 } }`. |

All `PayloadValidator`/`PayloadErrorResolver` classes extend `BasePayloadValidator`/`BasePayloadErrorResolver` from `@openreachtech/renchan-tools-external-api` and are constructed automatically by the matching `Payload.create()`; they are not meant to be instantiated by hand.

## Usage

Verified against the upstream repo's `samples/CallbackAddressRequestFetcher.js` (run with `COINPAYMENTS_KEY`/`COINPAYMENTS_SECRET` set via `.env.samples`):

```js
const {
  CallbackAddress,
} = require('@openreachtech/renchan-tools-coinpayments')

const payload = CallbackAddress.Payload.create({
  params: {
    currency: 'BTC',
  },
})
const fetcher = CallbackAddress.RequestFetcher.create()

const capsule = await fetcher.launchRequest(payload)

if (capsule.hasError()) {
  // capsule.error - validation error, or the error thrown by the CoinPayments SDK
} else {
  capsule.address // e.g. '3KZ7M8b4U4e7bHV858xistSZAvezvXVRrh'
}
```

The same `Payload → RequestFetcher/RequestSender → Capsule` shape applies to the other operations:

```js
const {
  ExchangeRates,
  Transaction,
  TransactionIds,
  Withdrawal,
} = require('@openreachtech/renchan-tools-coinpayments')

// Rates
const ratesCapsule = await ExchangeRates.RequestFetcher.create()
  .launchRequest(ExchangeRates.Payload.create({ params: {} }))
ratesCapsule.rateHash.BTC.rateToBtc // BigNumber('1')

// Transaction lookup
const txCapsule = await Transaction.RequestFetcher.create()
  .launchRequest(Transaction.Payload.create({ params: { transactionId: 'CPBF23CBUSHKKOMV1OPMRBNEFV' } }))
txCapsule.isPaymentStatusSuccess

// Transaction ID listing
const txIdsCapsule = await TransactionIds.RequestFetcher.create()
  .launchRequest(TransactionIds.Payload.create({ params: { limit: 10 } }))
txIdsCapsule.transactionIds.map(it => it.getTransactionId())

// Withdrawal (to a specific merchant address)
const withdrawalCapsule = await Withdrawal.RequestSender.create()
  .launchRequest(Withdrawal.Merchant.Payload.create({
    params: {
      amount: '0.01',
      currency: 'BTC',
      address: '3KZ7M8b4U4e7bHV858xistSZAvezvXVRrh',
    },
  }))
withdrawalCapsule.withdrawalId
```
