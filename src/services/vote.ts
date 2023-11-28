import { Service, ServiceProperties } from './service';
import invariant from 'tiny-invariant';
import { ChainService } from './chain';
import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import { VoteCore } from '../core/vote';
import { IVoteInfoResponse, IVoteSubmitResponse, VoteAPI } from '../api';

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

  public async signTransaction(tx: Uint8Array, message: string, walletOrSigner: Wallet | Signer): Promise<string> {
    invariant(this.chainService, 'No chain service set');
    return this.chainService.fetchChainData().then((chainData) => {
      const payload = message.replace('{hash}', VoteCore.hashTransaction(tx)).replace('{chainId}', chainData.chainId);
      return VoteCore.signTransaction(tx, payload, walletOrSigner);
    });
  }

  public encodeTransaction(tx: Uint8Array): string {
    return VoteCore.encodeTransaction(tx);
  }

  /**
   * Get the vote information
   *
   * @param {string} voteId The identifier of the vote
   *
   * @returns {Promise<VoteInfo>}
   */
  info(voteId: string): Promise<VoteInfo> {
    invariant(this.url, 'No URL set');
    return VoteAPI.info(this.url, voteId);
  }

  /**
   * Submit the vote to the chain
   *
   * @param {string} payload The base64 encoded vote transaction
   *
   * @returns {Promise<VoteSubmit>}
   */
  vote(payload: string): Promise<VoteSubmit> {
    invariant(this.url, 'No URL set');
    return VoteAPI.submit(this.url, payload);
  }
}
