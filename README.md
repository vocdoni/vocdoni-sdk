<p align="center" width="100%">
    <img src="https://docs.vocdoni.io/Logotype.svg" />
</p>

<div align="center">

![npm](https://img.shields.io/npm/v/%40vocdoni%2Fsdk)
![GitHub commit activity (main)](https://img.shields.io/github/commit-activity/m/vocdoni/vocdoni-sdk)
[![Example workflow](https://github.com/vocdoni/vocdoni-sdk/actions/workflows/examples.yml/badge.svg)](https://vocdoni.github.io/vocdoni-sdk/)
![Main workflow](https://github.com/vocdoni/vocdoni-sdk/actions/workflows/main.yml/badge.svg)
[![Join Discord](https://img.shields.io/badge/discord-join%20chat-blue.svg)](https://discord.gg/xFTh8Np2ga)
[![Twitter Follow](https://img.shields.io/twitter/follow/vocdoni.svg?style=social&label=Follow)](https://twitter.com/vocdoni)

</div>

Vocdoni is a universally verifiable, censorship-resistant, anonymous, and self-sovereign governance protocol. Our main aim is a trustless voting system where anyone can speak their voice and where everything is auditable. We are engineering building blocks for a permissionless, private and censorship resistant democracy.

#### More about us
[Vocdoni Website](https://vocdoni.io) | [Developer Portal](https://developer.vocdoni.io/) | [Web Application](https://vocdoni.app) | [Blockchain Explorer](https://explorer.vote/) | [MIT Law Publication](https://law.mit.edu/pub/remotevotingintheageofcryptography/release/1) | [Discord Server](https://chat.vocdoni.io)

#### Key Repositories
[Vocdoni Node](https://github.com/vocdoni/vocdoni-node) | [Vocdoni SDK](https://github.com/vocdoni/vocdoni-sdk/) | [UI Components](https://github.com/vocdoni/ui-components) | [Application UI](https://github.com/vocdoni/ui-scaffold/tree/develop) | [Census3](https://github.com/vocdoni/census3)


# Vocdoni SDK 

The Vocdoni SDK is a convenient way to interact with the Vocdoni Protocol through [the API](https://developer.vocdoni.io/vocdoni-api/vocdoni-api), allowing anyone to create, manage and participate in voting processes and collective decision-making. This repository is written in typescript and allows easy integration into any js/ts project. You can view the code for the latest release by checking out that [tag](https://github.com/vocdoni/vocdoni-sdk/tree/v0.7.5) on Github. 

The best place to learn about using the SDK is the [developer portal](https://developer.vocdoni.io/).

The SDK can also be used via the [UI Components](https://github.com/vocdoni/ui-components) library which extracts away the functionality with a set of react components built with Chakra UI.

### Table of Contents
- [Tutorial](#tutorial)
- [Reference](#reference)
- [Examples](#examples)
- [Preview](#preview)
- [Docs](#docs)
- [Disclaimer](#disclaimer)
- [License](#license)


## Tutorial

We provide a full working [tutorial](https://developer.vocdoni.io/sdk/tutorial) for getting set-up and using the Vocdoni SDK and integrating it into your project.

This tutorial shows you how to build a simple server-side [example](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/tutorial).

## Reference

The SDK reference is available on the developer portal. It includes a [tutorial](https://developer.vocdoni.io/sdk/tutorial), an [integration guide](https://developer.vocdoni.io/sdk/integration-details), and an auto-generated [reference documentation](https://developer.vocdoni.io/sdk/reference/sdk-reference).


## Examples

We provide several examples, each of which highlights a different element of the Vocdoni SDK.

- [Tutorial](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/tutorial) is the most basic possible usage with typescript node
- [Typescript](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/typescript) is another typescript node example that enables you to try creating elections with several different [voting types](https://developer.vocdoni.io/sdk/integration-details/voting-types): multiple-choice, approval, quadratic, and ranked voting. 
- [CSP](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/csp) implements a voting process using a [Credential Service Provider](https://developer.vocdoni.io/sdk/integration-details/census-types/off-chain-csp) based census. 
- [Token-Based](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/token-based) implements a voting process using an Ethereum [token-based](https://developer.vocdoni.io/sdk/integration-details/census-types/on-chain) census. 
- [ESM](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/esm) shows how to use the es modules version of the SDK in a NodeJS project.
- [Vite-React-App](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/vite-react-app) is the only full-featured react application example.

You can also check out the code for our own [react application](https://github.com/vocdoni/ui-scaffold) built using the SDK and UI Components libraries. It is publicly available at https://app.vocdoni.io/

## Preview
Check out our [Live Preview](https://vocdoni.github.io/vocdoni-sdk/) of the SDK.

![Live preview](https://developer.vocdoni.io/assets/images/cra-0c8f163b4ca678d7ead4eeb51ff4b209.png)


This demo requires [Metamask](https://metamask.io/) (or Walletconnect) to sign transactions. Metamask is a browser extension that holds custody of private keys and cryptocurrencies, but it is simple to install and use, and you need no prior knowledge of this technology. 

> Metamask is used to sign the transactions that create elections and cast votes. Testing tokens are automatically sent once the account is created. No value is used or exchanged.

## Docs

You can find the autogenerated docs in our [Developer Portal](https://developer.vocdoni.io/sdk/reference/sdk-reference) or you can build them following [this guide](./docs/README.md).

## Disclaimer

The Vocdoni SDK and the underlying API is WIP. Please beware that it can be broken
at any time if the release is `alpha` or `beta`. We encourage you to review this
repository and the developer portal for any changes.

## License

This repository is licensed under the [GNU Affero General Public License v3.0](./LICENSE).

    Vocdoni API Typescript SDK
    Copyright (C) 2022 Vocdoni Roots MCU

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

