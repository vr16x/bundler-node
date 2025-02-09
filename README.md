<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

A minimal bundler node built using Nodejs and Typescript capable of executing ERC-4337 User Operations with Smart Wallets.

## Tech Stack Used:
1. **NestJs** - Nodejs backend framework
2. **Viem** - A lightweight library to interact with the EVM blockchain
3. **Jest** - A testing framework used for the end-to-end testing
4. **JSON RPC 2.0** - JSON RPC 2.0 standard API for interacting with EVM nodes and services

## Blockchain Used:

**Sepolia Testnet** is used for the minimal bundler node. However, the code can support multiple chains with ease just by configuring the other chains through ENV and fund respective wallets. 

## Project setup:

```bash
# Create .env
$ cp .env-example .env
# Configure the .env
$ npm install
```

## Compile and run the project:

```bash
# watch mode
$ npm run start:dev
```

## Run tests:

```bash
# e2e tests
$ npm run test:e2e
```

## Run scripts:

```bash
# send user operation
$ npm run script:send-user-operation
```

## Constraints as per the notion page
1. JSON RPC 2.0 compatible API to execute UserOperations and Returns transaction hash and receipt - ✅
2. No stateful or persistent storage is required for simplicity - ✅
3. More than one EOA wallet should be used to execute the User Operations - ✅
4. Sepolia chain should be supported - ✅
5. Basic test cases should be added - ✅
6. The Bundler node should effectively handle User Operation without stuck or pending transactions - ✅
7. No paymaster usage is required - ✅
8. Proper error handling should be implemented - ✅
9. No User Operation simulation is required - ✅

## Implementation Explanation:
1. the **relayer manager** is implemented to manage **N number of relayers** to coordinate the User Operation transactions. Many Relayer managers can be added to this bundler node with ease. The greater the relayers, the greater the number of User Operation processing
2. The **relayer manager manages the nonce** to overcome the nonce-related issues in transaction execution
3. The **transaction manager** is implemented to execute and **retry transactions** with bumped gas limit and gas price.
4. The API is fully compatible with **JSON RPC 2.0**
5. **Modular services** are added to increase the code quality and reusability throughout the codebase.

## Implementation Limitations based on constraints:
As per the constraints or requirements, there is no User Operation mempool is implemented. This results in some performance and other limitations which can be enhanced by adding mempool and queue-based operations to execute the user ops in a background worker.

1. Getting both transaction hash and transaction receipt can take several more seconds. These things can be moved to the client where the client can get the transaction receipt with userOpHash
2. As there is no state, only one transaction retry mechanism is added. This can be improved by adding a queue where N number of retries can be performed.
3. As the user operation needs to be executed instantly, the availability of relayers might be low if there are more concurrent executions which will result in waiting for the relayers to get allocated for us. This can be improved by executing the User Ops in the background worker with Queue.
4. Currently I am using the slightly bumped gas price to increase the transaction success rate. But In real-time, the transaction may get stuck if the bumped gas price is also not enough (Mostly not frequent). This may result in a stuck transaction which needs to be cleared by replacing the nonce. To implemented this, we need stateful app and some automation to detect and cancel transactions which is not fully implemented



## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
