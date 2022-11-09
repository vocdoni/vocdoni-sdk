import Hash from 'ipfs-only-hash';
import { AccountData, ChainData } from '../client';
import { CensusOrigin, NewProcessTx, ProcessStatus, Tx, TxType } from '../dvote-protobuf/build/ts/vochain/vochain';
import { checkValidElectionMetadata, Election, ElectionMetadata, ElectionMetadataTemplate } from '../types';
import { TransactionCore } from './transaction';

export abstract class ElectionCore extends TransactionCore {
  private static readonly VOCHAIN_BLOCK_TIME_IN_SECONDS = 12;

  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static async generateNewElectionTransaction(
    election: Election,
    chainData: ChainData,
    accountData: AccountData
  ): Promise<{ tx: Uint8Array; metadata: string }> {
    return this.prepareElectionData(election, chainData, accountData).then((txData) => {
      const newProcess = NewProcessTx.fromPartial({
        txtype: TxType.NEW_PROCESS,
        ...txData.electionData,
      });
      return {
        tx: Tx.encode({
          payload: { $case: 'newProcess', newProcess },
        }).finish(),
        metadata: txData.metadata,
      };
    });
  }

  private static async prepareElectionData(
    election: Election,
    chainData: ChainData,
    accountData: AccountData
  ): Promise<{ metadata: string; electionData: object }> {
    let startBlock = 0;
    let actualBlock = 0;
    if (election.startDate) {
      startBlock = this.estimateBlockAtDateTime(election.startDate, chainData);
    } else {
      actualBlock = this.estimateBlockAtDateTime(new Date(), chainData);
    }
    const endBlock = this.estimateBlockAtDateTime(election.endDate, chainData);

    return this.generateMetadata(election).then((metadata) => {
      return {
        metadata: Buffer.from(JSON.stringify(metadata.metadata), 'binary').toString('base64'),
        electionData: {
          nonce: accountData.nonce,
          process: {
            entityId: Uint8Array.from(Buffer.from(accountData.address, 'hex')),
            startBlock: election.startDate ? startBlock : 0,
            blockCount: endBlock - (election.startDate ? startBlock : actualBlock),
            censusRoot: Uint8Array.from(Buffer.from(election.census.censusId, 'hex')),
            censusURI: election.census.censusURI,
            status: ProcessStatus.READY,
            envelopeType: {
              serial: false, // TODO
              anonymous: election.electionType.anonymous,
              encryptedVotes: election.electionType.secretUntilTheEnd,
              uniqueValues: election.voteType.uniqueChoices,
              costFromWeight: election.voteType.costFromWeight,
            },
            mode: {
              autoStart: election.electionType.autoStart,
              interruptible: election.electionType.interruptible,
              dynamicCensus: election.electionType.dynamicCensus,
              encryptedMetaData: false, // TODO
              preRegister: election.electionType.anonymous,
            },
            voteOptions: {
              maxCount: election.questions.length,
              maxValue: election.questions.reduce((prev, cur) => {
                const localMax = cur.choices.reduce((prev, cur) => (prev > cur.value ? prev : cur.value), 0);
                return localMax > prev ? localMax : prev;
              }, 0),
              maxVoteOverwrites: election.voteType.maxVoteOverwrites,
              maxTotalCost: 0, // TODO
              costExponent: election.voteType.costExponent,
            },
            censusOrigin: CensusOrigin.OFF_CHAIN_TREE_WEIGHTED, //TODO
            metadata: 'ipfs://' + metadata.id,
          },
        },
      };
    });
  }

  private static async generateMetadata(election: Election): Promise<{ id: string; metadata: ElectionMetadata }> {
    const metadata = ElectionMetadataTemplate;

    metadata.title = election.title;
    metadata.description = election.description;
    metadata.media = {
      header: election.header,
      streamUri: election.streamUri,
    };
    metadata.questions = election.questions.map((question) => {
      return {
        title: question.title,
        description: question.description,
        choices: question.choices.map((choice) => {
          return {
            title: choice.title,
            value: choice.value,
          };
        }),
      };
    });

    checkValidElectionMetadata(metadata);

    return Hash.of(JSON.stringify(metadata)).then((id) => {
      return { id, metadata };
    });
  }

