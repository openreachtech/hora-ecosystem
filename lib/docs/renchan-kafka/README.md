# @openreachtech/renchan-kafka

A lightweight Kafka consumer daemon toolkit built on top of kafkajs.

This guide shows the minimum setup to run the package with a local Docker stack (MariaDB + Kafka + Debezium), implement two consumers with one engine, and start the daemon by script.

## Installation

Requires Node.js 20.x (the version the CI builds against).

```sh
npm install @openreachtech/renchan-kafka
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

It is an ES module (`"type": "module"`); import it with ESM `import` syntax.

## Usage

The following walkthrough sets up a local environment, implements two consumers behind a single engine, and runs the consumer daemon end to end.

### 1. Setup Docker environment

#### 1.1 Start services

Sample docker file, name it `docker-compose.development.yml`

```yaml
version: '3.8'

services:
  mariadb:
    image: mariadb:10.11
    container_name: mariadb_demo
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: demo_db
    # Settings to enable the binlog (change log)
    command:
      - --server-id=1
      - --log-bin=mariadb-bin
      - --binlog-format=ROW
      - --binlog-row-image=FULL
    ports:
      - "127.0.0.1:3306:3306"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "127.0.0.1:9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  connect:
    image: quay.io/debezium/connect:2.4
    ports:
      - "127.0.0.1:8083:8083"
    environment:
      BOOTSTRAP_SERVERS: kafka:29092
      GROUP_ID: 1
      CONFIG_STORAGE_TOPIC: my_connect_configs
      OFFSET_STORAGE_TOPIC: my_connect_offsets
      STATUS_STORAGE_TOPIC: my_connect_statuses
    depends_on:
      - kafka
      - mariadb
```

Run:

```bash
docker compose -f docker-compose.development.yml up
```

#### 1.2 Create demo tables

```bash
docker exec -it mariadb_demo mysql -uroot -prootpassword -e '
USE demo_db;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191)
);
CREATE TABLE user_amounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  amount VARCHAR(191)
);
'
```

### 2. Implement minimum application (two consumers + one engine)

#### 2.1 Install package

```bash
npm install @openreachtech/renchan-kafka
npm install @openreachtech/mentsu-rootpath
```

#### 2.2 Suggested structure

```text
your-app/
  src/
    kafka/
      connectors/
        MariadbConnector.js
      consumers/
        UserEachMessageConsumer.js
        UserAmountEachBatchConsumer.js
      engine/
        AppKafkaEngine.js
      scripts/
        run-kafka-daemon.js
  .env.development
```

#### 2.3 Add .env.example file

Add an empty .env.example file to the root directory.

#### 2.4 Register Debezium connector

Create src/kafka/connectors/MariadbConnector.js

```js
import {
  BaseConnector,
} from '@openreachtech/renchan-kafka'

export default class MariadbConnector extends BaseConnector {
  static get connectorName () {
    return 'mariadb-connector'
  }

  static buildConfig () {
    return {
      BASE_URL: 'http://localhost:8083',
    }
  }
}
```

#### 2.5 Consumer #1 (eachMessage)

Create src/kafka/consumers/eachMessageConsumers/UserEachMessageConsumer.js:

```js
import {
  BaseEachMessageConsumer,
  JsonMessageDeserializer,
  DebeziumMessageKey,
  DebeziumMessageValue,
  EachMessageConsumerParcel,
} from '@openreachtech/renchan-kafka'

const Timer = console

export default class UserEachMessageConsumer extends BaseEachMessageConsumer {
  /** @override */
  static get config () {
    return {
      groupId: 'demo-users-group',
    }
  }

  /** @override */
  static get errorCodeHash () {
    return {
      //
    }
  }

  /** @override */
  static get MessageDeserializerCtor () {
    return JsonMessageDeserializer
  }

  /** @override */
  static get MessageKeyCtor () {
    return DebeziumMessageKey
  }

  /** @override */
  static get MessageValueCtor () {
    return DebeziumMessageValue
  }

  /** @override */
  static get ConsumerParcelCtor () {
    return EachMessageConsumerParcel
  }

  /** @override */
  static async collectTopics () {
    return [
      'db_server.demo_db.users'
    ]
  }

  /**
   * @override
   * @param {Parameters<BaseEachMessageConsumer['onEachMessage']>[0]} params
   * @return {ReturnType<BaseEachMessageConsumer['onEachMessage']>}
   */
  async onEachMessage ({ message }) {
    if (!message.value?.payload) {
      return
    }

    const operationLookup = {
      c: 'CREATE',
      u: 'UPDATE',
      d: 'DELETE',
      r: 'READ',
      t: 'TRUNCATE',
      m: 'MESSAGE',
    }

    Timer.log(
      '[EachMessage]',
      operationLookup[message.normalizedValue.operationKey],
      message.normalizedValue.newRecord
    )
  }
}
```

#### 2.6 Consumer #2 (eachBatch)

Create src/kafka/consumers/eachBatchConsumers/UserAmountEachBatchConsumer.js:

```js
import {
  BaseEachBatchConsumer,
  JsonMessageDeserializer,
  DebeziumMessageKey,
  DebeziumMessageValue,
  EachBatchConsumerParcel,
} from '@openreachtech/renchan-kafka'

