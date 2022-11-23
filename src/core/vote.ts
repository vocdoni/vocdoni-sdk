import {
  Proof,
  ProofArbo,
  ProofArbo_KeyType,
  ProofArbo_Type,
  Tx,
  VoteEnvelope,
} from '../dvote-protobuf/build/ts/vochain/vochain';
import { getHex, strip0x } from '../util/common';
import { IProcessCensusOrigin, ProcessCensusOrigin } from 'dvote-solidity'; // check dvote-protobuf!
import { Buffer } from 'buffer';
import { Asymmetric } from '../util/encryption';
import { IElection } from '../api/election';
import { Vote } from '../types';
import { CensusProof } from '../client';
import { TransactionCore } from './transaction';

export type IProofArbo = { siblings: string; weight?: bigint };
export type IProofCA = {
  type: number;
  voterAddress: string;
  signature: string;
  weight?: bigint;
};
export type IProofEVM = {
  key: string;
  proof: string[];
  value: string;
  weight?: bigint;
};

export type ProcessKeys = {
  encryptionPubKeys: { index: number; key: string }[];
  encryptionPrivKeys?: { index: number; key: string }[];
  commitmentKeys?: { index: number; key: string }[];
  revealKeys?: { index: number; key: string }[];
};

export type VoteValues = Array<number | bigint>;
export type VotePackage = {
  nonce: string;
  votes: VoteValues;
};

export enum CensusProofType {
  PUBKEY = 'pubkey',
  ADDRESS = 'address',
}

export abstract class VoteCore extends TransactionCore {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static generateVoteTransaction(
    election: IElection,
    censusProof: CensusProof,
    votePackage: Vote,
    processKeys?: ProcessKeys
  ): Uint8Array {
    const txData = this.prepareVoteData(election, censusProof, votePackage, processKeys);
    const vote = VoteEnvelope.fromPartial(txData);
    return Tx.encode({
      payload: { $case: 'vote', vote },
    }).finish();
  }

  private static prepareVoteData(
    election: IElection,
    censusProof: CensusProof,
    vote: Vote,
    processKeys?: ProcessKeys
  ): object {
    // if (!params) throw new Error("Invalid parameters")
    // else if (!Array.isArray(params.votes)) throw new Error("Invalid votes array")
    // else if (typeof params.processId != "string" || !params.processId.match(/^(0x)?[0-9a-zA-Z]+$/)) throw new Error("Invalid processId")
    // else if (params.processKeys) {
    //   if (!Array.isArray(params.processKeys.encryptionPubKeys) || !params.processKeys.encryptionPubKeys.every(
    //       item => item && typeof item.idx == "number" && typeof item.key == "string" && item.key.match(/^(0x)?[0-9a-zA-Z]+$/))) {
    //     throw new Error("Some encryption public keys are not valid")
    //   }
    // }
    const processCensusOrigin = new ProcessCensusOrigin(
      Object.values(ProcessCensusOrigin)[
        Object.keys(ProcessCensusOrigin).indexOf(election.census.censusOrigin)
      ] as IProcessCensusOrigin
    );

    try {
      const proof = this.packageSignedProof(election.electionId, processCensusOrigin, censusProof);
      // const nonce = hexStringToBuffer(Random.getHex());
      const nonce = Buffer.from(strip0x(getHex()), 'hex');
      const { votePackage, keyIndexes } = this.packageVoteContent(vote.votes, processKeys);

      return {
        proof,
        processId: new Uint8Array(Buffer.from(strip0x(election.electionId), 'hex')),
        nonce: new Uint8Array(nonce),
        votePackage: new Uint8Array(votePackage),
        encryptionKeyIndexes: keyIndexes || [],
        nullifier: new Uint8Array(),
      };
    } catch (error) {
      throw new Error('The poll vote envelope could not be generated');
    }
  }

