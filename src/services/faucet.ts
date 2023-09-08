import { Service, ServiceProperties } from './service';
import invariant from 'tiny-invariant';
import { FaucetAPI } from '../api';
import { Buffer } from 'buffer';

/**
 * Specify custom Faucet.
 *
 * @typedef FaucetOptions
 * @property {string} url
 * @property {string} auth_token
 * @property {number} token_limit
 */
interface FaucetServiceProperties {
  auth_token: string;
  token_limit: number;
}

type FaucetServiceParameters = ServiceProperties & FaucetServiceProperties;

/**
 * @typedef FaucetPackage
 * @property {string} payload
 * @property {string} signature
 */
export type FaucetPackage = {
  payload: string;
  signature: string;
};

export type FaucetOptions = FaucetServiceParameters;

export class FaucetService extends Service implements FaucetServiceProperties {
  public auth_token: string;
  public token_limit: number;

  /**
   * Instantiate the chain service.
   *
   * @param {Partial<FaucetServiceParameters>} params The service parameters
   */
  constructor(params: Partial<FaucetServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  /**
   * Fetches a faucet payload. Only for development.
   *
   * @param {string} address The address where to send the tokens
   * @returns {Promise<{string}>} The encoded faucet package
   */
  fetchPayload(address: string): Promise<string> {
    invariant(this.url, 'No faucet URL');
    invariant(this.auth_token, 'No faucet auth token');
    return FaucetAPI.collect(this.url, this.auth_token, address).then((data) => data.faucetPackage);
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
}
