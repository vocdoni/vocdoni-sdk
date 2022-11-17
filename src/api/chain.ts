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
   * The number of the block where the transaction is.
   */
  blockHeight: number;

  /**
   * The index of the transaction inside the block.
   */
  transactionIndex: number;
}

interface IChainSubmitTxRequest {
  /**
   * The raw payload to be submitted to the chain
   */
  payload: string;
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

  public static submitTx(url: string, data: IChainSubmitTxRequest): Promise<IChainSubmitTxResponse> {
    return axios
      .post<IChainSubmitTxResponse>(url + ChainAPIMethods.SUBMIT_TX, JSON.stringify(data))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}
