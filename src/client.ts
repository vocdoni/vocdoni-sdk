import { Signer } from '@ethersproject/abstract-signer';
import { keccak256 } from '@ethersproject/keccak256';
import { Wallet } from '@ethersproject/wallet';
import { Buffer } from 'buffer';
import invariant from 'tiny-invariant';
import { AccountAPI, ChainAPI, ElectionAPI, FaucetAPI, FileAPI, VoteAPI } from './api';
import { AccountCore } from './core/account';
import { ElectionCore } from './core/election';
import { VoteCore } from './core/vote';
import {
  Account,
  AllElectionStatus,
  CensusType,
  CspVote,
  ElectionStatus,
  ElectionStatusReady,
  InvalidElection,
  PlainCensus,
  PublishedElection,
  TokenCensus,
  UnpublishedElection,
  Vote,
  WeightedCensus,
} from './types';
import { delay } from './util/common';
import {
  API_URL,
  EXPLORER_URL,
  FAUCET_AUTH_TOKEN,
  FAUCET_URL,
  TX_WAIT_OPTIONS,
  VOCDONI_SIK_PAYLOAD,
} from './util/constants';
import { Signing } from './util/signing';
import { AnonymousVote } from './types/vote/anonymous';
import {
  AnonymousService,
  CensusProof,
  CensusService,
  ChainCircuits,
  ChainService,
  CspCensusProof,
  CspService,
  ElectionService,
  ZkProof,
} from './services';

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
  tx_wait?: TxWaitOptions;
};

/**
 * Main Vocdoni client object. It's a wrapper for all the methods in api, core
 * and types, allowing you to easily use the vocdoni API from a single entry
 * point.
 */
export class VocdoniSDKClient {
  private accountData: AccountData | null = null;
  private election: UnpublishedElection | PublishedElection | null = null;

  public censusService: CensusService;
  public chainService: ChainService;
  public anonymousService: AnonymousService;
  public cspService: CspService;
  public electionService: ElectionService;

