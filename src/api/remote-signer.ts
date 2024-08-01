import axios from 'axios';
import { API } from './api';

enum RemoteSignerAPIMethods {
  REGISTER = '/users',
  LOGIN = '/auth/login',
  REFRESH = '/auth/refresh',
  ADDRESS = '/users/address',
  SIGN = '/transactions',
}

export interface IRemoteSignerRegisterResponse {
  /**
   * The JWT token
   */
  token: string;
}

export interface IRemoteSignerLoginResponse {
  /**
   * The JWT token
   */
  token: string;
}

export interface IRemoteSignerRefreshResponse {
  /**
   * The JWT token
   */
  token: string;
}

export interface IRemoteSignerAddressResponse {
  /**
   * The address of the remote signer
   */
  address: string;
}

export interface IRemoteSignerSignResponse {
  /**
   * The signed payload
   */
  txPayload: string;
}

export abstract class RemoteSignerAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Registers a new user using email and password.
   *
   * @param url - API endpoint URL
   * @param email - The email address
   * @param password - The password
   */
  public static register(url: string, email: string, password: string): Promise<IRemoteSignerRegisterResponse> {
    return axios
      .post<IRemoteSignerRegisterResponse>(url + RemoteSignerAPIMethods.REGISTER, { email, password })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Logs in a user using email and password.
   *
   * @param url - API endpoint URL
   * @param email - The email address
   * @param password - The password
   */
  public static login(url: string, email: string, password: string): Promise<IRemoteSignerLoginResponse> {
    return axios
      .post<IRemoteSignerLoginResponse>(url + RemoteSignerAPIMethods.LOGIN, { email, password })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Refreshes the JWT token.
   *
   * @param url - API endpoint URL
   * @param authToken - Authentication token
   */
  public static refresh(url: string, authToken: string): Promise<IRemoteSignerRefreshResponse> {
    return axios
      .post<IRemoteSignerRefreshResponse>(url + RemoteSignerAPIMethods.REFRESH, null, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Gets the address of the remote signer.
   *
   * @param url - API endpoint URL
   * @param authToken - Authentication token
   */
  public static address(url: string, authToken: string): Promise<IRemoteSignerAddressResponse> {
    return axios
      .get<IRemoteSignerAddressResponse>(url + RemoteSignerAPIMethods.ADDRESS, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Signs the payload using the remote signer.
   *
   * @param url - API endpoint URL
   * @param authToken - Authentication token
   * @param payload - The transaction payload
   */
  public static sign(url: string, authToken: string, payload: string): Promise<IRemoteSignerSignResponse> {
    return axios
      .post<IRemoteSignerSignResponse>(
        url + RemoteSignerAPIMethods.SIGN,
        { txPayload: payload },
        {
          headers: {
            Authorization: 'Bearer ' + authToken,
          },
        }
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}
