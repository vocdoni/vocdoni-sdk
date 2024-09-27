Vocdoni SDK Token-Based Census example
==============================

This example shows how to use the SDK to create a token-based census in a Typescript project.

In order to execute this example, you need to have a token on an ethereum-based blockchain that you would like to use as a census. This can be any of the following token types:
- ERC20
- ERC721
- ERC777
- POAP
- Gitcoin Passport Score
- Gitcoin Passport Shields (coming soon)
- ERC1155 (coming soon)

You then need to specify the token address and chain number, as well as a list of voter private keys (only use demo accounts created for testing) in index.ts. 

If you do not already have a token to use for testing, you can easily create one for free on a testnet. For more details follow our [setup guide](https://developer.vocdoni.io/sdk/integration-details/census-types/on-chain#creating-a-token).

To execute this example, use the following steps:

~~~bash
git clone git@github.com:vocdoni/vocdoni-sdk.git
cd vocdoni-sdk/examples/token-based
# Make sure you have a testing token, add its info to index.ts
yarn
yarn start
~~~

## Tutorial

This example was created to serve as a tutorial for implementing token-based censuses for voting with Vocdoni. The complete tutorial is available [here](https://developer.vocdoni.io/sdk/integration-details/census-types/on-chain#tutorial)