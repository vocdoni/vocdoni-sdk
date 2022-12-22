import axios from 'axios';

enum ChainAPIMethods {
  INFO = '/chain/info',
  TX_INFO = '/chain/transactions/reference',
  SUBMIT_TX = '/chain/transactions',
}

interface IChainGetInfoResponse {
  /**
   * The id of the current chain
   */
  chainId: string;

  /**
   * The different block times from the chain.
   */
  blockTime: number[];

  /**
   * The height or actual block of the current chain.
   */
  height: number;

  /**
   * The timestamp of the actual block.
   */
  blockTimestamp: number;
}

interface IChainGetTransactionReferenceResponse {
  /**
   * The number of the transaction.
   */
  transactionNumber: number;

  /**
   * The hash of the transaction.
   */
  transactionHash: string;

  /**
   * The number of the block where the transaction is.
   */
  blockHeight: number;

  /**
   * The index of the transaction inside the block.
   */
  transactionIndex: number;

  /**
   * The type of the transaction.
   */
  transactionType: string;
}

interface IChainSubmitTxResponse {
  /**
   * The hash of the transaction
   */
  hash: string;

  /**
   * The response data (can vary depending on the transaction type)
   */
  response: string;

  /**
   * The response code
   */
  code: number;
}

export abstract class ChainAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Fetches info about the blokchain status.
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IChainGetInfoResponse>}
   */
  public static info(url: string): Promise<IChainGetInfoResponse> {
    return axios
      .get<IChainGetInfoResponse>(url + ChainAPIMethods.INFO)
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }

  /**
   * Fetches information about a transaction from the blockchain.
   *
   * @param {string} url API endpoint URL
   * @param {string} txHash The transaction hash which we want to retrieve the info from
   * @returns {Promise<IChainGetTransactionReferenceResponse>}
   */
  public static txInfo(url: string, txHash: string): Promise<IChainGetTransactionReferenceResponse> {
    return axios
      .get<IChainGetTransactionReferenceResponse>(url + ChainAPIMethods.TX_INFO + '/' + txHash)
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }

  /**
   * Submits a transaction to the blockchain
   *
   * @param {string} url API endpoint URL
   * @param {string} payload The transaction data payload
   * @returns {Promise<IChainSubmitTxResponse>}
   */
  public static submitTx(url: string, payload: string): Promise<IChainSubmitTxResponse> {
    return axios
      .post<IChainSubmitTxResponse>(url + ChainAPIMethods.SUBMIT_TX, JSON.stringify({ payload }))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}
