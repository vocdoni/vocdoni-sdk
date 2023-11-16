import { Signer } from '@ethersproject/abstract-signer';
import { keccak256 } from '@ethersproject/keccak256';
import { Wallet } from '@ethersproject/wallet';
import { Buffer } from 'buffer';
import invariant from 'tiny-invariant';
import { AccountCore } from './core/account';
import { ElectionCore } from './core/election';
import { VoteCore } from './core/vote';
import {
  Account,
  AllElectionStatus,
  AnonymousVote,
  CensusType,
  CspVote,
  ElectionStatus,
  ElectionStatusReady,
  InvalidElection,
  PlainCensus,
  PublishedElection,
  SendTokensOptions,
  TokenCensus,
  UnpublishedElection,
  Vote,
  WeightedCensus,
} from './types';
import { API_URL, CENSUS_CHUNK_SIZE, EXPLORER_URL, FAUCET_URL, TX_WAIT_OPTIONS } from './util/constants';
import {
  AccountData,
  AccountService,
  AnonymousService,
  CensusProof,
  CensusService,
  ChainCircuits,
  ChainService,
  CspCensusProof,
  CspService,
  ElectionCreationSteps,
  ElectionCreationStepValue,
  ElectionService,
  FaucetOptions,
  FaucetService,
  FileService,
  VoteService,
  ZkProof,
} from './services';
import { isAddress } from '@ethersproject/address';
import { ArchivedElection } from './types';

