import { Service, ServiceProperties } from './service';
import invariant from 'tiny-invariant';
import { ChainService } from './chain';
import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import { VoteCore } from '../core/vote';
import { IVoteInfoResponse, IVoteSubmitResponse, VoteAPI } from '../api';
import { keccak256 } from '@ethersproject/keccak256';

interface VoteServiceProperties {
  chainService: ChainService;
}

type VoteServiceParameters = ServiceProperties & VoteServiceProperties;

export type VoteInfo = IVoteInfoResponse;
export type VoteSubmit = IVoteSubmitResponse;

export class VoteService extends Service implements VoteServiceProperties {
  public chainService: ChainService;

  /**
   * Instantiate the election service.
   *
   * @param {Partial<VoteServiceParameters>} params The service parameters
   */
  constructor(params: Partial<VoteServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  public async signTransaction(tx: Uint8Array, walletOrSigner: Wallet | Signer): Promise<string> {
    invariant(this.chainService, 'No chain service set');
    return this.chainService
      .fetchChainData()
      .then((chainData) => VoteCore.signTransaction(tx, chainData.chainId, walletOrSigner));
  }

  /**
   * Get the vote information
   *
   * @param {string} address The address of the voter
   * @param {string} electionId The id of the election
   *
   * @returns {Promise<VoteInfo>}
   */
  info(address: string, electionId: string): Promise<VoteInfo> {
    return VoteAPI.info(this.url, keccak256(address.toLowerCase() + electionId));
  }

  /**
   * Submit the vote to the chain
   *
   * @param {string} payload The base64 encoded vote transaction
   *
   * @returns {Promise<VoteSubmit>}
   */
  vote(payload: string): Promise<VoteSubmit> {
    return VoteAPI.submit(this.url, payload);
  }
}
