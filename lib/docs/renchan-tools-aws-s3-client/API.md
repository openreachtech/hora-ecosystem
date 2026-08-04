# API

Source: `lib/AwsS3Client.js`, `lib/AwsS3FileUploadPayload.js`, `lib/AwsS3FileUploadResult.js`, `lib/AwsS3OperationResult.js` (no `.d.ts` shipped — no `"types"` field in package.json; extracted from JSDoc). No members are tagged `@public`, so the surface below is the natural consumer-facing surface (verified by running the package against a real, intentionally-failing S3 call).

## Exports (`index.js`)

- `AwsS3Client` — the main entry point; wraps an AWS SDK `S3Client` and exposes `uploadFileToS3()`.
- `AwsS3FileUploadPayload` — builds the AWS SDK `PutObjectCommand` used by `uploadFileToS3()`.
- `AwsS3FileUploadResult` — the result object returned by `uploadFileToS3()` (success or failure, never a rejected promise).
- Not exported: `AwsS3OperationResult` — the base class of `AwsS3FileUploadResult` (lives at `lib/AwsS3OperationResult.js`, only reachable through inheritance).

## Class: `AwsS3Client`

Thin wrapper around `@aws-sdk/client-s3`'s `S3Client` (https://www.npmjs.com/package/@aws-sdk/client-s3).

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ env })` — static factory method. Builds the internal `S3Client` (via `.createAwsS3Client()`) and returns a new `AwsS3Client` wrapping it.
- `.createAwsS3Client({ env })` — static method. Returns a raw `S3Client` instance configured with:
  - `credentials.secretAccessKey` ← `env.AWS_SECRET_ACCESS_KEY`
  - `credentials.accessKeyId` ← `env.AWS_ACCESS_KEY`
  - `region` ← `env.AWS_REGION`

  `env` is a plain object (e.g. `process.env`, or a facade from `@openreachtech/renchan-env`) — the caller supplies the three keys above. Used internally by `.create()`, but callable directly if only the raw SDK client is needed.
- `#awsS3Client` — instance property. The wrapped `S3Client` instance (set via the constructor, normally by `.create()`).
- `#uploadFileToS3(payload)` — instance method, `async`. Calls `this.awsS3Client.send(payload.buildParams())` and **always resolves** — it never rejects:
  - on success: resolves to `AwsS3FileUploadResult.create({ payload, rawResult })`, where `rawResult` is the raw AWS SDK `PutObjectCommandOutput`.
  - on failure: resolves to `AwsS3FileUploadResult.create({ payload, error })`, where `error` is the caught `Error`.

  Callers must check `result.isSuccess` / `result.isFailure` rather than wrapping the call in `try`/`catch`. Verified by calling it with invalid credentials: the promise resolved (did not throw) with `result.isFailure === true` and `result.error.name === 'InvalidAccessKeyId'`.

## Class: `AwsS3FileUploadPayload`

Builds the AWS SDK command for a single file upload.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `.staticMethod()` | static method |

- `.create({ filePath, fileBody, contentType, bucketName })` — static factory method. Returns a new `AwsS3FileUploadPayload`.
- `#filePath` — instance property. The S3 object key (destination path within the bucket).
- `#fileBody` — instance property. File contents, `string | Buffer`.
- `#contentType` — instance property. MIME type (e.g. `'image/png'`).
- `#bucketName` — instance property. Destination S3 bucket name.
- `#buildParams()` — instance method. Returns a `PutObjectCommand` (from `@aws-sdk/client-s3`) built as `{ Key: filePath, Body: fileBody, ContentType: contentType, Bucket: bucketName }`. Used internally by `AwsS3Client#uploadFileToS3()`.

## Class: `AwsS3FileUploadResult`

Extends `AwsS3OperationResult` (not exported; documented here since its members are only reachable through this subclass). Represents the outcome of one `uploadFileToS3()` call.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#get:instanceGetter` | instance getter |
| `.staticMethod()` | static method |

- `.create({ payload, rawResult, error })` — static factory method (inherited from `AwsS3OperationResult`). `rawResult` and `error` both default to `null`.
- `#payload` — instance property. The `AwsS3FileUploadPayload` that was uploaded.
- `#rawResult` — instance property. The raw AWS SDK `PutObjectCommandOutput` on success, otherwise `null`.
- `#error` — instance property. The caught `Error` on failure, otherwise `null`.
- `#get:isSuccess` — instance getter (inherited). `true` when `error` is falsy.
- `#get:isFailure` — instance getter (inherited). `!isSuccess`.

## Usage

```js
import {
  AwsS3Client,
  AwsS3FileUploadPayload,
} from '@openreachtech/renchan-tools-aws-s3-client'

const awsS3Client = AwsS3Client.create({
  env: {
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
  },
})

const payload = AwsS3FileUploadPayload.create({
  filePath: 'uploads/avatar.png',
  fileBody: fileBuffer,
  contentType: 'image/png',
  bucketName: 'my-app-bucket',
})

const result = await awsS3Client.uploadFileToS3(payload)

if (result.isFailure) {
  console.error(result.error)
} else {
  console.log(result.rawResult.ETag)
}
```
