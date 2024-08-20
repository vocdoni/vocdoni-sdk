
<p align="center" width="100%">
    <img src="https://developer.vocdoni.io/img/vocdoni_logotype_full_white.svg" />
</p>

<p align="center" width="100%">
    <a href="https://github.com/vocdoni/vocdoni-sdk/actions/workflows/main.yml/"><img src="https://github.com/vocdoni/vocdoni-sdk/actions/workflows/main.yml/badge.svg" /></a>
    <a href="https://github.com/vocdoni/vocdoni-sdk/commits/main/"><img src="https://img.shields.io/github/commit-activity/m/vocdoni/vocdoni-sdk" /></a>
    <a href="https://github.com/vocdoni/vocdoni-sdk/issues"><img src="https://img.shields.io/github/issues/vocdoni/vocdoni-sdk" /></a>
    <a href="https://discord.gg/xFTh8Np2ga"><img src="https://img.shields.io/badge/discord-join%20chat-blue.svg" /></a>
    <a href="https://twitter.com/vocdoni"><img src="https://img.shields.io/twitter/follow/vocdoni.svg?style=social&label=Follow" /></a>
</p>

  <div align="center">
    Vocdoni is the first universally verifiable, censorship-resistant, anonymous, and self-sovereign governance protocol. <br />
    Our main aim is a trustless voting system where anyone can speak their voice and where everything is auditable. <br />
    We are engineering building blocks for a permissionless, private and censorship resistant democracy.
    <br />
    <a href="https://developer.vocdoni.io/"><strong>Explore the developer portal »</strong></a>
    <br />
    <h3>More About Us</h3>
    <a href="https://vocdoni.io">Vocdoni Website</a>
    |
    <a href="https://vocdoni.app">Web Application</a>
    |
    <a href="https://explorer.vote/">Blockchain Explorer</a>
    |
    <a href="https://law.mit.edu/pub/remotevotingintheageofcryptography/release/1">MIT Law Publication</a>
    |
    <a href="https://chat.vocdoni.io">Contact Us</a>
    <br />
    <h3>Key Repositories</h3>
    <a href="https://github.com/vocdoni/vocdoni-node">Vocdoni Node</a>
    |
    <a href="https://github.com/vocdoni/vocdoni-sdk/">Vocdoni SDK</a>
    |
    <a href="https://github.com/vocdoni/ui-components">UI Components</a>
    |
    <a href="https://github.com/vocdoni/ui-scaffold">Application UI</a>
    |
    <a href="https://github.com/vocdoni/census3">Census3</a>
  </div>

# Vocdoni SDK 

The Vocdoni SDK is a convenient way to interact with the Vocdoni Protocol through [the API](https://developer.vocdoni.io/vocdoni-api/vocdoni-api), allowing anyone to create, manage and participate in voting processes and collective decision-making. This repository is written in typescript and allows easy integration into any js/ts project. You can view the code for the latest release by checking out that [tag](https://github.com/vocdoni/vocdoni-sdk/tree/v0.7.5) on Github. 

The best place to learn about using the SDK is the [developer portal](https://developer.vocdoni.io/).

The SDK can also be used via the [UI Components](https://github.com/vocdoni/ui-components) library which extracts away the functionality with a set of react components built with Chakra UI.

### Table of Contents
- [Getting Started](#getting-started)
- [Reference](#reference)
- [Examples](#examples)
- [Preview](#preview)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [License](#license)


## Getting Started

We provide a full working [tutorial](https://developer.vocdoni.io/sdk/tutorial) for getting set-up and using the Vocdoni SDK and integrating it into your project.

This tutorial shows you how to build a simple server-side [example](https://github.com/vocdoni/vocdoni-sdk/tree/main/examples/tutorial).

## Reference

The SDK reference is available on the developer portal. It includes a [tutorial](https://developer.vocdoni.io/sdk/tutorial), an [integration guide](https://developer.vocdoni.io/sdk/integration-details), and an auto-generated [reference documentation](https://developer.vocdoni.io/sdk/reference/sdk-reference).
You can also build the auto-generated docs following [this guide](./docs/README.md).

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


## Disclaimer

The Vocdoni SDK and the underlying API is WIP. Please beware that it can be broken
at any time if the release is `alpha` or `beta`. We encourage you to review this
repository and the developer portal for any changes.

## Contributing 

While we welcome contributions from the community, we do not track all of our issues on Github and we may not have the resources to onboard developers and review complex pull requests. That being said, there are multiple ways you can get involved with the project. 

Please review our [development guidelines](https://developer.vocdoni.io/development-guidelines).

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

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v1.4%20adopted-ff69b4.svg)](code-of-conduct.md) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)