  public url: string;
  public wallet: Wallet | Signer | null;
  public electionId: string | null;
  public explorerUrl: string;
  public faucet: FaucetOptions | null;
  public tx_wait: TxWaitOptions | null;

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
    this.censusService = new CensusService({ url: this.url });
    this.chainService = new ChainService({ url: this.url });
    this.anonymousService = new AnonymousService({ url: this.url });
    this.electionService = new ElectionService({ url: this.url, censusService: this.censusService });
    this.cspService = new CspService({});
  }

  /**
   * Sets an election id. Required by other methods like submitVote or createElection.
   *
   * @param {string} electionId Election id string
   */
  setElectionId(electionId: string) {
    this.electionId = electionId;
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
   * Fetches info about an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<UnpublishedElection>}
   */
  async fetchElection(electionId?: string): Promise<PublishedElection> {
    invariant(this.electionId || electionId, 'No election set');

    this.election = await this.electionService.fetchElection(electionId ?? this.electionId);
    return this.election;
  }

  async fetchElections(account?: string, page: number = 0): Promise<Array<PublishedElection | InvalidElection>> {
    return this.electionService.fetchElections({ account: account ?? (await this.wallet?.getAddress()), page });
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
   * @param censusId
   * @param wallet
   * @returns {Promise<CensusProof>}
   */
  private fetchProofForWallet(censusId: string, wallet: Wallet | Signer): Promise<CensusProof> {
    return wallet.getAddress().then((address) => this.censusService.fetchProof(censusId, address));
  }

  private signSIKPayload(wallet: Wallet | Signer): Promise<string> {
    return Signing.signRaw(new Uint8Array(Buffer.from(VOCDONI_SIK_PAYLOAD)), wallet);
  }

  private setAccountSIK(
    electionId: string,
    sik: string,
    password: string,
    censusProof: CensusProof,
    wallet: Wallet | Signer
  ): Promise<void> {
    return wallet
      .getAddress()
      .then((address) => Promise.all([AnonymousService.calcSik(address, sik, password), this.fetchChainId()]))
      .then(([calculatedSIK, chainId]) => {
        const registerSIKTx = AccountCore.generateRegisterSIKTransaction(electionId, calculatedSIK, censusProof);
        return AccountCore.signTransaction(registerSIKTx, chainId, wallet);
      })
      .then((signedTx) => ChainAPI.submitTx(this.url, signedTx))
      .then((data) => this.waitForTransaction(data.hash));
  }

  /**
   * Calculates ZK proof from given wallet.
   *
   * @param election
   * @param wallet
   * @param password
   * @returns {Promise<ZkProof>}
   */
  private async calcZKProofForWallet(
    election: PublishedElection,
    wallet: Wallet | Signer,
    password: string = '0'
  ): Promise<ZkProof> {
    const [address, sik, censusProof] = await Promise.all([
      wallet.getAddress(),
      this.signSIKPayload(wallet),
      this.fetchProofForWallet(election.census.censusId, wallet),
    ]);

    return this.anonymousService
      .fetchAccountSIK(address)
      .catch(() => this.setAccountSIK(election.id, sik, password, censusProof, wallet))
      .then(() => this.anonymousService.fetchZKProof(address))
      .then((zkProof) =>
        AnonymousService.prepareCircuitInputs(
          election.id,
          address,
          password,
          sik,
          censusProof.value,
          censusProof.value,
          zkProof.censusRoot,
          zkProof.censusSiblings,
          censusProof.root,
          censusProof.siblings
        )
      )
      .then((circuits) => this.anonymousService.generateZkProof(circuits));
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
    password?: string;
  }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(options.account, 'No account');

    const faucetPackage = this.parseFaucetPackage(options.faucetPackage ?? (await this.fetchFaucetPayload()));

    const address = await this.wallet.getAddress();

    const calculatedSik = options?.signedSikPayload
      ? await AnonymousService.calcSik(address, options.signedSikPayload, options.password)
      : null;

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
      AccountCore.signTransaction(setAccountInfoTx.tx, this.chainService.chainData.chainId, this.wallet)
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
  createAccount(options?: {
    account?: Account;
    faucetPackage?: string;
    sik?: boolean;
    password?: string;
  }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    const settings = {
      account: null,
      faucetPackage: null,
      sik: true,
      password: '0',
      ...options,
    };

    return this.fetchAccountInfo().catch(() => {
      if (settings?.sik) {
        return this.signSIKPayload(this.wallet).then((signedPayload) =>
          this.createAccountInfo({
            account: settings?.account ?? new Account(),
            faucetPackage: settings?.faucetPackage,
            signedSikPayload: signedPayload,
            password: settings.password,
          })
        );
      }
      return this.createAccountInfo({
        account: settings?.account ?? new Account(),
        faucetPackage: settings?.faucetPackage,
      });
    });
  }

  /**
   * Calls the faucet to get new tokens. Only under development.
   *
   * @param {string} faucetPackage The faucet package
   * @returns {Promise<AccountData>} Account data information updated with new balance
   */
  collectFaucetTokens(faucetPackage?: string): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    const faucet = faucetPackage ? Promise.resolve(faucetPackage) : this.fetchFaucetPayload();
    return Promise.all([this.fetchAccountInfo(), faucet, this.fetchChainId()])
      .then(([account, faucet, chainId]) => {
        const faucetPackage = this.parseFaucetPackage(faucet);
        const collectFaucetTx = AccountCore.generateCollectFaucetTransaction(account, faucetPackage);
        return AccountCore.signTransaction(collectFaucetTx, chainId, this.wallet);
      })
      .then((signedTx) => ChainAPI.submitTx(this.url, signedTx))
      .then((txData) => this.waitForTransaction(txData.hash))
      .then(() => this.fetchAccountInfo());
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
      await this.censusService.createCensus(election.census as PlainCensus | WeightedCensus);
    } else if (!election.maxCensusSize && !election.census.size) {
      await this.censusService.fetchCensusInfo(election.census.censusId).then((censusInfo) => {
        election.census.size = censusInfo.size;
        election.census.weight = censusInfo.weight;
      });
    } else if (election.maxCensusSize && election.maxCensusSize > this.chainService.chainData.maxCensusSize) {
      throw new Error(
        'Max census size for the election is greater than allowed size: ' + this.chainService.chainData.maxCensusSize
      );
    }

    if (election.census instanceof TokenCensus) {
      election.meta = { ...election.meta, ...{ token: election.census.token } };
    }

    const electionData = Promise.all([
      this.fetchAccountInfo(),
      this.calculateCID(Buffer.from(JSON.stringify(election.generateMetadata()), 'utf8').toString('base64')),
    ]).then((data) =>
      ElectionCore.generateNewElectionTransaction(election, data[1], this.chainService.chainData, data[0])
    );

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
      proofPromise = this.censusService.fetchProof(election.census.censusId, key);
    } else if (election) {
      proofPromise = this.fetchProofForWallet(election.census.censusId, this.wallet);
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
  async hasAlreadyVoted(electionId?: string): Promise<string> {
    if (!this.electionId && !electionId) {
      throw Error('No election set');
    }
    if (!this.wallet) {
      throw Error('No wallet found');
    }

    const election = await this.fetchElection(electionId ?? this.electionId);

    if (election.electionType.anonymous) {
      throw Error('This function cannot be used with an anonymous election');
    }

    return this.wallet
      .getAddress()
      .then((address) => VoteAPI.info(this.url, keccak256(address.toLowerCase() + election.id)))
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
    return this.votesLeftCount(electionId).then((votesLeftCount) => votesLeftCount > 0);
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

    if (election.electionType.anonymous) {
      throw Error('This function cannot be used with an anonymous election');
    }

    const isInCensus = await this.isInCensus(election.id);
    if (!isInCensus) {
      return Promise.resolve(0);
    }

    return this.wallet
      .getAddress()
      .then((address) => VoteAPI.info(this.url, keccak256(address.toLowerCase() + election.id)))
      .then((voteInfo) => election.voteType.maxVoteOverwrites - voteInfo.overwriteCount)
      .catch(() => election.voteType.maxVoteOverwrites + 1);
  }

  /**
   * Submits a vote to the current instance election id.
   *
   * @param {Vote | CspVote | AnonymousVote} vote The vote (or votes) to be sent.
   * @returns {Promise<string>} Vote confirmation id.
   */
  async submitVote(vote: Vote | CspVote | AnonymousVote): Promise<string> {
    if (this.election instanceof UnpublishedElection) {
      throw Error('Election is not published');
    }

    if (!this.wallet) {
      throw Error('No wallet set');
    }

    const election = await this.fetchElection();

    let censusProof: CspCensusProof | CensusProof | ZkProof;
    if (election.census.type == CensusType.WEIGHTED) {
      censusProof = await this.fetchProofForWallet(election.census.censusId, this.wallet);
    } else if (election.census.type == CensusType.ANONYMOUS) {
      if (vote instanceof AnonymousVote) {
        censusProof = await this.calcZKProofForWallet(election, this.wallet, vote.password);
      } else {
        censusProof = await this.calcZKProofForWallet(election, this.wallet);
      }
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

  /**
   * This functions will be deprecated
   */

  /**
   * Fetches proof that an address is part of the specified census.
   *
   * @param {string} censusId Census we want to check the address against
   * @param {string} key The address to be found
   * @returns {Promise<CensusProof>}
   */
  async fetchProof(censusId: string, key: string): Promise<CensusProof> {
    return this.censusService.fetchProof(censusId, key);
  }

  /**
   * Publishes the given census.
   *
   * @param {PlainCensus | WeightedCensus} census The census to be published.
   * @returns {Promise<void>}
   */
  createCensus(census: PlainCensus | WeightedCensus): Promise<void> {
    return this.censusService.createCensus(census);
  }

  /**
   * Fetches the information of a given census.
   *
   * @param censusId
   * @returns {Promise<{size: number, weight: bigint}>}
   */
  fetchCensusInfo(censusId: string): Promise<{ size: number; weight: bigint; type: CensusType }> {
    return this.censusService.fetchCensusInfo(censusId);
  }

  /**
   * Fetches circuits for anonymous voting
   *
   * @param {Omit<ChainCircuits, 'zKeyData' | 'vKeyData' | 'wasmData'>} circuits Additional options for custom circuits
   * @returns {Promise<ChainCircuits>}
   */
  fetchCircuits(circuits?: Omit<ChainCircuits, 'zKeyData' | 'vKeyData' | 'wasmData'>): Promise<ChainCircuits> {
    return this.anonymousService.fetchCircuits(circuits);
  }

  /**
   * Sets circuits for anonymous voting
   *
   * @param {ChainCircuits} circuits Custom circuits
   * @returns {Promise<ChainCircuits>}
   */
  setCircuits(circuits: ChainCircuits): ChainCircuits {
    return this.anonymousService.setCircuits(circuits);
  }

  async cspUrl(): Promise<string> {
    invariant(this.electionId, 'No election id set');
    return this.fetchElection(this.electionId).then((election) => this.cspService.setUrlFromElection(election));
  }

  async cspInfo() {
    return this.cspService.setInfo();
  }

  async cspStep(stepNumber: number, data: any[], authToken?: string) {
    invariant(this.electionId, 'No election id set');
    await this.cspUrl();
    await this.cspInfo();
    return this.cspService.cspStep(this.electionId, stepNumber, data, authToken);
  }

  async cspSign(address: string, token: string) {
    invariant(this.electionId, 'No election id set');
    return this.cspService.cspSign(this.electionId, address, token);
  }

  cspVote(vote: Vote, signature: string) {
    return this.cspService.cspVote(vote, signature);
  }

  /**
   * Fetches blockchain costs information if needed.
   *
   * @returns {Promise<ChainCosts>}
   */
  fetchChainCosts() {
    return this.chainService.fetchChainCosts();
  }

  /**
   * Fetches blockchain information if needed and returns the chain id.
   *
   * @returns {Promise<string>}
   */
  fetchChainId(): Promise<string> {
    return this.chainService.fetchChainData().then((chainData) => chainData.chainId);
  }

  /**
   * Estimates the election cost
   *
   * @returns {Promise<number>} The cost in tokens.
   */
  public estimateElectionCost(election: UnpublishedElection): Promise<number> {
    return this.electionService.estimateElectionCost(election);
  }

  /**
   * Calculate the election cost
   *
   * @returns {Promise<number>} The cost in tokens.
   */
  public calculateElectionCost(election: UnpublishedElection): Promise<number> {
    return this.electionService.calculateElectionCost(election);
  }
}