const Timber = console

export default class UserAmountEachBatchConsumer extends BaseEachBatchConsumer {
  /** @override */
  static get config () {
    return {
      groupId: 'demo-user_amounts-group',
    }
  }

  /** @override */
  static get errorCodeHash () {
    return {}
  }

  /** @override */
  static get MessageDeserializerCtor () {
    return JsonMessageDeserializer
  }

  /** @override */
  static get MessageKeyCtor () {
    return DebeziumMessageKey
  }

  /** @override */
  static get MessageValueCtor () {
    return DebeziumMessageValue
  }

  /** @override */
  static get ConsumerParcelCtor () {
    return EachBatchConsumerParcel
  }

  /** @override */
  static async collectTopics () {
    return [
      'db_server.demo_db.user_amounts'
    ]
  }

  /**
   * @override
   * @param {Parameters<BaseEachBatchConsumer['onEachMessage']>[0]} params
   * @return {ReturnType<BaseEachBatchConsumer['onEachMessage']>}
   */
  async onEachMessage ({ message }) {
    if (!message.value?.payload) {
      return
    }

    const operationLookup = {
      c: 'CREATE',
      u: 'UPDATE',
      d: 'DELETE',
      r: 'READ',
      t: 'TRUNCATE',
      m: 'MESSAGE',
    }

    Timber.log(
      '[EachMessage]',
      operationLookup[message.normalizedValue.operationKey],
      message.normalizedValue.newRecord
    )
  }
}
```

#### 2.7 Single engine for both consumers

Create src/kafka/engine/AppKafkaEngine.js:

```js
import {
  BaseKafkaEngine,
  BaseKafkaShare,
  BaseKafkaContext,
} from '@openreachtech/renchan-kafka'

import {
  RootPath,
} from '@openreachtech/mentsu-rootpath'

const rootPath = RootPath.create()

export default class AppKafkaEngine extends BaseKafkaEngine {
  static get config () {
    return {
      kafkaOptionHash: {
        brokers: [
          'localhost:9092'
        ],
        clientId: 'mariadb-cdc-demo',
      },
      consumersPath: rootPath.to('src/kafka/consumers'),
      consumerOptionHash: {
        groupId: 'mariadb-cdc-demo-group',
      },
    }
  }

  static get ShareCtor () {
    return BaseKafkaShare
  }

  static get ContextCtor () {
    return BaseKafkaContext
  }

  static get standardErrorCodeHash () {
    return {
      ...super.standardErrorCodeHash,
      // ...
    }
  }
}
```

### 3. Start application by script

#### 3.1 Create connector
Create src/kafka/scripts/create-connector-client.js:

```js
import MariadbConnector from '../connectors/MariadbConnector.js'

const Timber = console

const run = async () => {
  const connector = MariadbConnector.create()

  const capsule = await connector.createConnectorFromBodyConfig({
    bodyConfig: {
      connectorClass: 'io.debezium.connector.mysql.MySqlConnector',
      tasksMax: '1',
      databaseHostname: 'mariadb',
      databasePort: '3306',
      databaseUser: 'root',
      databasePassword: 'rootpassword',
      databaseServerId: '184054',
      topicPrefix: 'db_server',
      databaseIncludeList: 'demo_db',
      schemaHistoryInternalKafkaBootstrapServers: 'kafka:29092',
      schemaHistoryInternalKafkaTopic: 'schema-changes.demo_db',
    },
  })

  Timber.dir(capsule.body, { depth: null })
  Timber.log(capsule.requestMethod, capsule.statusCode)
}

run()
  .catch(error => {
    Timber.error(error)
    process.exitCode = 1
  })
```

Run:

```bash
NODE_ENV=development node src/kafka/scripts/create-connector-client.js
```

#### 3.2 Run Daemon
Create src/kafka/scripts/run-kafka-daemon.js:

```js
import {
  KafkaConsumersDaemon,
} from '@openreachtech/renchan-kafka'

import AppKafkaEngine from '../engine/AppKafkaEngine.js'

const Timber = console

const run = async () => {
  const daemon = await KafkaConsumersDaemon.createAsync({
    EngineCtor: AppKafkaEngine,
  })

  await daemon.startDaemon()
}

run()
  .catch(error => {
    Timber.error(error)
    process.exitCode = 1
  })
