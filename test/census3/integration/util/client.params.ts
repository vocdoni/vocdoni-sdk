import { EnvOptions } from '../../../../src';

// Census3 indexes real token contracts on real chains, so it has no service in
// the local docker stack. These suites are skipped unless a census3 endpoint is
// explicitly provided via CENSUS3_URL — they never fall back to a deployed
// server.
export const clientParams = () => ({
  env: EnvOptions.DEV,
  api_url: process.env.CENSUS3_URL,
});

export const describeIfCensus3 = process.env.CENSUS3_URL ? describe : describe.skip;
