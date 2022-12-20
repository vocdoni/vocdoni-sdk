import { Signer } from '@ethersproject/abstract-signer';
import { computePublicKey } from '@ethersproject/signing-key';
import { Wallet } from '@ethersproject/wallet';
import invariant from 'tiny-invariant';
import { AccountAPI } from './api/account';
import { CensusAPI } from './api/census';
import { ChainAPI } from './api/chain';
import { ElectionAPI } from './api/election';
import { FaucetAPI } from './api/faucet';
import { FileAPI } from './api/file';
import { WalletAPI } from './api/wallet';
import { AccountCore } from './core/account';
import { ElectionCore, ElectionStatus } from './core/election';
import { CensusProofType, VoteCore } from './core/vote';
import {
  Account,
  Census,
  UnpublishedElection,
  PlainCensus,
  PublishedCensus,
  Vote,
  WeightedCensus,
  PublishedElection,
} from './types';
import { delay } from './util/common';
import { promiseAny } from './util/promise';
import { API_URL, FAUCET_AUTH_TOKEN, FAUCET_URL } from './util/constants';
import { isWallet } from './util/signing';
import { VoteAPI } from './api/vote';

export { ElectionStatus };

export type ChainData = {
  chainId: string;
  blockTime: number[];
  height: number;
  blockTimestamp: number;
};

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

export type CensusProof = {
  weight: string;
  proof: string;
  value: string;
  type: CensusProofType;
};

export type FaucetPackage = {
  payload: string;
  signature: string;
};

export enum EnvOptions {
  DEV = 'dev',
  STG = 'stg',
  PROD = 'prod',
}

type FaucetOptions = {
  url: string;
  auth_token?: string;
  token_limit?: number;
};

export type ClientOptions = {
  env: EnvOptions;
  api_url?: string;
  wallet?: Wallet | Signer;
  electionId?: string;
  faucet?: FaucetOptions;
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

  constructor(opts: ClientOptions) {
    this.url = opts.api_url ?? API_URL[opts.env];
    this.wallet = opts.wallet;
    this.electionId = opts.electionId;
    this.faucet = {
      url: opts.faucet?.url ?? FAUCET_URL[opts.env] ?? undefined,
      auth_token: opts.faucet?.auth_token ?? FAUCET_AUTH_TOKEN[opts.env] ?? undefined,
      token_limit: opts.faucet?.token_limit,
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

  /**
   * Fetches blockchain information if needed and returns the chain id.
   *
   * @returns {Promise<string>}
   */
  async fetchChainId(): Promise<string> {
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
  async calculateCID(data: string): Promise<string> {
    return FileAPI.cid(this.url, data).then((data) => data.cid);
  }

  /**
   * Fetches a faucet payload. Only for development.
   *
   * @returns {Promise<{string}>}
   */
  async fetchFaucetPayload(): Promise<string> {
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
  async fetchAccountToken(): Promise<void> {
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

    return ElectionAPI.info(this.url, electionId ?? this.electionId)
      .then((electionInfo) =>
        PublishedElection.build({
          id: electionInfo.electionId,
          title: electionInfo.metadata.title,
          description: electionInfo.metadata.description,
          header: electionInfo.metadata.media.header,
          streamUri: electionInfo.metadata.media.streamUri,
          startDate: electionInfo.startDate,
          endDate: electionInfo.endDate,
          census: new PublishedCensus(
            electionInfo.census.censusRoot,
            electionInfo.census.censusURL,
            Census.censusTypeFromCensusOrigin(electionInfo.census.censusOrigin)
          ),
          status: ElectionCore.electionStatusFromString(electionInfo.status),
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

  /**
   * A convenience method to wait for a transaction to be executed. It will
   * loop trying to get the transaction information, and will retry every time
   * it fails.
   *
   * @param {string} tx Transaction to wait for
   * @param {number} wait The delay between tries
   * @returns {Promise<void>}
   */
  async waitForTransaction(tx: string, wait: number = 1000): Promise<void> {
    return ChainAPI.txInfo(this.url, tx)
      .then(() => Promise.resolve())
      .catch(() => delay(wait).then(() => this.waitForTransaction(tx, wait)));
  }

  /**
   * Fetches proof that an address is part of the specified census.
   *
   * @param {string} censusId Census we want to check the address against
   * @param {string} key The address to be found
   * @param {CensusProofType} type Type of census
   * @returns {Promise<CensusProof>}
   */
  async fetchProof(censusId: string, key: string, type: CensusProofType): Promise<CensusProof> {
    return CensusAPI.proof(this.url, censusId, key).then((censusProof) => {
      return { ...censusProof, type };
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
      this.calculateCID(Buffer.from(JSON.stringify(options.account.generateMetadata()), 'binary').toString('base64')),
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
  async createAccount(options?: { account?: Account; faucetPackage?: string }): Promise<AccountData> {
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
  async collectFaucetTokens(): Promise<AccountData> {
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
  async createCensus(census: PlainCensus | WeightedCensus): Promise<void> {
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
      this.calculateCID(Buffer.from(JSON.stringify(election.generateMetadata()), 'binary').toString('base64')),
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
  async endElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.ENDED);
  }

  /**
   * Pauses an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  async pauseElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.PAUSED);
  }

  /**
   * Cancels an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  async cancelElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.CANCELED);
  }

  /**
   * Continues an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<void>}
   */
  async continueElection(electionId?: string): Promise<void> {
    return this.changeElectionStatus(electionId, ElectionStatus.READY);
  }

  /**
   * Changes the status of an election.
   *
   * @param {string} electionId The id of the election
   * @param {ElectionStatus} newStatus The new status
   * @returns {Promise<void>}
   */
  private async changeElectionStatus(electionId: string, newStatus: ElectionStatus): Promise<void> {
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
   * Submits a vote to the current instance election id.
   *
   * @param {Vote} vote The vote (or votes) to be sent.
   * @returns {Promise<string>} Vote confirmation id.
   */
  async submitVote(vote: Vote): Promise<string> {
    if (this.election instanceof UnpublishedElection) {
      throw Error('Election is not published');
    }

    const election = await this.fetchElection();

    // Census proof
    const voteData = Promise.all([this.fetchChainId(), this.wallet.getAddress()]).then((data) => {
      if (isWallet(this.wallet)) {
        const { publicKey } = this.wallet as Wallet;
        return promiseAny([
          this.fetchProof(election.census.censusId, data[1], CensusProofType.ADDRESS),
          this.fetchProof(election.census.censusId, computePublicKey(publicKey, true), CensusProofType.PUBKEY),
        ]);
      } else {
        return this.fetchProof(election.census.censusId, data[1], CensusProofType.ADDRESS);
      }
    });

    // Vote
    const voteSubmit = await voteData
      .then((censusProof) => {
        if (election?.electionType.secretUntilTheEnd) {
          return ElectionAPI.keys(this.url, election.id).then((encryptionKeys) =>
            VoteCore.generateVoteTransaction(election, censusProof, vote, { encryptionPubKeys: encryptionKeys })
          );
        }
        return VoteCore.generateVoteTransaction(election, censusProof, vote);
      })
      .then((voteTx) => VoteCore.signTransaction(voteTx, this.chainData.chainId, this.wallet))
      .then((signedTx) => VoteAPI.submit(this.url, signedTx));

    // Wait for tx
    return this.waitForTransaction(voteSubmit.txHash).then(() => voteSubmit.voteID);
  }
}
