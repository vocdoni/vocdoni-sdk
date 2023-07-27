import { Signer } from '@ethersproject/abstract-signer';
import { keccak256 } from '@ethersproject/keccak256';
import { Wallet } from '@ethersproject/wallet';
import { Buffer } from 'buffer';
import invariant from 'tiny-invariant';
import {
  AccountAPI,
  CensusAPI,
  ChainAPI,
  ElectionAPI,
  FaucetAPI,
  FileAPI,
  IChainGetCostsResponse,
  VoteAPI,
  WalletAPI,
} from './api';
import { CspAPI } from './api/csp';
import { AccountCore } from './core/account';
import { ElectionCore } from './core/election';
import { VoteCore } from './core/vote';
import {
  Account,
  AllElectionStatus,
  Census,
  CensusType,
  CspVote,
  ElectionStatus,
  ElectionStatusReady,
  InvalidElection,
  PlainCensus,
  PublishedCensus,
  PublishedElection,
  TokenCensus,
  UnpublishedElection,
  Vote,
  WeightedCensus,
} from './types';
import { delay, strip0x } from './util/common';
import {
  API_URL,
  EXPLORER_URL,
  FAUCET_AUTH_TOKEN,
  FAUCET_URL,
  TX_WAIT_OPTIONS,
  VOCDONI_SIK_PAYLOAD,
} from './util/constants';
import { CensusBlind, getBlindedPayload } from './util/blind-signing';
import { allSettled } from './util/promise';
import { sha256 } from '@ethersproject/sha2';
import { calcSik, CircuitInputs, prepareCircuitInputs } from './util/zk/inputs';
import { generateGroth16Proof, ZkProof } from './util/zk/prover';
import { Signing } from './util/signing';
import { ZkAPI } from './api/zk';

export type ChainData = {
  chainId: string;
  blockTime: number[];
  height: number;
  blockTimestamp: number;
  maxCensusSize: number;
};

/**
 * @typedef AccountData
 * @property {string} address
 * @property {number} balance
 * @property {number} nonce
 * @property {number} electionIndex
 * @property {string | null} infoURL
 * @property {Account} account
 */
export type AccountData = {
  address: string;
  balance: number;
  nonce: number;
  electionIndex: number;
  infoURL?: string;
  account: Account;
};

type AccountToken = {
  identifier: string;
  wallet: Wallet;
};

/**
 * @typedef CensusProof
 * @property {string} weight
 * @property {string} proof
 * @property {string} value
 */
export type CensusProof = {
  type: CensusType;
  weight: string;
  root: string;
  proof: string;
  value: string;
  siblings?: Array<string>;
};

/**
 * @typedef CspCensusProof
 * @property {string} type
 * @property {string} address
 * @property {string} signature
 * @property {bigint} weight
 */
export type CspCensusProof = {
  type?: number;
  address: string;
  signature: string;
  weight?: bigint;
};

/**
 * @typedef FaucetPackage
 * @property {string} payload
 * @property {string} signature
 */
export type FaucetPackage = {
  payload: string;
  signature: string;
};

export enum EnvOptions {
  DEV = 'dev',
  STG = 'stg',
  PROD = 'prod',
}

/**
 * Specify custom Faucet.
 *
 * @typedef FaucetOptions
 * @property {string} url
 * @property {string | null} auth_token
 * @property {number | null} token_limit
 */
type FaucetOptions = {
  url: string;
  auth_token?: string;
  token_limit?: number;
};

/**
 * Specify custom retry times and attempts when waiting for a transaction.
 *
 * @typedef TxWaitOptions
 * @property {number | null} retry_time
 * @property {number | null} attempts
 */
type TxWaitOptions = {
  retry_time?: number;
  attempts?: number;
};

export type ChainCosts = IChainGetCostsResponse;

export type ChainCircuits = {
  zKeyData: Uint8Array;
  zKeyHash: string;
  zKeyURI: string;
  vKeyData: Uint8Array;
  vKeyHash: string;
  vKeyURI: string;
  wasmData: Uint8Array;
  wasmHash: string;
  wasmURI: string;
};

/**
 * Optional VocdoniSDKClient arguments
 *
 * @typedef ClientOptions
 * @property {EnvOptions} env enum with possible values `DEV`, `STG`, `PROD`
 * @property {string | null } api_url API url location
 * @property {Wallet | Signer | null} wallet `Wallet` or `Signer` object from `ethersproject` library
 * @property {string | null} electionId Required by other methods like `submitVote` or `createElection`.
 * @property {FaucetOptions | null} faucet Specify custom Faucet options
 */
export type ClientOptions = {
  env: EnvOptions;
  api_url?: string;
  wallet?: Wallet | Signer;
  electionId?: string;
  faucet?: FaucetOptions;
  tx_wait?: TxWaitOptions;
};

