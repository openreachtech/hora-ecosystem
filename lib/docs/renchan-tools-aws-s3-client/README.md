# RENCHAN-TOOLS-AWS-S3-CLIENT

## Overview

- Renchan tools aws s3 client is built with node.js.

- Calling this module allows you to easily upload files to AWS S3 server.

## Use Guide

  - [Install](#install)
  - [Configuration](#configuration)
  - [Setup Client](#setup-client)
  - Methods
    - [Upload File to AWS S3](#upload-file-to-aws-s3)


### Install

```console
npm install @openreachtech/renchan-tools-aws-s3-client
```

### Configuration

`.env`<`.`your-node-environment>  (e.g. `.env.development`)

```ini
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_ACCESS_KEY=your_access_key
AWS_REGION=your-aws-region
```

### Setup Client

```js
const {
  AwsS3Client,
  AwsS3ClientConfig,
  AwsS3FileUploadPayload,
} = require('@openreachtech/renchan-tools-aws-s3-client')

const awsS3Client = AwsS3Client.create(config)
```

- input
  - config: [AwsS3ClientConfig](#awss3clientconfig)  - optional, if not provided, configured from environment settings.

### Methods

#### Upload File to AWS S3

```js
const result = await awsS3Client.uploadFileToS3(payload)
```

- request:

```js
  {
    Key: "s3-path",
    Body: "file-content",
    ContentType: "mime-type",
    Bucket: "s3-bucket"
  }
```

- response:

```js
  {
    "$metadata": {
      httpStatusCode: 200,
      requestId: "xxx",
      extendedRequestId: "xxx",
      cfId: "xxx",
      attempts: 2,
      totalRetryDelay: 3
    },
    BucketKeyEnabled: true,
    ChecksumCRC32: "xxx",
    ChecksumCRC32C: "xxx",
    ChecksumSHA1: "xxx",
    ChecksumSHA256: "xxx",
    ETag: "xxx",
    Expiration: "xxx",
    RequestCharged: "xxx",
    SSECustomerAlgorithm: "xxx",
    SSECustomerKeyMD5: "xxx",
    SSEKMSEncryptionContext: "xxx",
    SSEKMSKeyId: "xxx",
    ServerSideEncryption: "xxx",
    VersionId: "xxx"
  }
```

- input

  - payload: [AwsS3FileUploadPayload](#awss3fileuploadpayload)

- output

  [AwsS3FileUploadResult](#awss3fileuploadresult-extends-from-awss3operationresult)

#### Types

* AwsS3ClientConfig

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| secretAccessKey | string | 〇 | AWS secret access key |
| accessKeyId | string | 〇 | AWS access key ID |
| region | string | 〇 | AWS region |

* AwsS3FileUploadPayload

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| filePath | string | 〇 | S3 file path |
| fileBody | string \| Buffer | 〇 | File content |
| contentType | string | 〇 | Content type (e.g., image/png) |
| bucketName | string | 〇 | S3 bucket to where the file is saved |

* AwsS3FileUploadResult (extends from [AwsS3OperationResult](#awss3operationresult))

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| payload | [AwsS3FileUploadPayload](#awss3fileuploadpayload) | 〇 | Payload to upload |
| rawResult | [ServiceOutputTypes](#serviceoutputtypes) | | Raw result returned |
| error | Error | | Error when failed |

* AwsS3OperationResult

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| isSuccess (read only) | boolean | 〇 | Whether is success? |
| isFailure (read only) | boolean | 〇 | Whether is failure? |

* ServiceOutputTypes

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| $metadata | [AWSRequestMetadata](#awsrequestmetadata) | 〇 | |
| BucketKeyEnabled | boolean | | |
| ChecksumCRC32 | string | | |
| ChecksumCRC32C | string | | |
| ChecksumSHA1 | string | | |
| ChecksumSHA256 | string | | |
| ETag | string | | |
| Expiration | string | | |
| RequestCharged | string | | |
| SSECustomerAlgorithm | string | | |
| SSECustomerKeyMD5 | string | | |
| SSEKMSEncryptionContext | string | | |
| SSEKMSKeyId | string | | |
| ServerSideEncryption | string | | |
| VersionId | string | | |

* AWSRequestMetadata

| Name | Type | Required? | Description |
| ---  | ---  | :---:     | ---         |
| httpStatusCode | number |  |  |
| requestId | string |  |  |
| extendedRequestId | string |  |  |
| cfId | string |  |  |
| attempts | number |  |  |
| totalRetryDelay | number |  |  |
