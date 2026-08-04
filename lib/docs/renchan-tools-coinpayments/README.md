# RENCHAN-TOOLS-COINPAYMENTS

## Overview

* Renchan tools coinpayments client is built with node.js.
* Calling this module allows you to easily integrate a checkout system for numerous cryptocurrencies.

## Use guid

  - [Install](#install)
  - [Configuration](#configuration)
  - [Setup Client](#setup-client)
  - Methods
    - [Fetch call back address](#fetch-call-back-address)
    - [Fetch rates](#fetch-rates)
    - [Fetch transaction](#fetch-transaction)
    - [Fetch transaction IDs](#fetch-transaction-ids)
    - [Fetch transactions](#fetch-transactions)

### Install

```console
  npm install @openreachtech/renchan-tools-coinpayments
```

### Configuration

   - Please register [Coinpayments](https://www.coinpayments.net/register) first. Then configure your credentials in environment variables.
   - `.env`<`.`your-node-environment>  (e.g. `.env.development`)
      ```ini
      COINPAYMENTS_KEY=app_api_key
      COINPAYMENTS_SECRET=app_coinpayments_secret
      ```

### Setup Client

```js
    const {
      CoinpaymentsClient,
      CallbackAddressPayload,
      RatesPayload,
      TransactionByIdPayload,
      TransactionsByIdsPayload,
      TransactionIdsPayload,
    } = require('@openreachtech/renchan-tools-coinpayments')

  const coinpaymentsClient = CoinpaymentsClient.create()
```

### Methods

#### Fetch call back address
```js
const result = await coinpaymentsClient.fetchCallbackAddress(payload)
```

- request:

```js
    {
      currency: "xxx",
      ipnUrl: "xxx",
      label: "xxx",
      eip55: 1
    }
```

- response:

```js
  {
  "address": "1BitcoinAddress"
  }
```

- input

  - payload: [CallbackAddressPayload](#callbackaddresspayload)

- output

  [CallbackAddressResult](#callbackAddressResult)

Types

* CallbackAddressPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| currency | string  | 〇 | Any enabled currency. e.g 'BTC' |
| ipnUrl | string  | - | Explicit URL for the IPN to send POST requests to. |
| label | string  | - | Optionally sets the address label. |
| eip55 | number | - | If set to 1 encodes the address in EIP-55 mixed case format for ETH/ERC20 + clones. This is safely ignored for other coin types. |

* CallbackAddressResult

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| address | string | 〇 | The address to deposit the selected coin into your CoinPayments Wallet. |

#### Fetch rates
```js
const result = await coinpaymentsClient.fetchRates(payload)
```

- request:

```js
    {
      short: "xxx",
      accepted: "xxx"
    }
```

- response:

```js
{
  "BTC": {
    "is_fiat": 0,
    "rate_btc": "1.000000000000000000000000",
    "last_update": "1375473661",
    "tx_fee": "0.00100000",
    "status": "online",
    "name": "Bitcoin",
    "confirms": "2",
    "can_convert": 0,
    "capabilities": ["payments", "wallet", "transfers", "convert"],
    "explorer": "https://etherscan.io/tx/%txid%"
  },
  "LTC": {
    "is_fiat": 0,
    "rate_btc": "0.018343387500000000000000",
    "last_update": "1518463609",
    "tx_fee": "0.00100000",
    "status": "online",
    "name": "Litecoin",
    "confirms": "3",
    "can_convert": 0,
    "capabilities": ["payments", "wallet", "transfers", "convert"],
    "explorer": "https://etherscan.io/tx/%txid%"
  },
  "USD": {
    "is_fiat": 1,
    "rate_btc": "0.000114884285404190000000",
    "last_update": "1518463609",
    "tx_fee": "0.00000000",
    "status": "online",
    "name": "United States Dollar",
    "confirms": "1",
    "can_convert": 0,
    "capabilities": [],
    "explorer": "https://etherscan.io/tx/%txid%"
  }
}
```

- input

  - payload: [RatesPayload](#ratesPayload)

- output

  [RatesResult](#ratesResult)

Types

* RatesPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| short | number  | - | If set to 1, the response won't include the full coin names and number of confirms needed to save bandwidth. |
| accepted | number  | - |  If set to 1, the response will include if you have the coin enabled for acceptance on your Coin Acceptance Settings page. If set to 2, the response will include all fiat coins but only cryptocurrencies enabled for acceptance on your Coin Acceptance Settings page. |

* RatesResult

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| coinAbbrv | string | 〇 | - |
| is_fiat | number/boolean | 〇 | is_fiat - If the coin is a fiat currency. You can use fiat currencies in your buttons so you don't get to get conversion rates yourself. |
| rate_btc | string | 〇 | rate_btc - The exchange rate to Bitcoin. |
| last_update | string | 〇 | - |
| tx_fee | string | 〇 | tx_fee - Transaction fee. |
| status | string | 〇 | status - Cloud wallet/network status online or offline. |
| name | string | 〇 | name - The coin's full/display name. |
| confirms | string | 〇 | confirms - The number of confirms a coin has to have in our system before we send it to you. |
| can_convert | number/boolean | 〇 | can_convert - Is convertable 0 or 1. |
| capabilities | string | - | capabilities - Offered services for the given cryptocurrency. Can be: "payments", "wallet", "transfers", "dest_tag", "convert" |
| explorer | string | 〇 | explorer - Link to block explorer |

#### Fetch transaction
```js
const result = await coinpaymentsClient.fetchTransactionById(payload)
```

- request:

```js
    {
      transactionId: "xxx",
      full: "xxx"
    }
```

- response:

```js
{
  "time_created": 1424436678,
  "time_expires": 1424442078,
  "status": 0,
  "status_text": "Waiting for buyer funds...",
  "type": "coins",
  "coin": "POT",
  "amount": 121700023,
  "amountf": "1.21700023",
  "received": 0,
  "receivedf": "0.00000000",
  "recv_confirms": 0,
  "payment_address": "PWP4gKLRLVQv9dsvcN4sZn5pZaKQGothXm"
}
```

- input

  - payload: [TransactionByIdPayload](#transactionByIdPayload)

- output

  [TransactionByIdResult](#transactionByIdResult)

Types

* TransactionByIdPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| transactionId | string  | 〇 | The transaction ID to query (API key must belong to the seller.) Note: It is recommended to handle IPNs instead of using this command when possible, it is more efficient and places less load on our servers. |
| full | number  | - | Set to 1 to also include the raw checkout and shipping data for the payment if available. (default: 0) |

* TransactionByIdResult

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
|time_created | number | 〇 | The time the transaction request was created. |
|time_expires | number | 〇 | The time the transaction request expires. |
|status | number | 〇 | Status of the payment (-1 = Cancelled, 0 = Pending, 1 == Success) |
|status_text | string | 〇 | Status expressed in human readable text. |
|type | string | 〇 | Fiat or coins |
|coin | string | 〇 | - |
|amount | number | 〇 | Amount to send (in Satoshis). |
|amountf | string | 〇 | Amount to send (as a floating point number). |
|received | number | 〇 | Received amount (in Satoshis). |
|receivedf | string | 〇 | Received amount (as a floating point number). |
|recv_confirms | number | 〇 | Received confirms. |
|payment_address | string | 〇 | Address to send the fund to. |

#### Fetch transaction IDs
```js
const result = await coinpaymentsClient.fetchTransactionIds(payload)
```

- request:

```js
    {
      limit: "xxx",
      start: "xxx",
      newer: "xxx",
      all: "xxx"
    }
```

- response:

```js
  [
  "CPBF23CBUSHKKOMV1OPMRBNEFV",
  "CPBF4COHLYGEZZYIGFDKFY9NDP",
  "CPBF6BFPJTSLC3Z49CT82NVYJ8",
  "CPBF2L8QSXIG2YGKLVO5N0WTXJ",
  ...
  ]
```

- input

  - payload: [TransactionIdsPayload](#transactionIdsPayload)

- output

  [TransactionIdsResult](#transactionIdsResult)

Types

* TransactionIdsPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| limit | string  | - | The maximum number of transaction IDs to return from 1-100. (default: 25). |
| start | string  | - | What transaction # to start from (for iteration/pagination.) (default: 0, starts with your newest transactions.). |
| newer | string  | - | Return transactions started at the given Unix timestamp or later. (default: 0). |
| all | string | - | By default we return an array of TX IDs where you are the seller for use with get_tx_info_multi or get_tx_info. If all is set to 1 returns an array with TX IDs and whether you are the seller or buyer for the transaction. |

* TransactionIdsResult

| Name | Type | Required? | Description |
| ---  | ---  | :---: | --- |
| - | string[] | - | Each element in the array represents a transaction ID. |

#### Fetch transactions
```js
const result = await coinpaymentsClient.fetchTransactionsByIds(payload)
```

- request:

```js
    {
      currency: "xxx",
      ipnUrl: "xxx",
      label: "xxx",
      eip55: 1
    }
```

- response:

```js
   {
      "CPBF23CBUSHKKOMV1OPMRBNEFV": {
      "error": "ok",
      "amount": "1.21825881",
      "txn_id": "d17a8ee84b1de669bdd0f15b38f20a7e9781d569d20c096e49983ad9ad40ce4c",
      "address": "PVS1Xo3xCU2MyXHadU2EbhFZCbnyjZHBjx",
      "confirms_needed": "5",
      "timeout": 5400,
      "checkout_url": "https://www.coinpayments.net/index.php?cmd=checkout&id=CPED3H7GIFTDRZ4AICVZXGXZ
      WH&key=4d7321119c0a533250de336138d4bb14",
      "status_url": "https://www.coinpayments.net/index.php?cmd=status&id=CPED3H7GIFTDRZ4AICVZXGXZWH
      &key=4d7321119c0a533250de336138d4bb14",
      "qrcode_url": "https://www.coinpayments.net/qrgen.php?id=CPED3H7GIFTDRZ4AICVZXGXZWH&key=4d7321
      119c0a533250de336138d4bb14"
      },
      ...
    }
```

- input

  - payload: [TransactionsByIdsPayload](#transactionsByIdsPayload)

- output

  [TransactionsByIdsResult](#transactionsByIdsResult)

Types

* TransactionsByIdsPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| ...transactionIds | string[]  | 〇 | Array of transaction ids. |

* TransactionsByIdsResult

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | --- |
| tx | string | 〇 | A coin network TX ID |
|error | string | 〇 | - |
|amount | string | 〇 | The amount for the buyer to send in the destination currency (currency2). |
|txn_id | string | 〇 | The CoinPayments.net transaction ID. |
|address | string | 〇 | The address the buyer needs to send the coins to. |
|confirms_needed | string | 〇 | The number of confirms needed for the transaction to be complete. |
|timeout | number | 〇 | How long the buyer has to send the coins and have them be confirmed in seconds. |
|status_url | string | 〇 | A URL where the buyer can view the payment progress and leave feedback for you. |
|qrcode_url | string | 〇 | A URL to a generated QR code. |