  /**
   * Returns the DateTime at which the given block number is expected to be mined
   *
   * @param blockNumber The desired block number
   * @param chainData The block status information from the chain to use for the estimation
   */
  // @ts-ignore
  private static estimateDateAtBlock(blockNumber: number, chainData: ChainData): Date {
    if (!blockNumber) return null;

    const blocksPerM = 60 / this.VOCHAIN_BLOCK_TIME_IN_SECONDS;
    const blocksPer10m = 10 * blocksPerM;
    const blocksPerH = blocksPerM * 60;
    const blocksPer6h = 6 * blocksPerH;
    const blocksPerDay = 24 * blocksPerH;

    // Diff between the last mined block and the given one
    const blockDiff = Math.abs(blockNumber - chainData.height);
    let averageBlockTime = this.VOCHAIN_BLOCK_TIME_IN_SECONDS * 1000;
    let weightA: number, weightB: number;

    // chainData.blockTime => [1m, 10m, 1h, 6h, 24h]
    if (blockDiff > blocksPerDay) {
      if (chainData.blockTime[4] > 0) averageBlockTime = chainData.blockTime[4];
      else if (chainData.blockTime[3] > 0) averageBlockTime = chainData.blockTime[3];
      else if (chainData.blockTime[2] > 0) averageBlockTime = chainData.blockTime[2];
      else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (blockDiff > blocksPer6h) {
      // blocksPer6h <= blockDiff < blocksPerDay
      const pivot = (blockDiff - blocksPer6h) / blocksPerH;
      weightB = pivot / (24 - 6); // 0..1
      weightA = 1 - weightB;

      if (chainData.blockTime[4] > 0 && chainData.blockTime[3] > 0) {
        averageBlockTime = weightA * chainData.blockTime[3] + weightB * chainData.blockTime[4];
      } else if (chainData.blockTime[3] > 0) averageBlockTime = chainData.blockTime[3];
      else if (chainData.blockTime[2] > 0) averageBlockTime = chainData.blockTime[2];
      else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (blockDiff > blocksPerH) {
      // blocksPerH <= blockDiff < blocksPer6h
      const pivot = (blockDiff - blocksPerH) / blocksPerH;
      weightB = pivot / (6 - 1); // 0..1
      weightA = 1 - weightB;

      if (chainData.blockTime[3] > 0 && chainData.blockTime[2] > 0) {
        averageBlockTime = weightA * chainData.blockTime[2] + weightB * chainData.blockTime[3];
      } else if (chainData.blockTime[2] > 0) averageBlockTime = chainData.blockTime[2];
      else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (blockDiff > blocksPer10m) {
      // blocksPer10m <= blockDiff < blocksPerH
      const pivot = (blockDiff - blocksPer10m) / blocksPerM;
      weightB = pivot / (60 - 10); // 0..1
      weightA = 1 - weightB;

      if (chainData.blockTime[2] > 0 && chainData.blockTime[1] > 0) {
        averageBlockTime = weightA * chainData.blockTime[1] + weightB * chainData.blockTime[2];
      } else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (blockDiff > blocksPerM) {
      // blocksPerM <= blockDiff < blocksPer10m
      const pivot = (blockDiff - blocksPerM) / blocksPerM;
      weightB = pivot / (10 - 1); // 0..1
      weightA = 1 - weightB;

      if (chainData.blockTime[1] > 0 && chainData.blockTime[0] > 0) {
        averageBlockTime = weightA * chainData.blockTime[0] + weightB * chainData.blockTime[1];
      } else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else {
      if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    }

    const targetTimestamp = chainData.blockTimestamp * 1000 + (blockNumber - chainData.height) * averageBlockTime;
    return new Date(targetTimestamp);
  }

  /**
   * Returns the block number that is expected to be current at the given date and time
   *
   * @param dateTime The desired date time
   * @param chainData The block status information from the chain to use for the estimation
   */
  private static estimateBlockAtDateTime(dateTime: Date, chainData: ChainData): number {
    if (typeof dateTime == 'number') dateTime = new Date(dateTime);
    else if (!(dateTime instanceof Date)) return null;

    let averageBlockTime = this.VOCHAIN_BLOCK_TIME_IN_SECONDS * 1000;
    let weightA: number, weightB: number;

    // Diff between the last mined block and the given date
    const dateDiff = Math.abs(dateTime.getTime() - chainData.blockTimestamp * 1000);

    // chainData.blockTime => [1m, 10m, 1h, 6h, 24h]

    if (dateDiff >= 1000 * 60 * 60 * 24) {
      if (chainData.blockTime[4] > 0) averageBlockTime = chainData.blockTime[4];
      else if (chainData.blockTime[3] > 0) averageBlockTime = chainData.blockTime[3];
      else if (chainData.blockTime[2] > 0) averageBlockTime = chainData.blockTime[2];
      else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (dateDiff >= 1000 * 60 * 60 * 6) {
      // 1000 * 60 * 60 * 6 <= dateDiff < 1000 * 60 * 60 * 24
      if (chainData.blockTime[4] > 0 && chainData.blockTime[3] > 0) {
        const pivot = (dateDiff - 1000 * 60 * 60 * 6) / (1000 * 60 * 60);
        weightB = pivot / (24 - 6); // 0..1
        weightA = 1 - weightB;

        averageBlockTime = weightA * chainData.blockTime[3] + weightB * chainData.blockTime[4];
      } else if (chainData.blockTime[3] > 0) averageBlockTime = chainData.blockTime[3];
      else if (chainData.blockTime[2] > 0) averageBlockTime = chainData.blockTime[2];
      else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (dateDiff >= 1000 * 60 * 60) {
      // 1000 * 60 * 60 <= dateDiff < 1000 * 60 * 60 * 6
      if (chainData.blockTime[3] > 0 && chainData.blockTime[2] > 0) {
        const pivot = (dateDiff - 1000 * 60 * 60) / (1000 * 60 * 60);
        weightB = pivot / (6 - 1); // 0..1
        weightA = 1 - weightB;

        averageBlockTime = weightA * chainData.blockTime[2] + weightB * chainData.blockTime[3];
      } else if (chainData.blockTime[2] > 0) averageBlockTime = chainData.blockTime[2];
      else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (dateDiff >= 1000 * 60 * 10) {
      // 1000 * 60 * 10 <= dateDiff < 1000 * 60 * 60
      if (chainData.blockTime[2] > 0 && chainData.blockTime[1] > 0) {
        const pivot = (dateDiff - 1000 * 60 * 10) / (1000 * 60);
        weightB = pivot / (60 - 10); // 0..1
        weightA = 1 - weightB;

        averageBlockTime = weightA * chainData.blockTime[1] + weightB * chainData.blockTime[2];
      } else if (chainData.blockTime[1] > 0) averageBlockTime = chainData.blockTime[1];
      else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else if (dateDiff >= 1000 * 60) {
      // 1000 * 60 <= dateDiff < 1000 * 60 * 6
      const pivot = (dateDiff - 1000 * 60) / (1000 * 60);
      weightB = pivot / (10 - 1); // 0..1
      weightA = 1 - weightB;

      if (chainData.blockTime[1] > 0 && chainData.blockTime[0] > 0) {
        averageBlockTime = weightA * chainData.blockTime[0] + weightB * chainData.blockTime[1];
      } else if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    } else {
      if (chainData.blockTime[0] > 0) averageBlockTime = chainData.blockTime[0];
    }

    const estimatedBlockDiff = dateDiff / averageBlockTime;
    const estimatedBlock =
      dateTime.getTime() < chainData.blockTimestamp * 1000
        ? chainData.height - Math.ceil(estimatedBlockDiff)
        : chainData.height + Math.floor(estimatedBlockDiff);

    if (estimatedBlock < 0) return 0;
    return estimatedBlock;
  }
}
