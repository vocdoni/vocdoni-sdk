import { Signer } from '@ethersproject/abstract-signer';
import { computePublicKey } from '@ethersproject/signing-key';
import { Wallet } from '@ethersproject/wallet';
import invariant from 'tiny-invariant';
import { AccountAPI } from './api/account';
import { CensusAPI } from './api/census';
import { ChainAPI } from './api/chain';
import { ElectionAPI, IElection } from './api/election';
import { FaucetAPI } from './api/faucet';
import { FileAPI } from './api/file';
import { WalletAPI } from './api/wallet';
import { AccountCore } from './core/account';
import { ElectionCore } from './core/election';
import { CensusProofType, VoteCore } from './core/vote';
import { Account, Election, PlainCensus, Vote, WeightedCensus } from './types';
import { delay } from './util/common';
import { promiseAny } from './util/promise';

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

/**
 * Main Vocdoni client object. It's a wrapper for all the methods in api, core
 * and types, allowing you to easily use the vocdoni API from a single entry
 * point.
 */
export class VocdoniSDKClient {
  private chainData: ChainData | null = null;
  private accountData: AccountData | null = null;
  private election: IElection | null = null;
  private authToken: AccountToken | null = null;

  constructor(public url: string, public wallet?: Wallet | Signer, public electionId?: string) {}

  /**
   * Sets an election id. Required by other methods like submitVote or createElection.
   *
   * @param {string} electionId Election id string
   */
  setElectionId(electionId: string) {
    this.electionId = electionId;
  }

  /**
   * Fetches blockchain information.
   *
   * @returns {Promise<ChainData>}
   */
  async fetchChainId(): Promise<ChainData> {
    this.chainData = await ChainAPI.info(this.url);
    return this.chainData;
  }

