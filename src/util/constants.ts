export const API_URL = {
  dev: 'https://celoni.vocdoni.net/v2',
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
  dev: 'https://celoni.vocdoni.net/v2/faucet/dev',
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

export const CENSUS_CHUNK_SIZE = 8192;

export enum TxMessage {
  REGISTER_SIK = 'Signing a Vocdoni transaction of type REGISTER_SIK for secret identity key {sik}. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
  SET_ACCOUNT = 'Signing a Vocdoni transaction of type SET_ACCOUNT/{type}. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
  COLLECT_FAUCET = 'Signing a Vocdoni transaction of type COLLECT_FAUCET. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
  SEND_TOKENS = 'Signing a Vocdoni transaction of type SEND_TOKENS for an amount of {amount} VOC tokens to destination address {to}. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
  NEW_PROCESS = 'Signing a Vocdoni transaction of type NEW_PROCESS. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
  SET_PROCESS = 'Signing a Vocdoni transaction of type SET_PROCESS/{type} with process ID {processId}. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
  VOTE = 'Signing a Vocdoni transaction of type VOTE for process ID {processId}. The hash of the transaction is {hash} and the destination chainID is {chainId}.',
}