  /** Packages the given parameters into a proof that can be submitted to the Vochain */
  private static packageSignedProof(
    processId: string,
    censusOrigin: ProcessCensusOrigin,
    censusProof: CensusProof
  ): Proof {
    const proof = Proof.fromPartial({});
    processId.toString(); // TODO remove

    if (censusOrigin.isOffChain || censusOrigin.isOffChainWeighted) {
      // Check census proof
      if (typeof censusProof?.proof !== 'string' || !censusProof?.proof.match(/^(0x)?[0-9a-zA-Z]+$/)) {
        throw new Error('Invalid census proof (must be a hex string)');
      }

      let keyType;
      switch (censusProof.type) {
        case CensusProofType.ADDRESS:
          keyType = ProofArbo_KeyType.ADDRESS;
          break;
        case CensusProofType.PUBKEY:
          keyType = ProofArbo_KeyType.PUBKEY;
          break;
        default:
          keyType = ProofArbo_KeyType.UNRECOGNIZED;
          break;
      }

      const aProof = ProofArbo.fromPartial({
        siblings: Uint8Array.from(Buffer.from(censusProof.proof, 'hex')),
        type: ProofArbo_Type.BLAKE2B,
        value: new Uint8Array(Buffer.from(censusProof.value, 'hex')),
        keyType,
      });
      proof.payload = { $case: 'arbo', arbo: aProof };
    }
    // else if (censusOrigin.isOffChainCA) {
    //   // Check census proof
    //   const resolvedProof = resolveCaProof(censusProof)
    //   if (!resolvedProof) throw new Error("The proof is not valid")
    //
    //   const caBundle = CAbundle.fromPartial({
    //     processId: new Uint8Array(hexStringToBuffer(processId)),
    //     address: new Uint8Array(hexStringToBuffer(resolvedProof.voterAddress)),
    //     // weight
    //   })
    //
    //   // Populate the proof
    //   const caProof = ProofCA.fromPartial({
    //     type: resolvedProof.type,
    //     signature: new Uint8Array(hexStringToBuffer(resolvedProof.signature)),
    //     bundle: caBundle
    //     // weight
    //   })
    //
    //   proof.payload = { $case: "ca", ca: caProof }
    // }
    // else if (censusOrigin.isErc20 || censusOrigin.isErc721 || censusOrigin.isErc1155 || censusOrigin.isErc777) {
    //   // Check census proof
    //   const resolvedProof = resolveEvmProof(censusProof)
    //   if (!resolvedProof) throw new Error("The proof is not valid")
    //
    //   if (typeof resolvedProof == "string") throw new Error("Invalid census proof for an EVM process")
    //   else if (typeof resolvedProof.key != "string" ||
    //       !Array.isArray(resolvedProof.proof) || typeof resolvedProof.value != "string")
    //     throw new Error("Invalid census proof (must be an object)")
    //
    //   let hexValue = resolvedProof.value
    //   if (resolvedProof.value.length % 2 !== 0) {
    //     hexValue = resolvedProof.value.replace("0x", "0x0")
    //   }
    //
    //   const siblings = resolvedProof.proof.map(sibling => new Uint8Array(hexStringToBuffer(sibling)))
    //
    //   const esProof = ProofEthereumStorage.fromPartial({
    //     key: new Uint8Array(hexStringToBuffer(resolvedProof.key)),
    //     value: new Uint8Array(hexStringToBuffer(hexValue)),
    //     siblings: siblings
    //   })
    //
    //   proof.payload = { $case: "ethereumStorage", ethereumStorage: esProof }
    // }
    else {
      throw new Error('This process type is not supported yet');
    }
    return proof;
  }

  private static packageVoteContent(votes: VoteValues, processKeys?: ProcessKeys) {
    // if (!Array.isArray(votes)) throw new Error('Invalid votes');
    // else if (votes.some(vote => typeof vote !== 'number'))
    //   throw new Error('Votes needs to be an array of numbers');
    // else if (processKeys) {
    //   if (
    //     !Array.isArray(processKeys.encryptionPubKeys) ||
    //     !processKeys.encryptionPubKeys.every(
    //       item =>
    //         item &&
    //         typeof item.idx === 'number' &&
    //         typeof item.key === 'string' &&
    //         item.key.match(/^(0x)?[0-9a-zA-Z]+$/)
    //     )
    //   ) {
    //     throw new Error('Some encryption public keys are not valid');
    //   }
    // }

    // produce a 8 byte nonce
    const nonce = getHex().substring(2, 18);

    const payload: VotePackage = {
      nonce,
      votes,
    };
    const strPayload = JSON.stringify(payload);

    if (processKeys && processKeys.encryptionPubKeys && processKeys.encryptionPubKeys.length) {
      // Sort key indexes
      processKeys.encryptionPubKeys.sort((a, b) => a.index - b.index);

      const publicKeys: string[] = [];
      const publicKeysIdx: number[] = [];
      // NOTE: Using all keys by now
      processKeys.encryptionPubKeys.forEach((entry) => {
        publicKeys.push(strip0x(entry.key));
        publicKeysIdx.push(entry.index);
      });

      let votePackage = Asymmetric.encryptRaw(Buffer.from(strPayload), publicKeys[0]);
      for (let i = 1; i < publicKeys.length; i++) {
        votePackage = Asymmetric.encryptRaw(votePackage, publicKeys[i]);
      }
      return { votePackage, keyIndexes: publicKeysIdx };
    } else {
      return { votePackage: Buffer.from(strPayload) };
    }
  }
}
