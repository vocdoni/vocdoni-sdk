Vocdoni SDK Typescript example
==============================

This example shows how to use the SDK in a Typescript project.

You may notice we used an old version of chalk. This is because since version
5.0.0, chalk only exports a pure ESM module, which would have forced us to
enable ESM experimental flags here.

If you want to see a full ESM example, check the [esm example].

The `src/` directory contains various examples related to different voting 
process types. To see the available ones, review the scripts inside the 
`package.json` file.

To execute this example, use the following steps:

~~~bash
git clone git@github.com:vocdoni/vocdoni-sdk.git
cd vocdoni-sdk/examples/typescript
yarn
yarn start
~~~

![esm]

### Extra: run Vocdoni node locally

For running the Vocdoni node locally, use the Docker compose file 
located in the [tests] folder at the root of the SDK.

```bash
docker compose pull 
docker compose up -d voconed
```

This command will launch only the standalone node. You'll then need to 
identify the port where `voconed` is listening. This information is 
required to run the scripts locally:

```bash
docker inspect util-voconed-1 # Locate HostPort (32768 by default)
API_URL=http://127.0.0.1:32768/v2 yarn quadratic
```

[esm]: ../esm/esm.gif
[esm example]: ../esm
[tests]: ../../test/integration/util/docker-compose.yml