```

Start daemon:

```bash
NODE_ENV=development node ./src/kafka/scripts/run-kafka-daemon.js
```

Keep this terminal to see the consumers log.

### 4. Test

Open new terminal and Produce CDC events by changing MariaDB data:

```bash
docker exec -it mariadb_demo mysql -uroot -prootpassword -e "
USE demo_db;
INSERT INTO users (id, name) VALUES (999, 'Alice');
UPDATE users SET name = 'Bob' WHERE id = 999;
DELETE FROM users WHERE id = 999;
"
```


```bash
docker exec -it mariadb_demo mysql -uroot -prootpassword -e "
USE demo_db;
INSERT INTO user_amounts (id, amount) VALUES (999, 1000);
UPDATE user_amounts SET amount = 2000 WHERE id = 999;
DELETE FROM user_amounts WHERE id = 999;
"
```

You should see logs from both consumers for INSERT, UPDATE, and DELETE events.

## API

Class members are written with the following notation.

| notation | members |
| :-- | :-- |
| `#instanceProperty` | instance property |
| `#instanceMethod()` | instance method |
| `#get:instanceGetter` | instance getter |
| `#set:instanceSetter` | instance setter |
| `.staticProperty` | static property |
| `.staticMethod()` | static method |
| `.get:staticGetter` | static getter |
| `.set:staticSetter` | static setter |

### Daemon & Engine

- **`KafkaConsumersDaemon`** — boots every consumer discovered by the engine and runs them until shutdown.
  - `.createAsync()` — build a daemon for a given `EngineCtor`.
  - `#startDaemon()` — start consuming and block until the process is stopped.
- **`BaseKafkaEngine`** — declares the Kafka connection, where consumers live, and the shared DI classes. Extend it and override:
  - `.get:config` — `kafkaOptionHash`, `consumersPath`, and `consumerOptionHash`.
  - `.get:ShareCtor` — the `BaseKafkaShare` subclass shared across consumers.
  - `.get:ContextCtor` — the `BaseKafkaContext` subclass built per consumer.
  - `.get:standardErrorCodeHash` — error codes shared across the engine.
- **`BaseKafkaShare`** — per-process container of shared singletons handed to every consumer.
- **`BaseKafkaContext`** — per-consumer context built by the engine.

### Consumers

- **`BaseConsumer`** — the abstract base for all consumers.
- **`BaseEachMessageConsumer`** — processes one message at a time. Extend it and override:
  - `.get:config` — consumer options such as `groupId`.
  - `.get:MessageDeserializerCtor` / `.get:MessageKeyCtor` / `.get:MessageValueCtor` / `.get:ConsumerParcelCtor` — the message-shaping classes.
  - `.collectTopics()` — the topics this consumer subscribes to.
  - `#onEachMessage()` — the per-message handler you implement.
- **`BaseEachBatchConsumer`** — processes a batch of messages, with the same override surface as `BaseEachMessageConsumer`.
- **`BatchMessageProgress`** — tracks per-batch processing progress.

### Messages

- **`ConsumerMessage`** — a single consumed message, exposing its deserialized key/value.
- **Deserializers** — `BaseMessageDeserializer`, `JsonMessageDeserializer`, `BufferMessageDeserializer`.
- **Values** — `BaseMessageValue`, `DebeziumMessageValue` (normalizes Debezium CDC payloads).
- **Keys** — `BaseMessageKey`, `DebeziumMessageKey`.
- **Parcels** — `BaseConsumerParcel`, `EachMessageConsumerParcel`, `EachBatchConsumerParcel`.

### Connectors & client

- **`BaseConnector`** (with `AbstractCoreConnector` / `AbstractWorkflowConnector`) — registers and manages Debezium connectors over the Kafka Connect REST API. Extend it and override:
  - `.get:connectorName` — the connector name.
  - `.buildConfig()` — the connector base configuration.
  - `#createConnectorFromBodyConfig()` — create the connector from a body config.
- **Client three-class structure** — `BaseKafkaLauncher`, `BaseKafkaPayload`, `BaseKafkaCapsule`, plus the request/response bodies (`KafkaRequestBody`, `KafkaRequestQuery`, `KafkaResponseBody`) and the concrete `CreateConnector*` / `PutConnectorConfig*` operations.

### Errors

- **`KafkaError`** — base error type for the package.
- **`ConcreteMemberNotFoundKafkaError`** — thrown when a required concrete member is not implemented.

## Contribution

Bug reports, feature requests, and code contributions are welcome.

Feel free to contact us through GitHub Issues.

```sh
git clone https://github.com/openreachtech/renchan-kafka.git
cd renchan-kafka
npm install
npm run lint
npm test
```

## License

This project is released under the Apache License 2.0.

For more details, please see [in the LICENSE file](./LICENSE).

## Developer

[Open Reach Tech Inc.](https://openreach.tech)

## Copyright

© 2026 Open Reach Tech Inc.
