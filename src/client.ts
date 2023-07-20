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
import { CensusProofType, VoteCore } from './core/vote';
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
import { API_URL, EXPLORER_URL, FAUCET_AUTH_TOKEN, FAUCET_URL, TX_WAIT_OPTIONS } from './util/constants';
import { CensusBlind, getBlindedPayload } from './util/blind-signing';
import { allSettled } from './util/promise';
import { sha256 } from '@ethersproject/sha2';
import { CircuitInputs, prepareCircuitInputs } from './util/zk/inputs';
import { generateGroth16Proof } from './util/zk/prover';

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
 * @typedef OffchainCensusProof
 * @property {string} weight
 * @property {string} proof
 * @property {string} value
 * @property {CensusProofType} type
 */
export type OffchainCensusProof = {
  weight: string;
  proof: string;
  value: string;
  type: CensusProofType;
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
            Census.censusTypeFromCensusOrigin(electionInfo.census.censusOrigin),
            censusInfo.size,
            censusInfo.weight
          ),
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
   * @param {CensusProofType} type Type of census
   * @returns {Promise<OffchainCensusProof>}
   */
  async fetchProof(censusId: string, key: string, type: CensusProofType): Promise<OffchainCensusProof> {
    return CensusAPI.proof(this.url, censusId, key).then((censusProof) => {
      return { ...censusProof, type };
    });
  }

  /**
   * Fetches proof that an address is part of the specified census.
   *
   * @param election
   * @param wallet
   * @returns {Promise<OffchainCensusProof>}
   */
  private fetchProofForWallet(election: PublishedElection, wallet: Wallet | Signer): Promise<OffchainCensusProof> {
    return wallet
      .getAddress()
      .then((address) => this.fetchProof(election.census.censusId, address, CensusProofType.ADDRESS));
  }

  /**
   * Creates an account with information.
   *
   * @param {{account: Account, faucetPackage: string | null}} options Additional options,
   * like extra information of the account, or the faucet package string.
   * @returns {Promise<AccountData>}
   */
  async createAccountInfo(options: { account: Account; faucetPackage?: string }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(options.account, 'No account');

    const faucetPackage = this.parseFaucetPackage(options.faucetPackage ?? (await this.fetchFaucetPayload()));

    const accountData = Promise.all([
      this.wallet.getAddress(),
      this.fetchChainId(),
      this.calculateCID(Buffer.from(JSON.stringify(options.account.generateMetadata()), 'utf8').toString('base64')),
    ]).then((data) => AccountCore.generateCreateAccountTransaction(data[0], options.account, data[2], faucetPackage));

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
   * @param {{account: Account | null, faucetPackage: string | null}} options Additional
   * options, like extra information of the account, or the faucet package string
   * @returns {Promise<AccountData>}
   */
  createAccount(options?: { account?: Account; faucetPackage?: string }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    return this.fetchAccountInfo().catch(() =>
      this.createAccountInfo({ account: options?.account ?? new Account(), faucetPackage: options?.faucetPackage })
    );
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
  fetchCensusInfo(censusId: string): Promise<{ size: number; weight: bigint }> {
    return Promise.all([CensusAPI.size(this.url, censusId), CensusAPI.weight(this.url, censusId)])
      .then((censusInfo) => ({
        size: censusInfo[0].size,
        weight: BigInt(censusInfo[1].weight),
      }))
      .catch(() => ({
        size: undefined,
        weight: undefined,
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
      proofPromise = this.fetchProof(election.census.censusId, key, CensusProofType.ADDRESS);
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

    let censusProof: CspCensusProof | OffchainCensusProof;
    if (election.census.type == CensusType.WEIGHTED) {
      censusProof = await this.fetchProofForWallet(election, this.wallet);
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

  private async generateGroth16Proof(inputs: CircuitInputs): Promise<any> {
    return this.fetchCircuits({
      zKeyHash: 'a42bf48a706aa24a78e364f769d9576c3ee7b453fefacafdcee4e1335ff5365f',
      zKeyURI:
        'https://raw.githubusercontent.com/vocdoni/zk-franchise-proof-circuit/9a2c24e5c0fdddc77f65cac16a9e411dabeb1725/artifacts/zkCensus/dev/160/proving_key.zkey',
      vKeyHash: '24c4c4f6ca2a48c41e95d324c48b4428d4794d7e6fbeb9c840221ad797bcae56',
      vKeyURI:
        'https://raw.githubusercontent.com/vocdoni/zk-franchise-proof-circuit/9a2c24e5c0fdddc77f65cac16a9e411dabeb1725/artifacts/zkCensus/dev/160/verification_key.json',
      wasmHash: '0fe608036ef46ca58395c86b6b31b3c54edd79f331d003b7769c999ace38abfc',
      wasmURI:
        'https://raw.githubusercontent.com/vocdoni/zk-franchise-proof-circuit/9a2c24e5c0fdddc77f65cac16a9e411dabeb1725/artifacts/zkCensus/dev/160/circuit.wasm',
    }).then((circuits) => generateGroth16Proof(inputs, circuits.wasmData, circuits.zKeyData));
  }

  // dummy function to test snarkjs integration
  async dummy() {
    const start = Date.now();
    const apiInputs = {
      availableWeight: '10',
      cikRoot: '8249099760907167789571303445229571020142579550816399551344063388758746358298',
      cikSiblings: [
        '7548158814310825343542451035513910435175908869118880827293082019140308928765',
        '7621616467852048598984306939476316508903164606437232069863966962716987421574',
        '0',
        '18616412528782094425570523485399800126649249730262010043759673549343655698710',
        '9435966446765861998449762818553607928871451298821960692184639206470581874262',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
      ],
      censusRoot: '11177228488345865753134984371979258733075585988910587528690250331384779468608',
      censusSiblings: [
        '12940653407944391992631250845953962507824817648629121074758866002450631761908',
        '21269862985882725828037322963542871197672714891820625500210977910628481463112',
        '0',
        '134181927717507984641610333591947729623167601209884374561715717589118869884',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
      ],
    };
    const clientInputs = {
      electionId: '7faeab7a7d250527d614e952ae8e446825bd1124c6def410844c7c383d1519a6',
      address: 'B1F05B11Ba3d892EdD00f2e7689779E2B8841827',
      password: 'df8634ab3b14536cb7a6953b1128ec6742726483bc5bb13605891600fd5ec35b',
      signature:
        '3a7806f4e0b5bda625d465abf5639ba42ac9b91bafea3b800a4afff840be8d55333c286c7e21c91850a99efb5008847eaf653e3a5776f64f4d3b405afd5dcde61c',
      voteWeight: '5',
    };
    // computing full inputs including those that come from the API
    const inputs = await prepareCircuitInputs(
      // client inputs
      clientInputs.electionId,
      clientInputs.address,
      clientInputs.password,
      clientInputs.signature,
      clientInputs.voteWeight,
      // api inputs
      apiInputs.availableWeight,
      apiInputs.cikRoot,
      apiInputs.cikSiblings,
      apiInputs.censusRoot,
      apiInputs.censusSiblings
    );
    console.log('inputs done');

    console.log('generating proof');
    const results = await this.generateGroth16Proof(inputs);
    console.log('proof done', results);
    const end = Date.now();
    console.log(`proof took ${(end - start) / 1000}s`);
  }
}
