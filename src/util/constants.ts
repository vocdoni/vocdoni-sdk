export const API_URL = {
  dev: 'https://api-dev.vocdoni.net/v2',
  stg: 'https://api-stg.vocdoni.net/v2',
  prod: 'https://api.vocdoni.net/v2',
};

export const EXPLORER_URL = {
  dev: 'https://dev.explorer.vote',
  stg: 'https://stg.explorer.vote',
  prod: 'https://explorer.vote',
};

export const CENSUS3_URL = {
  dev: 'https://census3.dev.vocdoni.net/api',
  stg: 'https://census3.stg.vocdoni.net/api',
  prod: 'https://census3.vocdoni.net/api',
};

export const FAUCET_URL = {
  dev: 'https://faucet-azeno.vocdoni.net/faucet/vocdoni/dev',
  stg: 'https://faucet-azeno.vocdoni.net/faucet/vocdoni/stage',
};

export const FAUCET_AUTH_TOKEN = {
  dev: '158a58ba-bd3e-479e-b230-2814a34fae8f',
  stg: '158a58ba-bd3e-479e-b230-2814a34fae8f',
};

export const TX_WAIT_OPTIONS = {
  retry_time: 5000,
  attempts: 6,
};

export const VOCDONI_SIK_SIGNATURE_LENGTH = 64;
export const VOCDONI_SIK_PAYLOAD =
  'This signature request is used to create your own secret identity key (SIK) for the Vocdoni protocol and generate your anonymous account.\n' +
  'Only accept this signature request if you fully trust the application. This request will not trigger a blockchain transaction or cost any gas fees.';