/**
 * Main Vocdoni client object. It's a wrapper for all the methods in api, core
 * and types, allowing you to easily use the vocdoni API from a single entry
 * point.
 */
export class VocdoniSDKClient {
  private chainData: ChainData | null = null;
  private chainCosts: ChainCosts | null = null;
  private chainCircuits: ChainCircuits | null = null;
  private accountData: AccountData | null = null;
  private election: UnpublishedElection | PublishedElection | null = null;
  private authToken: AccountToken | null = null;

  public url: string;
  public wallet: Wallet | Signer | null;
  public electionId: string | null;
  public explorerUrl: string;
  public faucet: FaucetOptions | null;
  public tx_wait: TxWaitOptions | null;

  private cspInformation;

  /**
   * Instantiate new VocdoniSDK client.
   *
   * To instantiate the client just pass the `ClientOptions` you want or empty object to let defaults.
   *
   * `const client = new VocdoniSDKClient({EnvOptions.PROD})`
   *
   * @param {ClientOptions} opts optional arguments
   */
  constructor(opts: ClientOptions) {
    this.url = opts.api_url ?? API_URL[opts.env];
    this.wallet = opts.wallet;
    this.electionId = opts.electionId;
    this.faucet = {
      url: opts.faucet?.url ?? FAUCET_URL[opts.env] ?? undefined,
      auth_token: opts.faucet?.auth_token ?? FAUCET_AUTH_TOKEN[opts.env] ?? undefined,
      token_limit: opts.faucet?.token_limit,
    };
    this.tx_wait = {
      retry_time: opts.tx_wait?.retry_time ?? TX_WAIT_OPTIONS.retry_time,
      attempts: opts.tx_wait?.attempts ?? TX_WAIT_OPTIONS.attempts,
    };
    this.explorerUrl = EXPLORER_URL[opts.env];
  }

  /**
   * Sets an election id. Required by other methods like submitVote or createElection.
   *
   * @param {string} electionId Election id string
   */
  setElectionId(electionId: string) {
    this.electionId = electionId;
  }

  async cspUrl(): Promise<string> {
    invariant(this.electionId, 'No election id set');
    invariant(!this.election || this.election.census.type === CensusType.CSP, 'Election set is not from CSP type');

    if (!this.election) {
      await this.fetchElection();
    }

    return this.election.census.censusURI;
  }

  async cspInfo() {
    invariant(await this.cspUrl(), 'No CSP URL set');

    this.cspInformation = await this.cspUrl().then((cspUrl) => CspAPI.info(cspUrl));
    return this.cspInformation;
  }

  async cspStep(stepNumber: number, data: any[], authToken?: string) {
    invariant(await this.cspUrl(), 'No CSP URL set');
    if (!this.cspInformation) {
      await this.cspInfo();
    }

    return this.cspUrl().then((cspUrl) =>
      CspAPI.step(
        cspUrl,
        this.electionId,
        this.cspInformation.signatureType[0],
        this.cspInformation.authType,
        stepNumber,
        data,
        authToken
      )
    );
  }

  async cspSign(address: string, token: string) {
    invariant(await this.cspUrl(), 'No CSP URL set');
    if (!this.cspInformation) {
      await this.cspInfo();
    }

    const { hexBlinded: blindedPayload, userSecretData } = getBlindedPayload(this.electionId, token, address);

    return this.cspUrl()
      .then((cspUrl) =>
        CspAPI.sign(cspUrl, this.electionId, this.cspInformation.signatureType[0], blindedPayload, token)
      )
      .then((signature) => CensusBlind.unblind(signature.signature, userSecretData));
  }

  cspVote(vote: Vote, signature: string): CspVote {
    return new CspVote(vote.votes, signature);
  }

  /**
   * Fetches blockchain information if needed and returns the chain id.
   *
   * @returns {Promise<string>}
   */
  fetchChainId(): Promise<string> {
    if (this.chainData?.chainId) {
      return Promise.resolve(this.chainData.chainId);
    }

    return ChainAPI.info(this.url).then((chainData) => {
      this.chainData = chainData;
      return chainData.chainId;
    });
  }

  /**
   * Fetches blockchain costs information if needed.
   *
   * @returns {Promise<ChainCosts>}
   */
  fetchChainCosts(): Promise<ChainCosts> {
    if (this.chainCosts) {
      return Promise.resolve(this.chainCosts);
    }

    return ChainAPI.costs(this.url).then((chainCosts) => {
      this.chainCosts = chainCosts;
      return chainCosts;
    });
  }

