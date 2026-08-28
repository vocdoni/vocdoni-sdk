# Running the tests

The unit tests (`yarn test:unit`) run standalone. Every other suite
(`test:integration`, `test:service`, `test:api`, `test:integration:zk`) talks
to a **local docker stack** — voconed (a single-node vochain), blind-csp and
vocfaucet — and will refuse to run without it. The suites never run against a
deployed server.

## One command

```bash
yarn test:integration:stack                          # start stack + run all network suites
yarn test:integration:stack test:integration:account # …or only the given yarn scripts
```

On success the containers are stopped (volumes are kept, so the next boot is
fast). On failure the stack is left up for inspection; set
`INTEGRATION_KEEP_STACK=1` to always keep it up.

## Manual control

```bash
scripts/integration-stack.sh up    # start and wait until ready; prints the env vars
export API_URL=... FAUCET_URL=... BLINDCSP_URL=... BLINDCSP_PUBKEY=...
yarn test:integration:csp          # any suite, as many times as you want
scripts/integration-stack.sh logs  # container logs
scripts/integration-stack.sh down  # tear down (drops volumes)
```

The stack publishes on `127.0.0.1` ports 9095 (voconed), 5000 (blind-csp) and
8085 (vocfaucet); override `VOCONED_HOST_PORT`, `BLINDCSP_HOST_PORT` or
`VOCFAUCET_HOST_PORT` if any of them clash. Container configuration lives in
`test/integration/util/docker-compose.yml` + `test/integration/util/.env`.

## Census3

Census3 indexes real token contracts on real chains, so it has no local
container. The `test:census3` suites **skip themselves** unless you explicitly
provide an endpoint via `CENSUS3_URL`.