export enum EnvOptions {
  DEV = 'dev',
  STG = 'stg',
  PROD = 'prod',
}

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
  public voteService: VoteService;
  public fileService: FileService;
  public faucetService: FaucetService;
  public accountService: AccountService;

  public url: string;
  public wallet: Wallet | Signer | null;
  public electionId: string | null;
  public explorerUrl: string;

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
    this.explorerUrl = EXPLORER_URL[opts.env];
    this.censusService = new CensusService({ url: this.url, chunk_size: CENSUS_CHUNK_SIZE });
    this.fileService = new FileService({ url: this.url });
    this.chainService = new ChainService({
      url: this.url,
      txWait: {
        retryTime: opts.tx_wait?.retry_time ?? TX_WAIT_OPTIONS.retry_time,
        attempts: opts.tx_wait?.attempts ?? TX_WAIT_OPTIONS.attempts,
      },
    });
    this.faucetService = new FaucetService({
      url: opts.faucet?.url ?? FAUCET_URL[opts.env] ?? undefined,
      token_limit: opts.faucet?.token_limit,
    });
    this.anonymousService = new AnonymousService({ url: this.url });
    this.electionService = new ElectionService({
      url: this.url,
      censusService: this.censusService,
      chainService: this.chainService,
    });
    this.voteService = new VoteService({
      url: this.url,
      chainService: this.chainService,
    });
    this.cspService = new CspService({});
    this.accountService = new AccountService({
      url: this.url,
      chainService: this.chainService,
    });
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
    if (!this.wallet && !address) {
      throw Error('No account set');
    } else if (address) {
      this.accountData = await this.accountService.fetchAccountInfo(address);
    } else {
      this.accountData = await this.wallet
        .getAddress()
        .then((address) => this.accountService.fetchAccountInfo(address));
    }
    return this.accountData;
  }

  /**
   * Fetches info about an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<PublishedElection | ArchivedElection>}
   */
  async fetchElection(electionId?: string): Promise<PublishedElection | ArchivedElection> {
    invariant(this.electionId || electionId, 'No election set');

    this.election = await this.electionService.fetchElection(electionId ?? this.electionId);
    return this.election;
  }

  async fetchElections(
    account?: string,
    page: number = 0
  ): Promise<Array<PublishedElection | InvalidElection | ArchivedElection>> {
    return this.electionService.fetchElections({ account: account ?? (await this.wallet?.getAddress()), page });
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

  private setAccountSIK(
    electionId: string,
    sik: string,
    password: string,
    censusProof: CensusProof,
    wallet: Wallet | Signer
  ): Promise<void> {
    return wallet
      .getAddress()
      .then((address) => AnonymousService.calcSik(address, sik, password))
      .then((calculatedSIK) => {
        const registerSIKTx = AccountCore.generateRegisterSIKTransaction(electionId, calculatedSIK, censusProof);
        return this.accountService.signTransaction(registerSIKTx.tx, registerSIKTx.message, wallet);
      })
      .then((signedTx) => this.chainService.submitTx(signedTx))
      .then((hash) => this.chainService.waitForTransaction(hash));
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
      this.anonymousService.signSIKPayload(wallet),
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

    const faucetPayload =
      options.faucetPackage ??
      (await this.wallet.getAddress().then((address) => this.faucetService.fetchPayload(address)));
    const faucetPackage = this.faucetService.parseFaucetPackage(faucetPayload);

    const address = await this.wallet.getAddress();

    const calculatedSik = options?.signedSikPayload
      ? await AnonymousService.calcSik(address, options.signedSikPayload, options.password)
      : null;

    const accountData = Promise.all([
      this.fetchChainId(),
      this.fileService.calculateCID(JSON.stringify(options.account.generateMetadata())),
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
      this.fileService.calculateCID(JSON.stringify(account.generateMetadata())),
    ]).then((data) => AccountCore.generateUpdateAccountTransaction(data[0], account, data[2]));

    return this.setAccountInfo(accountData);
  }

  /**
   * Updates an account with information
   *
   * @param {Promise<{ tx: Uint8Array; metadata: string }>} promAccountData Account data promise in Tx form.
   * @returns {Promise<AccountData>}
   */
  private setAccountInfo(
    promAccountData: Promise<{ tx: Uint8Array; metadata: string; message: string }>
  ): Promise<AccountData> {
    const accountTx = promAccountData.then((setAccountInfoTx) =>
      this.accountService.signTransaction(setAccountInfoTx.tx, setAccountInfoTx.message, this.wallet)
    );

    return Promise.all([promAccountData, accountTx])
      .then((accountInfo) => this.accountService.setInfo(accountInfo[1], accountInfo[0].metadata))
      .then((txHash) => this.chainService.waitForTransaction(txHash))
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
        return this.anonymousService.signSIKPayload(this.wallet).then((signedPayload) =>
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
   * Send tokens from one account to another.
   *
   * @param {SendTokensOptions} options Options for send tokens
   * @returns {Promise<void>}
   */
  sendTokens(options: SendTokensOptions): Promise<void> {
    const settings = {
      wallet: options.wallet ?? this.wallet,
      ...options,
    };
    invariant(settings.wallet, 'No wallet or signer set or given');
    invariant(settings.to && isAddress(settings.to), 'No destination address given');
    invariant(settings.amount && settings.amount > 0, 'No amount given');

    return Promise.all([this.fetchAccountInfo(), settings.wallet.getAddress()])
      .then(([accountData, fromAddress]) => {
        const transferTx = AccountCore.generateTransferTransaction(
          accountData.nonce,
          fromAddress,
          settings.to,
          settings.amount
        );
        return this.accountService.signTransaction(transferTx.tx, transferTx.message, settings.wallet);
      })
      .then((signedTx) => this.chainService.submitTx(signedTx))
      .then((txHash) => this.chainService.waitForTransaction(txHash));
  }

  /**
   * Calls the faucet to get new tokens. Only under development.
   *
   * @param {string} faucetPackage The faucet package
   * @returns {Promise<AccountData>} Account data information updated with new balance
   */
  collectFaucetTokens(faucetPackage?: string): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    const faucet = faucetPackage
      ? Promise.resolve(faucetPackage)
      : this.wallet.getAddress().then((address) => this.faucetService.fetchPayload(address));
    return Promise.all([this.fetchAccountInfo(), faucet])
      .then(([account, faucet]) => {
        const faucetPackage = this.faucetService.parseFaucetPackage(faucet);
        const collectFaucetTx = AccountCore.generateCollectFaucetTransaction(account, faucetPackage);
        return this.accountService.signTransaction(collectFaucetTx.tx, collectFaucetTx.message, this.wallet);
      })
      .then((signedTx) => this.chainService.submitTx(signedTx))
      .then((hash) => this.chainService.waitForTransaction(hash))
      .then(() => this.fetchAccountInfo());
  }

  /**
   * Creates a new voting election.
   *
   * @param {UnpublishedElection} election The election object to be created.
   * @returns {Promise<string>} Resulting election id.
   */
  async createElection(election: UnpublishedElection): Promise<string> {
    for await (const step of this.createElectionSteps(election)) {
      switch (step.key) {
        case ElectionCreationSteps.DONE:
          return step.electionId;
      }
    }
    throw new Error('There was an error creating the election');
  }

  /**
   * Creates a new voting election by steps with async returns.
   *
   * @param {UnpublishedElection} election The election object to be created.
   * @returns {AsyncGenerator<ElectionCreationStepValue>} The async step returns.
   */
  async *createElectionSteps(election: UnpublishedElection): AsyncGenerator<ElectionCreationStepValue> {
    invariant(
      election.maxCensusSize || election.census.type !== CensusType.CSP,
      'CSP Census needs a max census size set in the election'
    );

    const chainData = await this.chainService.fetchChainData();

    yield {
      key: ElectionCreationSteps.GET_CHAIN_DATA,
    };

    if (election.electionType.anonymous) {
      election.census.type = CensusType.ANONYMOUS;
    }

    if (!election.census.isPublished) {
      await this.censusService.createCensus(election.census as PlainCensus | WeightedCensus);
    } else if (!election.maxCensusSize && !election.census.size) {
      await this.censusService.get(election.census.censusId).then((censusInfo) => {
        election.census.size = censusInfo.size;
        election.census.weight = censusInfo.weight;
      });
    } else if (election.maxCensusSize && election.maxCensusSize > chainData.maxCensusSize) {
      throw new Error('Max census size for the election is greater than allowed size: ' + chainData.maxCensusSize);
    }

    if (election.census instanceof TokenCensus) {
      election.meta = { ...election.meta, ...{ token: election.census.token } };
    }

    yield {
      key: ElectionCreationSteps.CENSUS_CREATED,
    };

    const account = await this.fetchAccountInfo();
    yield {
      key: ElectionCreationSteps.GET_ACCOUNT_DATA,
    };

    const cid = await this.fileService.calculateCID(JSON.stringify(election.generateMetadata()));
    yield {
      key: ElectionCreationSteps.GET_DATA_PIN,
    };

    const electionTxData = await ElectionCore.generateNewElectionTransaction(election, cid, chainData, account);
    yield {
      key: ElectionCreationSteps.GENERATE_TX,
    };

    const signedElectionTx = await this.electionService.signTransaction(
      electionTxData.tx,
      electionTxData.message,
      this.wallet
    );
    yield {
      key: ElectionCreationSteps.SIGN_TX,
    };

    const electionTx = await this.electionService.create(signedElectionTx, electionTxData.metadata);
    yield {
      key: ElectionCreationSteps.CREATING,
      txHash: electionTx.txHash,
    };

    const electionId = await this.chainService.waitForTransaction(electionTx.txHash).then(() => electionTx.electionID);
    yield {
      key: ElectionCreationSteps.DONE,
      electionId,
    };
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
      .then((accountData) => {
        const setElectionStatusTx = ElectionCore.generateSetElectionStatusTransaction(
          electionId ?? this.electionId,
          accountData.nonce,
          newStatus
        );
        return this.electionService.signTransaction(setElectionStatusTx.tx, setElectionStatusTx.message, this.wallet);
      })
      .then((signedTx) => this.chainService.submitTx(signedTx))
      .then((hash) => this.chainService.waitForTransaction(hash));
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
      .then((accountData) => {
        const setElectionCensusTx = ElectionCore.generateSetElectionCensusTransaction(
          electionId ?? this.electionId,
          accountData.nonce,
          censusId,
          censusURI
        );
        return this.electionService.signTransaction(setElectionCensusTx.tx, setElectionCensusTx.message, this.wallet);
      })
      .then((signedTx) => this.chainService.submitTx(signedTx))
      .then((hash) => this.chainService.waitForTransaction(hash));
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
      .then((address) => this.voteService.info(address.toLowerCase(), election.id))
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
      .then((address) => this.voteService.info(address.toLowerCase(), election.id))
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

    let voteTx: { tx: Uint8Array; message: string };
    if (election?.electionType.secretUntilTheEnd) {
      voteTx = await this.electionService.keys(election.id).then((encryptionKeys) =>
        VoteCore.generateVoteTransaction(election, censusProof, vote, {
          encryptionPubKeys: encryptionKeys.publicKeys,
        })
      );
    } else {
      voteTx = VoteCore.generateVoteTransaction(election, censusProof, vote);
    }

    let payload: string;
    if (!this.election.electionType.anonymous) {
      payload = await this.voteService.signTransaction(voteTx.tx, voteTx.message, this.wallet);
    } else {
      payload = this.voteService.encodeTransaction(voteTx.tx);
    }

    // Vote
    return this.voteService
      .vote(payload)
      .then((apiResponse) => this.chainService.waitForTransaction(apiResponse.txHash).then(() => apiResponse.voteID));
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
    return this.censusService.get(censusId);
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

  /**
   * Fetches the CID expected for the specified data content.
   *
   * @param {string} data The data of which we want the CID of
   * @returns {Promise<string>} Resulting CID
   */
  calculateCID(data: string): Promise<string> {
    return this.fileService.calculateCID(data);
  }

  /**
   * Fetches a faucet payload. Only for development.
   *
   * @returns {Promise<{string}>}
   */
  fetchFaucetPayload(): Promise<string> {
    invariant(this.wallet, 'No wallet or signer set');
    return this.wallet.getAddress().then((address) => this.faucetService.fetchPayload(address));
  }

  /**
   * Parses a faucet package.
   *
   * @param {string} faucetPackage The encoded faucet package
   * @returns {FaucetPackage}
   */
  parseFaucetPackage(faucetPackage: string) {
    return this.faucetService.parseFaucetPackage(faucetPackage);
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
    return this.chainService.waitForTransaction(tx, wait, attempts);
  }
}
