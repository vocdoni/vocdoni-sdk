import { Signer } from '@ethersproject/abstract-signer';
import { keccak256 } from '@ethersproject/keccak256';
import { computePublicKey } from '@ethersproject/signing-key';
import { Wallet } from '@ethersproject/wallet';
import { Buffer } from 'buffer';
import invariant from 'tiny-invariant';
import { AccountAPI, CensusAPI, ChainAPI, ElectionAPI, FaucetAPI, FileAPI, VoteAPI, WalletAPI } from './api';
import { AccountCore } from './core/account';
import { ElectionCore } from './core/election';
import { CensusProofType, VoteCore } from './core/vote';
import {
  Account,
  Census,
  CensusType,
  PlainCensus,
  PublishedCensus,
  PublishedElection,
  UnpublishedElection,
  Vote,
  CspVote,
  WeightedCensus,
  ElectionStatus,
  ElectionStatusReady,
  AllElectionStatus,
} from './types';
import { delay, strip0x } from './util/common';
import { promiseAny } from './util/promise';
import { API_URL, FAUCET_AUTH_TOKEN, FAUCET_URL, TX_WAIT_OPTIONS } from './util/constants';
import { isWallet } from './util/signing';
import { CspAPI } from './api/csp';
import { CensusBlind, getBlindedPayload } from './util/blind-signing';

export type ChainData = {
  chainId: string;
  blockTime: number[];
  height: number;
  blockTimestamp: number;
};

/**
 * @typedef AccountData
 * @property {string} address
 * @property {number} balance
 * @property {number} nonce
 * @property {number} electionIndex
 * @property {string | null} infoURL
 */
export type AccountData = {
  address: string;
  balance: number;
  nonce: number;
  electionIndex: number;
  infoURL?: string;
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
  csp_url?: string;
  tx_wait?: TxWaitOptions;
};

/**
 * Main Vocdoni client object. It's a wrapper for all the methods in api, core
 * and types, allowing you to easily use the vocdoni API from a single entry
 * point.
 */
export class VocdoniSDKClient {
  private chainData: ChainData | null = null;
  private accountData: AccountData | null = null;
  private election: UnpublishedElection | PublishedElection | null = null;
  private authToken: AccountToken | null = null;

  public url: string;
  public wallet: Wallet | Signer | null;
  public electionId: string | null;
  public faucet: FaucetOptions | null;
  public tx_wait: TxWaitOptions | null;

