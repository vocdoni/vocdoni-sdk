import {
  CensusOrigin,
  NewProcessTx,
  ProcessStatus,
  processStatusFromJSON,
  SetProcessTx,
  Tx,
  TxType,
} from '@vocdoni/proto/vochain';
import { AllElectionStatus, CensusType, ElectionStatus, UnpublishedElection } from '../types';
import { TransactionCore } from './transaction';
import { Buffer } from 'buffer';
import { strip0x } from '../util/common';
import { ChainCosts, ChainData } from '../services';
import { TxMessage } from '../util/constants';

export abstract class ElectionCore extends TransactionCore {
  private static readonly VOCHAIN_BLOCK_TIME_IN_SECONDS = 12;

  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static generateSetElectionStatusTransaction(
    electionId: string,
    accountNonce: number,
    newStatus: AllElectionStatus
  ): { tx: Uint8Array; message: string } {
    const status = this.processStatusFromElectionStatus(newStatus);
    const message = TxMessage.SET_PROCESS_STATUS.replace(
      '{status}',
      Object.keys(ProcessStatus)[Object.values(ProcessStatus).indexOf(status)].toLowerCase()
    ).replace('{processId}', electionId);
    const setProcess = SetProcessTx.fromPartial({
      txtype: TxType.SET_PROCESS_STATUS,
      nonce: accountNonce,
      processId: new Uint8Array(Buffer.from(strip0x(electionId), 'hex')),
      status,
    });
    const tx = Tx.encode({
      payload: { $case: 'setProcess', setProcess },
    }).finish();

    return { tx, message };
  }

  public static generateSetElectionCensusTransaction(
    electionId: string,
    accountNonce: number,
    censusId: string,
    censusURI: string
  ): { tx: Uint8Array; message: string } {
    const message = TxMessage.SET_PROCESS_CENSUS.replace('{censusId}', censusId).replace('{processId}', electionId);
    const setProcess = SetProcessTx.fromPartial({
      txtype: TxType.SET_PROCESS_CENSUS,
      nonce: accountNonce,
      processId: Uint8Array.from(Buffer.from(strip0x(electionId), 'hex')),
      censusRoot: Uint8Array.from(Buffer.from(strip0x(censusId), 'hex')),
      censusURI: censusURI,
    });
    const tx = Tx.encode({
      payload: { $case: 'setProcess', setProcess },
    }).finish();

    return { tx, message };
  }

  public static generateNewElectionTransaction(
    election: UnpublishedElection,
    cid: string,
    blocks: { actual: number; start: number; end: number },
    address: string,
    nonce: number
  ): { tx: Uint8Array; metadata: string; message: string } {
    const txData = this.prepareElectionData(election, cid, blocks, address, nonce);

    const newProcess = NewProcessTx.fromPartial({
      txtype: TxType.NEW_PROCESS,
      ...txData.electionData,
    });
    return {
      tx: Tx.encode({
        payload: { $case: 'newProcess', newProcess },
      }).finish(),
      metadata: txData.metadata,
      message: TxMessage.NEW_PROCESS,
    };
  }

  private static prepareElectionData(
    election: UnpublishedElection,
    cid: string,
    blocks: { actual: number; start: number; end: number },
    address: string,
    nonce: number
  ): { metadata: string; electionData: object } {
    return {
      metadata: Buffer.from(JSON.stringify(election.generateMetadata()), 'utf8').toString('base64'),
      electionData: {
        nonce: nonce,
        process: {
          entityId: Uint8Array.from(Buffer.from(address, 'hex')),
          startBlock: election.startDate ? blocks.start : 0,
          blockCount: blocks.end - (election.startDate ? blocks.start : blocks.actual),
          censusRoot: Uint8Array.from(Buffer.from(election.census.censusId, 'hex')),
          censusURI: election.census.censusURI,
          status: ProcessStatus.READY,
          envelopeType: election.generateEnvelopeType(),
          mode: election.generateMode(),
          voteOptions: election.generateVoteOptions(),
          censusOrigin: this.censusOriginFromCensusType(election.census.type),
          metadata: cid,
          maxCensusSize: election.maxCensusSize ?? election.census.size ?? undefined,
          tempSIKs: election.temporarySecretIdentity ?? false,
        },
      },
    };
  }

  private static processStatusFromElectionStatus(status: AllElectionStatus): ProcessStatus {
    if (status == ElectionStatus.UPCOMING || status == ElectionStatus.ONGOING) {
      return ProcessStatus.READY;
    }
    return processStatusFromJSON(status);
  }

  public static censusOriginFromCensusType(censusType: CensusType): CensusOrigin {
    switch (censusType) {
      case CensusType.WEIGHTED:
      case CensusType.ANONYMOUS:
        return CensusOrigin.OFF_CHAIN_TREE_WEIGHTED;
      case CensusType.CSP:
        return CensusOrigin.OFF_CHAIN_CA;
      default:
        throw new Error('Census origin not defined by the census type');
    }
  }

  public static estimateElectionBlocks(election: UnpublishedElection, chainData: ChainData): number {
    return (
      this.estimateBlockAtDateTime(election.endDate, chainData) -
      this.estimateBlockAtDateTime(election.startDate ?? new Date(), chainData)
    );
  }

  public static estimateElectionCost(election: UnpublishedElection, costs: ChainCosts, chainData: ChainData): number {
    if (!election.maxCensusSize) {
      throw new Error('Could not estimate cost because maxCensusSize is not set');
    }

    const electionBlocks = this.estimateElectionBlocks(election, chainData);

    if (electionBlocks <= 0) {
      throw new Error('Could not estimate cost because of negative election blocks size');
    }

    const params = {
      maxCensusSize: election.maxCensusSize,
      electionBlocks: electionBlocks,
      encryptedVotes: election.electionType.secretUntilTheEnd,
      anonymousVotes: election.electionType.anonymous,
      maxVoteOverwrite: election.voteType.maxVoteOverwrites,
    };

    let sizePriceFactor = costs.factors.k1 * params.maxCensusSize * (1 - 1 / costs.capacity);
    if (params.maxCensusSize >= costs.factors.k7) {
      sizePriceFactor *= 1 + costs.factors.k6 * (params.maxCensusSize - costs.factors.k7);
    }
    let sizePrice = sizePriceFactor;

    let durationPrice = costs.factors.k2 * params.electionBlocks * (1 + params.maxCensusSize / costs.capacity);

    let encryptedPrice = 0;
    if (params.encryptedVotes) {
      encryptedPrice = costs.factors.k3 * params.maxCensusSize;
    }

    let anonymousPrice = 0;
    if (params.anonymousVotes) {
      anonymousPrice = costs.factors.k4;
    }

    let overwritePriceFactor = (costs.factors.k5 * params.maxVoteOverwrite) / costs.capacity;
    let overwritePrice = overwritePriceFactor * params.maxCensusSize;

    return costs.basePrice + sizePrice + durationPrice + encryptedPrice + anonymousPrice + overwritePrice;
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

    const outliers = (arr: number[]): number[] => {
      const values = arr.concat();
      values.sort((a, b) => a - b);

      const q1 = values[Math.floor(values.length / 4)];
      const q3 = values[Math.ceil(values.length * (3 / 4))];
      const iqr = q3 - q1;
      const maxValue = q3 + iqr * 1.5;
      const minValue = q1 - iqr * 1.5;

      return values.filter((x) => x <= maxValue && x >= minValue);
    };

    chainData.blockTime = chainData.blockTime.map((part) => {
      return outliers(chainData.blockTime).includes(part) ? part : 0;
    });

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