  /**
   * Fetches account information.
   *
   * @returns {Promise<AccountData>}
   */
  async fetchAccountInfo(): Promise<AccountData> {
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
   * @returns {Promise<{payload: string, signature: string}>}
   */
  async fetchFaucetPayload(): Promise<{ payload: string; signature: string }> {
    return this.wallet
      .getAddress()
      .then((address) => FaucetAPI.collect(process.env.FAUCET_URL, process.env.FAUCET_AUTH_TOKEN, address))
      .then((data) => {
        return {
          payload: data.faucetPayload,
          signature: data.signature,
        };
      });
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
   * @returns {Promise<IElection>}
   */
  async fetchElection(): Promise<IElection> {
    if (!this.electionId) {
      throw Error('No election set');
    }
    this.election = await ElectionAPI.info(this.url, {
      electionId: this.electionId,
    });
    return this.election;
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
   * @param {{account: Account, faucetPackage?: string}} options Additional options,
   * like extra information of the account, or the faucet package string.
   * @returns {Promise<AccountData>}
   */
  async setAccountInfo(options: { account: Account; faucetPackage?: string }): Promise<AccountData> {
    invariant(this.wallet, 'No wallet or signer set');
    invariant(options.account, 'No account');

    const faucetPackage = options.faucetPackage ?? (await this.fetchFaucetPayload());

    const accountData = Promise.all([
      this.wallet.getAddress(),
      this.fetchChainId(),
      this.calculateCID(Buffer.from(JSON.stringify(options.account.generateMetadata()), 'binary').toString('base64')),
    ]).then((data) => AccountCore.generateSetAccountTransaction(data[0], options.account, data[2], faucetPackage));

    const accountTx = accountData.then((setAccountInfoTx) =>
      AccountCore.signTransaction(setAccountInfoTx.tx, this.chainData, this.wallet)
    );

    return Promise.all([accountData, accountTx])
      .then((accountInfo) =>
        AccountAPI.setInfo(this.url, { txPayload: accountInfo[1], metadata: accountInfo[0].metadata })
      )
      .then((txData) => this.waitForTransaction(txData.txHash))
      .then(() => this.fetchAccountInfo());
  }

  /**
   * Registers an account against vochain, so it can create new processes.
   *
   * @param {{account?: Account; faucetPackage?: string}} options Additional
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
        const collectFaucetTx = AccountCore.generateCollectFaucetTransaction(data[0], data[1]);
        return AccountCore.signTransaction(collectFaucetTx, data[2], this.wallet);
      })
      .then((signedTx) => ChainAPI.submitTx(this.url, { payload: signedTx }))
      .then((txData) => this.waitForTransaction(txData.hash))
      .then(() => this.fetchAccountInfo());
  }

  /**
   * Creates the census of the specified election.
   *
   * @param {Election} election The process with the census linked to it.
   * @returns {Promise<void>}
   */
  async createCensus(election: Election): Promise<void> {
    if (election.census.isPublished) {
      return Promise.resolve();
    }

    const census = election.census as PlainCensus | WeightedCensus;

    const censusCreation = this.fetchAccountToken().then(() =>
      CensusAPI.create(this.url, this.authToken.identifier, census.type)
    );

    const censusAdding = censusCreation.then((censusCreateResponse) =>
      CensusAPI.add(this.url, this.authToken.identifier, censusCreateResponse.censusID, census.participants)
    );

    return Promise.all([censusCreation, censusAdding])
      .then((censusData) => CensusAPI.publish(this.url, this.authToken.identifier, censusData[0].censusID))
      .then((censusPublish) => {
        election.census.censusId = censusPublish.censusID;
        election.census.censusURI = censusPublish.uri;
      });
  }

  /**
   * Creates a new voting process.
   *
   * @param {Election} election The election object to be created.
   * @returns {Promise<string>} Resulting election id.
   */
  async createElection(election: Election): Promise<string> {
    const electionData = Promise.all([
      this.fetchChainId(),
      this.fetchAccountInfo(),
      this.createCensus(election),
      this.calculateCID(Buffer.from(JSON.stringify(election.generateMetadata()), 'binary').toString('base64')),
    ]).then((data) => ElectionCore.generateNewElectionTransaction(election, data[3], data[0], data[1]));

    const electionPackage = electionData.then((newElectionData) =>
      ElectionCore.signTransaction(newElectionData.tx, this.chainData, this.wallet)
    );

    const electionTx = await Promise.all([electionData, electionPackage]).then((election) =>
      ElectionAPI.create(this.url, {
        txPayload: election[1],
        metadata: election[0].metadata,
      })
    );

    return this.waitForTransaction(electionTx.txHash).then(() => electionTx.electionID);
  }

  /**
   * Submits a vote to the current instance election id.
   *
   * @param {Vote} vote The vote (or votes) to be sent.
   * @returns {Promise<string>} Vote confirmation id.
   */
  async submitVote(vote: Vote): Promise<string> {
    const voteData = Promise.all([this.fetchChainId(), this.fetchElection(), this.wallet.getAddress()]).then((data) => {
      if (this.wallet instanceof Wallet) {
        return promiseAny([
          this.fetchProof(data[1].census.censusRoot, data[2], CensusProofType.ADDRESS),
          this.fetchProof(
            data[1].census.censusRoot,
            computePublicKey(this.wallet.publicKey, true),
            CensusProofType.PUBKEY
          ),
        ]);
      } else {
        return this.fetchProof(data[1].census.censusRoot, data[2], CensusProofType.ADDRESS);
      }
    });

    const voteHash = await voteData
      .then((censusProof) => {
        if (this.election?.voteMode?.encryptedVotes) {
          return ElectionAPI.keys(this.url, this.election.electionId).then((encryptionKeys) =>
            VoteCore.generateVoteTransaction(this.election, censusProof, vote, { encryptionPubKeys: encryptionKeys })
          );
        }
        return VoteCore.generateVoteTransaction(this.election, censusProof, vote);
      })
      .then((voteTx) => VoteCore.signTransaction(voteTx, this.chainData, this.wallet))
      .then((signedTx) => ChainAPI.submitTx(this.url, { payload: signedTx }))
      .then((data) => data.hash);

    return this.waitForTransaction(voteHash).then(() => voteHash);
  }
}