  /**
   * Checks circuit hashes
   *
   * @returns {ChainCircuits} The checked circuit parameters
   */
  private checkCircuitsHashes(): ChainCircuits {
    invariant(this.chainCircuits, 'Circuits not set');
    invariant(
      strip0x(sha256(this.chainCircuits.zKeyData)) === strip0x(this.chainCircuits.zKeyHash),
      'Invalid hash check for zKey'
    );
    invariant(
      strip0x(sha256(this.chainCircuits.vKeyData)) === strip0x(this.chainCircuits.vKeyHash),
      'Invalid hash check for vKey'
    );
    invariant(
      strip0x(sha256(this.chainCircuits.wasmData)) === strip0x(this.chainCircuits.wasmHash),
      'Invalid hash check for WASM'
    );

    return this.chainCircuits;
  }

  /**
   * Sets circuits for anonymous voting
   *
   * @param {ChainCircuits} circuits Custom circuits
   * @returns {Promise<ChainCircuits>}
   */
  setCircuits(circuits: ChainCircuits): ChainCircuits {
    this.chainCircuits = circuits;
    return this.checkCircuitsHashes();
  }

  /**
   * Fetches circuits for anonymous voting
   *
   * @param {Omit<ChainCircuits, 'zKeyData' | 'vKeyData' | 'wasmData'>} circuits Additional options for custom circuits
   * @returns {Promise<ChainCircuits>}
   */
  fetchCircuits(circuits?: Omit<ChainCircuits, 'zKeyData' | 'vKeyData' | 'wasmData'>): Promise<ChainCircuits> {
    const empty = {
      zKeyData: new Uint8Array(),
      vKeyData: new Uint8Array(),
      wasmData: new Uint8Array(),
    };
    if (circuits) {
      this.chainCircuits = {
        ...circuits,
        ...empty,
      };
    }

    const setCircuitInfo = this.chainCircuits
      ? Promise.resolve(this.chainCircuits)
      : ChainAPI.circuits(this.url).then((chainCircuits) => {
          this.chainCircuits = {
            zKeyHash: chainCircuits.zKeyHash,
            zKeyURI: chainCircuits.uri + '/' + chainCircuits.circuitPath + '/' + chainCircuits.zKeyFilename,
            vKeyHash: chainCircuits.vKeyHash,
            vKeyURI: chainCircuits.uri + '/' + chainCircuits.circuitPath + '/' + chainCircuits.vKeyFilename,
            wasmHash: chainCircuits.wasmHash,
            wasmURI: chainCircuits.uri + '/' + chainCircuits.circuitPath + '/' + chainCircuits.wasmFilename,
            ...empty,
          };
          return this.chainCircuits;
        });

    return setCircuitInfo
      .then(() =>
        Promise.all([
          ChainAPI.circuit(this.chainCircuits.zKeyURI),
          ChainAPI.circuit(this.chainCircuits.vKeyURI),
          ChainAPI.circuit(this.chainCircuits.wasmURI),
        ])
      )
      .then((files) => {
        this.chainCircuits.zKeyData = files[0];
        this.chainCircuits.vKeyData = files[1];
        this.chainCircuits.wasmData = files[2];
        return this.checkCircuitsHashes();
      });
  }

  /**
   * Fetches account information.
   *
   * @param {string} address The account address to fetch the information
   * @returns {Promise<AccountData>}
   */
  async fetchAccountInfo(address?: string): Promise<AccountData> {
    let accountData;
    if (!this.wallet && !address) {
      throw Error('No account set');
    } else if (address) {
      accountData = await AccountAPI.info(this.url, address);
    } else {
      accountData = await this.wallet.getAddress().then((address) => AccountAPI.info(this.url, address));
    }

    this.accountData = accountData;
    this.accountData.account = Account.build({
      languages: accountData.metadata?.languages,
      name: accountData.metadata?.name,
      description: accountData.metadata?.description,
      feed: accountData.metadata?.newsFeed,
      header: accountData.metadata?.media?.header,
      avatar: accountData.metadata?.media?.avatar,
      logo: accountData.metadata?.media?.logo,
      meta: Object.entries(accountData.metadata?.meta ?? []).map(([key, value]) => ({ key, value })),
    });

    return this.accountData;
  }

  /**
   * Fetches the CID expected for the specified data content.
   *
   * @param {string} data The data of which we want the CID of
   * @returns {Promise<string>} Resulting CID
   */
  calculateCID(data: string): Promise<string> {
    return FileAPI.cid(this.url, data).then((data) => data.cid);
  }

