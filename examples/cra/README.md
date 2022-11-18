Vocdoni SDK Create React App example
====================================

In this project you'll find examples on how to implement vocdoni-sdk into your
react application.

Take a look at [`src/containers/App.tsx`][app.tsx] for a full featured example
of vocdoni SDK.

This project was bootstrapped with [Create React App][cra]. The start and build
scripts have been replaced with esbuild tho.

The main reason to change it was its speed, but also because using typescript in
CRA with react-scripts causes weird type execution errors for some dependencies
in `node_modules`.

## Development details

In order to use `vocdoni-sdk` you just need to import it in your project and
start using it, as seen on the example file.

~~~bash
yarn add vocdoni-sdk
# with npm
npm i vocdoni-sdk
# with pnpm
pnpm add vocdoni-sdk
~~~

If you need to sign transactions (creating processes and voting require signing
transactions), you can use any wallet or signer compatible with
`@ethersproject/abstract-signer`.

For this CRA example, we used [UniSwap's web3react tools][web3react]. Note we
used the latest available beta version of their tools but, again, you should be
able to use any other libraries using ethers.js behind.

## Running it locally

In order to run the example locally, you'll first need to build the base sdk,
since the dependency in `package.json` points to that path. `cd` into the root
path and do `yarn && yarn build`.

After doing so, you can safely run `yarn && yarn start` in the example.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.

Open [http://localhost:8000](http://localhost:8000) to view it in the browser.

You will also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `public/build` folder.

## Learn More

You can learn more in the [Vocdoni developer portal][vocdoni dev portal].

To learn React and/or CRA, check out the [React documentation](https://reactjs.org/).

[app.tsx]: src/containers/App.tsx
[cra]: https://github.com/facebook/create-react-app
[web3react]: https://github.com/Uniswap/web3-react
[vocdoni dev portal]: https://developer.vocdoni.io
