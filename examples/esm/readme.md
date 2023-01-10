Vocdoni SDK ESM Typescript example
==================================

This example shows how to use the ESM version of the SDK in a NodeJS project.

Ensure you run the process using both the `--experimental-modules` and the
`--experimental-specifier-resolution=node` flag, as seen in the `package.json`
file:

~~~bash
node --experimental-modules --experimental-specifier-resolution=node index.mjs
~~~

In order to run the example:

~~~bash
git clone git@github.com:vocdoni/vocdoni-sdk.git
cd vocdoni-sdk/examples/esm
yarn
yarn start
~~~

![esm]

[esm]: ./esm.gif