  /**
   * Fetches a faucet payload. Only for development.
   *
   * @returns {Promise<{string}>}
   */
  fetchFaucetPayload(): Promise<string> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(this.faucet.url, 'No faucet URL');
    invariant(this.faucet.auth_token, 'No faucet auth token');
    return this.wallet
      .getAddress()
      .then((address) => FaucetAPI.collect(this.faucet.url, this.faucet.auth_token, address))
      .then((data) => data.faucetPackage);
  }

  /**
   * Parses a faucet package.
   *
   * @returns {FaucetPackage}
   */
  parseFaucetPackage(faucetPackage: string): FaucetPackage {
    try {
      const jsonFaucetPackage = JSON.parse(Buffer.from(faucetPackage, 'base64').toString());
      return { payload: jsonFaucetPackage.faucetPayload, signature: jsonFaucetPackage.signature };
    } catch (e) {
      throw new Error('Invalid faucet package');
    }
  }

  /**
   * Fetches the specific account token auth and sets it to the current instance.
   *
   * @returns {Promise<void>}
   */
  fetchAccountToken(): Promise<void> {
    if (this.authToken) {
      return Promise.resolve();
    }

    this.authToken = {
      identifier: '',
      wallet: Wallet.createRandom(),
    };

    return WalletAPI.add(this.url, this.authToken.wallet.privateKey).then((addWalletResponse) => {
      this.authToken.identifier = addWalletResponse.token;
    });
  }

  /**
   * Fetches info about an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<UnpublishedElection>}
   */
  async fetchElection(electionId?: string): Promise<PublishedElection> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }

    const electionInfo = await ElectionAPI.info(this.url, electionId ?? this.electionId);

    return this.fetchCensusInfo(electionInfo.census.censusRoot)
      .then((censusInfo) =>
        PublishedElection.build({
          id: electionInfo.electionId,
          organizationId: electionInfo.organizationId,
          title: electionInfo.metadata?.title,
          description: electionInfo.metadata?.description,
          header: electionInfo.metadata?.media.header,
          streamUri: electionInfo.metadata?.media.streamUri,
          meta: electionInfo.metadata?.meta,
          startDate: electionInfo.startDate,
          endDate: electionInfo.endDate,
          census: new PublishedCensus(
            electionInfo.census.censusRoot,
            electionInfo.census.censusURL,
            censusInfo.type ??
              Census.censusTypeFromCensusOrigin(electionInfo.census.censusOrigin, electionInfo.voteMode.anonymous),
            censusInfo.size,
            censusInfo.weight
          ),
          maxCensusSize: electionInfo.census.maxCensusSize,
          manuallyEnded: electionInfo.manuallyEnded,
          status: electionInfo.status,
          voteCount: electionInfo.voteCount,
          finalResults: electionInfo.finalResults,
          results: electionInfo.result,
          metadataURL: electionInfo.metadataURL,
          creationTime: electionInfo.creationTime,
          electionType: {
            autoStart: electionInfo.electionMode.autoStart,
            interruptible: electionInfo.electionMode.interruptible,
            dynamicCensus: electionInfo.electionMode.dynamicCensus,
            secretUntilTheEnd: electionInfo.voteMode.encryptedVotes,
            anonymous: electionInfo.voteMode.anonymous,
          },
          voteType: {
            uniqueChoices: electionInfo.voteMode.uniqueValues,
            maxVoteOverwrites: electionInfo.tallyMode.maxVoteOverwrites,
            costFromWeight: electionInfo.voteMode.costFromWeight,
            costExponent: electionInfo.tallyMode.costExponent,
            maxCount: electionInfo.tallyMode.maxCount,
            maxValue: electionInfo.tallyMode.maxValue,
            maxTotalCost: electionInfo.tallyMode.maxTotalCost,
          },
          questions: electionInfo.metadata?.questions.map((question, qIndex) => ({
            title: question.title,
            description: question.description,
            choices: question.choices.map((choice, cIndex) => ({
              title: choice.title,
              value: choice.value,
              results: electionInfo.result ? electionInfo.result[qIndex][cIndex] : null,
            })),
          })),
          raw: electionInfo,
        })
      )
      .then((election) => {
        this.election = election;
        return election;
      })
      .catch((err) => {
        err.electionId = electionInfo.electionId;
        throw err;
      });
  }

  async fetchElections(account?: string, page: number = 0): Promise<Array<PublishedElection | InvalidElection>> {
    let electionList;
    if (!this.wallet && !account) {
      electionList = ElectionAPI.electionsList(this.url, page);
    } else {
      electionList = AccountAPI.electionsList(this.url, account ?? (await this.wallet.getAddress()), page);
    }

    return electionList
      .then((elections) =>
        allSettled(elections?.elections?.map((election) => this.fetchElection(election.electionId)) ?? [])
      )
      .then((elections) =>
        elections.map((election) =>
          election.status === 'fulfilled' ? election.value : new InvalidElection({ id: election?.reason?.electionId })
        )
      );
  }

  /**
   * A convenience method to wait for a transaction to be executed. It will
   * loop trying to get the transaction information, and will retry every time
   * it fails.
   *
   * @param {string} tx Transaction to wait for
   * @param {number} wait The delay in milliseconds between tries
   * @param {attempts} attempts The attempts to try before failing
   * @returns {Promise<void>}
   */
  waitForTransaction(tx: string, wait?: number, attempts?: number): Promise<void> {
    const waitTime = wait ?? this.tx_wait.retry_time;
    const attemptsNum = attempts ?? this.tx_wait.attempts;
    return attemptsNum === 0
      ? Promise.reject('Time out waiting for transaction: ' + tx)
      : ChainAPI.txInfo(this.url, tx)
          .then(() => Promise.resolve())
          .catch(() => delay(waitTime).then(() => this.waitForTransaction(tx, waitTime, attemptsNum - 1)));
  }

  /**
   * Fetches proof that an address is part of the specified census.
   *
   * @param {string} censusId Census we want to check the address against
   * @param {string} key The address to be found
   * @returns {Promise<CensusProof>}
   */
  async fetchProof(censusId: string, key: string): Promise<CensusProof> {
    return CensusAPI.proof(this.url, censusId, key).then((censusProof) => ({
      type: censusProof.type,
      weight: censusProof.weight,
      root: censusProof.censusRoot,
      proof: censusProof.censusProof,
      value: censusProof.value,
      siblings: censusProof.censusSiblings ?? null,
    }));
  }

  /**
   * Fetches proof that an address is part of the specified census.
   *
   * @param election
   * @param wallet
   * @returns {Promise<CensusProof>}
   */
  private fetchProofForWallet(election: PublishedElection, wallet: Wallet | Signer): Promise<CensusProof> {
    return wallet.getAddress().then((address) => this.fetchProof(election.census.censusId, address));
  }

  private async setAccountSIK(
    election: PublishedElection,
    sik: string,
    censusProof: CensusProof,
    wallet: Wallet | Signer
  ): Promise<void> {
    const address = await wallet.getAddress();
    const calculatedSIK = await calcSik(address, sik);
    const registerSIKTx = AccountCore.generateRegisterSIKTransaction(election.id, calculatedSIK, censusProof);
    return AccountCore.signTransaction(registerSIKTx, this.chainData.chainId, wallet)
      .then((signedTx) => ChainAPI.submitTx(this.url, signedTx))
      .then((data) => this.waitForTransaction(data.hash));
  }

  /**
   * Calculates ZK proof from given wallet.
   *
   * @param election
   * @param wallet
   * @returns {Promise<ZkProof>}
   */
  private async calcZKProofForWallet(election: PublishedElection, wallet: Wallet | Signer): Promise<ZkProof> {
    const address = await wallet.getAddress();
    const sik = await Signing.signRaw(new Uint8Array(Buffer.from(VOCDONI_SIK_PAYLOAD)), wallet);
    const censusProof = await this.fetchProofForWallet(election, wallet);

    await this.fetchAccountInfo(address).catch(() => this.setAccountSIK(election, sik, censusProof, wallet));

    return ZkAPI.proof(this.url, address)
      .then((zkProof) =>
        prepareCircuitInputs(
          election.id,
          address,
          '0',
          sik,
          censusProof.value,
          censusProof.value,
          zkProof.censusRoot,
          zkProof.censusSiblings,
          censusProof.root,
          censusProof.siblings
        )
      )
      .then((circuits) => this.generateZkProof(circuits));
  }

  /**
   * Creates an account with information.
   *
   * @param {{account: Account, faucetPackage: string | null, signedSikPayload: string | null}} options Additional options,
   * like extra information of the account, or the faucet package string.
   * @returns {Promise<AccountData>}
   */
  async createAccountInfo(options: {
    account: Account;
    faucetPackage?: string;
    signedSikPayload?: string;
  }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(options.account, 'No account');

    const faucetPackage = this.parseFaucetPackage(options.faucetPackage ?? (await this.fetchFaucetPayload()));

    const address = await this.wallet.getAddress();

    const calculatedSik = options?.signedSikPayload ? await calcSik(address, options.signedSikPayload) : null;

    const accountData = Promise.all([
      this.fetchChainId(),
      this.calculateCID(Buffer.from(JSON.stringify(options.account.generateMetadata()), 'utf8').toString('base64')),
    ]).then((data) =>
      AccountCore.generateCreateAccountTransaction(address, options.account, data[1], faucetPackage, calculatedSik)
    );

    return this.setAccountInfo(accountData);
  }

  /**
   * Updates an account with information
   *
   * @param {Account} account Account data.
   * @returns {Promise<AccountData>}
   */
  updateAccountInfo(account: Account): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(account, 'No account');

    const accountData = Promise.all([
      this.fetchAccountInfo(),
      this.fetchChainId(),
      this.calculateCID(Buffer.from(JSON.stringify(account.generateMetadata()), 'utf8').toString('base64')),
    ]).then((data) => AccountCore.generateUpdateAccountTransaction(data[0], account, data[2]));

    return this.setAccountInfo(accountData);
  }

  /**
   * Updates an account with information
   *
   * @param {Promise<{ tx: Uint8Array; metadata: string }>} promAccountData Account data promise in Tx form.
   * @returns {Promise<AccountData>}
   */
  private setAccountInfo(promAccountData: Promise<{ tx: Uint8Array; metadata: string }>): Promise<AccountData> {
    const accountTx = promAccountData.then((setAccountInfoTx) =>
      AccountCore.signTransaction(setAccountInfoTx.tx, this.chainData.chainId, this.wallet)
    );

    return Promise.all([promAccountData, accountTx])
      .then((accountInfo) => AccountAPI.setInfo(this.url, accountInfo[1], accountInfo[0].metadata))
      .then((txData) => this.waitForTransaction(txData.txHash))
      .then(() => this.fetchAccountInfo());
  }

  /**
   * Registers an account against vochain, so it can create new elections.
   *
   * @param {{account: Account | null, faucetPackage: string | null, sik: boolean | null}} options Additional
   * options, like extra information of the account, or the faucet package string
   * @returns {Promise<AccountData>}
   */
  createAccount(
    options: { account?: Account; faucetPackage?: string; sik?: boolean } = {
      account: null,
      faucetPackage: null,
      sik: true,
    }
  ): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    return this.fetchAccountInfo().catch(() => {
      if (options?.sik) {
        return Signing.signRaw(new Uint8Array(Buffer.from(VOCDONI_SIK_PAYLOAD)), this.wallet).then((signedPayload) =>
          this.createAccountInfo({
            account: options?.account ?? new Account(),
            faucetPackage: options?.faucetPackage,
            signedSikPayload: signedPayload,
          })
        );
      }
      return this.createAccountInfo({
        account: options?.account ?? new Account(),
        faucetPackage: options?.faucetPackage,
      });
    });
  }

  /**
   * Calls the faucet to get new tokens. Only under development.
   *
   * @returns {Promise<AccountData>} Account data information updated with new balance
   */
  collectFaucetTokens(): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    return Promise.all([this.fetchAccountInfo(), this.fetchFaucetPayload(), this.fetchChainId()])
      .then((data) => {
        const faucetPackage = this.parseFaucetPackage(data[1]);
        const collectFaucetTx = AccountCore.generateCollectFaucetTransaction(data[0], faucetPackage);
        return AccountCore.signTransaction(collectFaucetTx, data[2], this.wallet);
      })
      .then((signedTx) => ChainAPI.submitTx(this.url, signedTx))
      .then((txData) => this.waitForTransaction(txData.hash))
      .then(() => this.fetchAccountInfo());
  }

  /**
   * Publishes the given census.
   *
   * @param {PlainCensus | WeightedCensus} census The census to be published.
   * @returns {Promise<void>}
   */
  createCensus(census: PlainCensus | WeightedCensus): Promise<void> {
    const censusCreation = this.fetchAccountToken().then(() =>
      CensusAPI.create(this.url, this.authToken.identifier, census.type)
    );

    const censusAdding = censusCreation.then((censusCreateResponse) =>
      CensusAPI.add(this.url, this.authToken.identifier, censusCreateResponse.censusID, census.participants)
    );

    return Promise.all([censusCreation, censusAdding])
      .then((censusData) => CensusAPI.publish(this.url, this.authToken.identifier, censusData[0].censusID))
      .then((censusPublish) => {
        census.censusId = censusPublish.censusID;
        census.censusURI = censusPublish.uri;
        census.size = census.participants.length;
        census.weight = census.participants.reduce(
          (currentValue, participant) => currentValue + participant.weight,
          BigInt(0)
        );
      });
  }

  /**
   * Fetches the information of a given census.
   *
   * @param censusId
   * @returns {Promise<{size: number, weight: bigint}>}
   */
  fetchCensusInfo(censusId: string): Promise<{ size: number; weight: bigint; type: CensusType }> {
    return Promise.all([
      CensusAPI.size(this.url, censusId),
      CensusAPI.weight(this.url, censusId),
      CensusAPI.type(this.url, censusId),
    ])
      .then((censusInfo) => ({
        size: censusInfo[0].size,
        weight: BigInt(censusInfo[1].weight),
        type: censusInfo[2].type,
      }))
      .catch(() => ({
        size: undefined,
        weight: undefined,
        type: undefined,
      }));
  }

  /**
   * Creates a new voting election.
   *
   * @param {UnpublishedElection} election The election object to be created.
   * @returns {Promise<string>} Resulting election id.
   */
  async createElection(election: UnpublishedElection): Promise<string> {
    invariant(
      election.maxCensusSize || election.census.type !== CensusType.CSP,
      'CSP Census needs a max census size set in the election'
    );

    if (election.electionType.anonymous) {
      election.census.type = CensusType.ANONYMOUS;
    }

    const chainId = await this.fetchChainId();

    if (!election.census.isPublished) {
      await this.createCensus(election.census as PlainCensus | WeightedCensus);
    } else if (!election.maxCensusSize && !election.census.size) {
      await this.fetchCensusInfo(election.census.censusId).then((censusInfo) => {
        election.census.size = censusInfo.size;
        election.census.weight = censusInfo.weight;
      });
    } else if (election.maxCensusSize && election.maxCensusSize > this.chainData.maxCensusSize) {
      throw new Error('Max census size for the election is greater than allowed size: ' + this.chainData.maxCensusSize);
    }

    if (election.census instanceof TokenCensus) {
      election.meta = { ...election.meta, ...{ token: election.census.token } };
    }

    const electionData = Promise.all([
      this.fetchAccountInfo(),
      this.calculateCID(Buffer.from(JSON.stringify(election.generateMetadata()), 'utf8').toString('base64')),
    ]).then((data) => ElectionCore.generateNewElectionTransaction(election, data[1], this.chainData, data[0]));

    const electionPackage = electionData.then((newElectionData) =>
      ElectionCore.signTransaction(newElectionData.tx, chainId, this.wallet)
    );

    const electionTx = await Promise.all([electionData, electionPackage]).then((election) =>
      ElectionAPI.create(this.url, election[1], election[0].metadata)
    );

    return this.waitForTransaction(electionTx.txHash).then(() => electionTx.electionID);
  }

  /**
   * Ends an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  endElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.ENDED);
  }

  /**
   * Pauses an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  pauseElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.PAUSED);
  }

  /**
   * Cancels an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  cancelElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.CANCELED);
  }

  /**
   * Continues an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  continueElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatusReady.READY);
  }

  /**
   * Changes the status of an election.
   *
   * @param {string} electionId The id of the election
   * @param {ElectionStatus} newStatus The new status
   * @returns {Promise<void>}
   */
  private changeElectionStatus(electionId: string, newStatus: AllElectionStatus): Promise<void> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    return this.fetchAccountInfo()
      .then((accountData) =>
        Promise.all([
          ElectionCore.generateSetElectionStatusTransaction(
            electionId ?? this.electionId,
            accountData.nonce,
            newStatus
          ),
          this.fetchChainId(),
        ])
      )
      .then((data) => ElectionCore.signTransaction(data[0], data[1], this.wallet))
      .then((signedTx) => ChainAPI.submitTx(this.url, signedTx))
      .then((data) => this.waitForTransaction(data.hash));
  }

  /**
   * Changes the census of an election.
   *
   * @param {string} electionId The id of the election
   * @param {string} censusId The new census id (root)
   * @param {string} censusURI The new census URI
   * @returns {Promise<void>}
   */
  public changeElectionCensus(electionId: string, censusId: string, censusURI: string): Promise<void> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    return this.fetchAccountInfo()
      .then((accountData) =>
        Promise.all([
          ElectionCore.generateSetElectionCensusTransaction(
            electionId ?? this.electionId,
            accountData.nonce,
            censusId,
            censusURI
          ),
          this.fetchChainId(),
        ])
      )
      .then((data) => ElectionCore.signTransaction(data[0], data[1], this.wallet))
      .then((signedTx) => ChainAPI.submitTx(this.url, signedTx))
      .then((data) => this.waitForTransaction(data.hash));
  }

  /**
   * Checks if the user is in census.
   *
   * @param {string} electionId The id of the election
   * @param {Object} key The key in the census to check
   * @returns {Promise<boolean>}
   */
  async isInCensus(electionId?: string, key?: string): Promise<boolean> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    if (!this.wallet && !key) {
      throw Error('No key given or Wallet not found');
    }

    const election = await this.fetchElection(electionId ?? this.electionId);
    let proofPromise;

    if (key) {
      proofPromise = this.fetchProof(election.census.censusId, key);
    } else if (election) {
      proofPromise = this.fetchProofForWallet(election, this.wallet);
    } else {
      proofPromise = Promise.reject();
    }

    return proofPromise.then(() => true).catch(() => false);
  }

  /**
   * Checks if the user has already voted
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<string>} The id of the vote
   */
  hasAlreadyVoted(electionId?: string): Promise<string> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    if (!this.wallet) {
      throw Error('No wallet found');
    }

    return this.wallet
      .getAddress()
      .then((address) => VoteAPI.info(this.url, keccak256(address.toLowerCase() + (electionId ?? this.electionId))))
      .then((voteInfo) => voteInfo.voteID)
      .catch(() => null);
  }

  /**
   * Checks if the user is able to vote
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<boolean>}
   */
  isAbleToVote(electionId?: string): Promise<boolean> {
    return this.votesLeftCount(electionId)
      .then((votesLeftCount) => votesLeftCount > 0)
      .catch(() => false);
  }

  /**
   * Checks how many times a user can submit their vote
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<number>}
   */
  async votesLeftCount(electionId?: string): Promise<number> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    if (!this.wallet) {
      throw Error('No wallet found');
    }

    const isInCensus = await this.isInCensus(electionId ?? this.electionId);
    if (!isInCensus) {
      throw Error('Not in census');
    }

    const election = await this.fetchElection(electionId ?? this.electionId);

    return this.wallet
      .getAddress()
      .then((address) => VoteAPI.info(this.url, keccak256(address.toLowerCase() + election.id)))
      .then((voteInfo) => election.voteType.maxVoteOverwrites - voteInfo.overwriteCount)
      .catch(() => election.voteType.maxVoteOverwrites + 1);
  }

  /**
   * Submits a vote to the current instance election id.
   *
   * @param {Vote | CspVote} vote The vote (or votes) to be sent.
   * @returns {Promise<string>} Vote confirmation id.
   */
  async submitVote(vote: Vote | CspVote): Promise<string> {
    if (this.election instanceof UnpublishedElection) {
      throw Error('Election is not published');
    }

    if (!this.wallet) {
      throw Error('No wallet set');
    }

    const election = await this.fetchElection();

    let censusProof: CspCensusProof | CensusProof | ZkProof;
    if (election.census.type == CensusType.WEIGHTED) {
      censusProof = await this.fetchProofForWallet(election, this.wallet);
    } else if (election.census.type == CensusType.ANONYMOUS) {
      censusProof = await this.calcZKProofForWallet(election, this.wallet);
    } else if (election.census.type == CensusType.CSP && vote instanceof CspVote) {
      censusProof = {
        address: await this.wallet.getAddress(),
        signature: vote.signature,
      };
    } else {
      throw new Error('No valid vote for this election');
    }

    let voteTx;
    if (election?.electionType.secretUntilTheEnd) {
      voteTx = ElectionAPI.keys(this.url, election.id).then((encryptionKeys) =>
        Promise.all([
          VoteCore.generateVoteTransaction(election, censusProof, vote, {
            encryptionPubKeys: encryptionKeys.publicKeys,
          }),
          this.fetchChainId(),
        ])
      );
    } else {
      voteTx = Promise.all([VoteCore.generateVoteTransaction(election, censusProof, vote), this.fetchChainId()]);
    }

    // Vote
    return voteTx
      .then((data) => VoteCore.signTransaction(data[0], data[1], this.wallet))
      .then((signedTx) => VoteAPI.submit(this.url, signedTx))
      .then((apiResponse) => this.waitForTransaction(apiResponse.txHash).then(() => apiResponse.voteID));
  }

  /**
   * Assigns a random Wallet to the client and returns its private key.
   *
   * @returns {string} The private key.
   */
  public generateRandomWallet(): string {
    const wallet = Wallet.createRandom();
    this.wallet = wallet;
    return wallet.privateKey;
  }

  /**
   * Estimates the election cost
   *
   * @returns {Promise<number>} The cost in tokens.
   */
  public estimateElectionCost(election: UnpublishedElection): Promise<number> {
    return Promise.all([this.fetchChainCosts(), this.fetchChainId()])
      .then(() => ElectionCore.estimateElectionCost(election, this.chainCosts, this.chainData))
      .then((cost) => Math.trunc(cost));
  }

  /**
   * Calculate the election cost
   *
   * @returns {Promise<number>} The cost in tokens.
   */
  public calculateElectionCost(election: UnpublishedElection): Promise<number> {
    return this.fetchChainId()
      .then(() =>
        ElectionAPI.price(
          this.url,
          election.maxCensusSize,
          ElectionCore.estimateElectionBlocks(election, this.chainData),
          election.electionType.secretUntilTheEnd,
          election.electionType.anonymous,
          election.voteType.maxVoteOverwrites
        )
      )
      .then((cost) => cost.price);
  }

  /**
   * Returns a Wallet based on the inputs.
   *
   * @param {string | string[]} data The data inputs which should generate the Wallet
   * @returns {Wallet} The deterministic wallet.
   */
  public static generateWalletFromData(data: string | string[]): Wallet {
    const inputs = Array.isArray(data) ? data : [data];
    const hash = inputs.reduce((acc, curr) => acc + curr, '');
    return new Wallet(keccak256(Buffer.from(hash)));
  }

  private async generateZkProof(inputs: CircuitInputs): Promise<ZkProof> {
    return this.fetchCircuits().then((circuits) => generateGroth16Proof(inputs, circuits.wasmData, circuits.zKeyData));
  }
}