  public csp_url: string | null;
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
    this.csp_url = opts.csp_url ?? null;
    this.tx_wait = {
      retry_time: opts.tx_wait?.retry_time ?? TX_WAIT_OPTIONS.retry_time,
      attempts: opts.tx_wait?.attempts ?? TX_WAIT_OPTIONS.attempts,
    };
  }

  /**
   * Sets an election id. Required by other methods like submitVote or createElection.
   *
   * @param {string} electionId Election id string
   */
  setElectionId(electionId: string) {
    this.electionId = electionId;
  }

  async cspInfo() {
    if (!this.csp_url) {
      throw new Error('Csp URL not set');
    }

    this.cspInformation = await CspAPI.info(this.csp_url);
    return this.cspInformation;
  }

  async cspStep(stepNumber: number, data: any[], authToken?: string) {
    if (!this.electionId || !this.csp_url) {
      throw new Error('Csp options not set');
    }
    if (!this.cspInformation) {
      await this.cspInfo();
    }

    return CspAPI.step(
      this.csp_url,
      this.electionId,
      this.cspInformation.signatureType[0],
      this.cspInformation.authType,
      stepNumber,
      data,
      authToken
    );
  }

  async cspSign(address: string, token: string) {
    if (!this.electionId || !this.csp_url) {
      throw new Error('Csp options not set');
    }
    if (!this.cspInformation) {
      await this.cspInfo();
    }

    const { hexBlinded: blindedPayload, userSecretData } = getBlindedPayload(this.electionId, token, address);

    const signature = await CspAPI.sign(
      this.csp_url,
      this.electionId,
      this.cspInformation.signatureType[0],
      blindedPayload,
      token
    );

    return CensusBlind.unblind(signature.signature, userSecretData);
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
   * Fetches account information.
   *
   * @returns {Promise<AccountData>}
   */
  async fetchAccountInfo(): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    this.accountData = await this.wallet.getAddress().then((address) => AccountAPI.info(this.url, address));
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
          title: electionInfo.metadata.title,
          description: electionInfo.metadata.description,
          header: electionInfo.metadata.media.header,
          streamUri: electionInfo.metadata.media.streamUri,
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
          electionCount: electionInfo.electionCount,
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
          },
          questions: electionInfo.metadata.questions.map((question, qIndex) => ({
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
      });
  }

  async fetchElections(account?: string, page: number = 0): Promise<Array<PublishedElection>> {
    let electionList;
    if (!this.wallet && !account) {
      electionList = ElectionAPI.electionsList(this.url, page);
    } else {
      electionList = AccountAPI.electionsList(this.url, account ?? (await this.wallet.getAddress()), page);
    }

    return electionList.then((elections) =>
      Promise.all(elections?.elections?.map((election) => this.fetchElection(election.electionId)) ?? [])
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
    return wallet.getAddress().then((address) => {
      if (isWallet(this.wallet)) {
        const { publicKey } = this.wallet as Wallet;
        return promiseAny([
          this.fetchProof(election.census.censusId, address, CensusProofType.ADDRESS),
          this.fetchProof(election.census.censusId, computePublicKey(publicKey, true), CensusProofType.PUBKEY),
        ]);
      } else {
        return this.fetchProof(election.census.censusId, address, CensusProofType.ADDRESS);
      }
    });
  }

  /**
   * Sets account information.
   *
   * @param {{account: Account, faucetPackage: string | null}} options Additional options,
   * like extra information of the account, or the faucet package string.
   * @returns {Promise<AccountData>}
   */
  async setAccountInfo(options: { account: Account; faucetPackage?: string }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(options.account, 'No account');

    const faucetPackage = this.parseFaucetPackage(options.faucetPackage ?? (await this.fetchFaucetPayload()));

    const accountData = Promise.all([
      this.wallet.getAddress(),
      this.fetchChainId(),
      this.calculateCID(Buffer.from(JSON.stringify(options.account.generateMetadata()), 'utf8').toString('base64')),
    ]).then((data) => AccountCore.generateSetAccountTransaction(data[0], options.account, data[2], faucetPackage));

    const accountTx = accountData.then((setAccountInfoTx) =>
      AccountCore.signTransaction(setAccountInfoTx.tx, this.chainData.chainId, this.wallet)
    );

    return Promise.all([accountData, accountTx])
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
      this.setAccountInfo({ account: options?.account ?? new Account(), faucetPackage: options?.faucetPackage })
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
      });
  }

  /**
   * Fetches the information of a given census.
   *
   * @param censusId
   * @returns {Promise<{size: number, weight: BigInt}>}
   */
  fetchCensusInfo(censusId: string): Promise<{ size: number; weight: BigInt }> {
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
    if (!election.census.isPublished) {
      await this.createCensus(election.census as PlainCensus | WeightedCensus);
    }

    const chainId = await this.fetchChainId();

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
   * Checks if the user is in census.
   *
   * @param {string} electionId The id of the election
   * @param {Object} key The key in the census to check
   * @returns {Promise<boolean>}
   */
  async isInCensus(electionId?: string, key?: { id: string; type: CensusProofType }): Promise<boolean> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    if (!this.wallet && !key) {
      throw Error('No key given or Wallet not found');
    }

    const election = await this.fetchElection(electionId ?? this.electionId);
    let proofPromise;

    if (key) {
      proofPromise = this.fetchProof(election.census.censusId, key.id, key.type);
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
   * @returns {Promise<boolean>}
   */
  hasAlreadyVoted(electionId?: string): Promise<boolean> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    if (!this.wallet) {
      throw Error('No wallet found');
    }

    return this.wallet
      .getAddress()
      .then((address) => VoteAPI.info(this.url, keccak256(address.toLowerCase() + (electionId ?? this.electionId))))
      .then((voteInfo) => voteInfo.electionID == strip0x(electionId ?? this.electionId))
      .catch(() => false);
  }

  /**
   * Checks if the user is able to vote
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<boolean>}
   */
  isAbleToVote(electionId?: string): Promise<boolean> {
    return Promise.all([this.isInCensus(electionId), this.votesLeftCount(electionId)])
      .then((res) => res[0] && res[1] > 0)
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
      voteTx = ElectionAPI.keys(this.url, election.id).then((encryptionPubKeys) =>
        Promise.all([
          VoteCore.generateVoteTransaction(election, censusProof, vote, { encryptionPubKeys }),
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
}
