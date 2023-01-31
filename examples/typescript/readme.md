Vocdoni SDK Typescript example
==============================

This example shows how to use the SDK in a Typescript project.

You may notice we used an old version of chalk. This is because since version
5.0.0, chalk only exports a pure ESM module, which would have forced us to
enable ESM experimental flags here.

If you want to see a full ESM example, check the [esm example].

In order to run the example:

~~~bash
git clone git@github.com:vocdoni/vocdoni-sdk.git
cd vocdoni-sdk/examples/typescript
yarn
yarn start
~~~

![esm]

[esm]: ../esm/esm.gif
[esm example]: ../esm
