import { Service, ServiceProperties } from './service';
import { RemoteSignerAPI } from '../api';
import invariant from 'tiny-invariant';
import { RemoteSigner, RemoteSignerCredentials } from '../types';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Bytes } from '@ethersproject/bytes';

interface RemoteSignerServiceProperties {
  remoteSigner: RemoteSigner;
}

type RemoteSignerServiceParameters = ServiceProperties & RemoteSignerServiceProperties;

export class RemoteSignerService extends Service implements RemoteSignerServiceProperties {
  public remoteSigner: RemoteSigner;

  /**
   * Instantiate the remote signer service.
   *
   * @param params - The service parameters
   */
  constructor(params: Partial<RemoteSignerServiceParameters>) {
    super();
    this.remoteSigner = params.remoteSigner;
  }

  /**
   * Registers a new user using email and password.
   *
   * @param email - The email address
   * @param firstName - The first name
   * @param lastName - The last name
   * @param password - The password
   * @returns The JWT token
   */
  register(email: string, firstName: string, lastName: string, password: string): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.credentials, 'No authentication data set');
    return RemoteSignerAPI.register(this.remoteSigner.url, email, firstName, lastName, password).then(
      (response) => response.token
    );
  }

  /**
   * Logs in to the remote signer.
   *
   * @returns The JWT token
   */
  login(credentials?: RemoteSignerCredentials): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    const login = {
      email: credentials.email ?? this.remoteSigner.credentials.email,
      password: credentials.password ?? this.remoteSigner.credentials.password,
    };
    return RemoteSignerAPI.login(this.remoteSigner.url, login.email, login.password).then((response) => response.token);
  }

  /**
   * Refreshes the JWT token.
   *
   * @returns The JWT token
   */
  refresh(): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.token, 'No auth token set');
    return RemoteSignerAPI.refresh(this.remoteSigner.url, this.remoteSigner.token).then((response) => response.token);
  }

  /**
   * Returns the address of the remote signer.
   *
   * @returns The remote signer address
   */
  getAddress(): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.token, 'No JWT token set');
    return RemoteSignerAPI.addresses(this.remoteSigner.url, this.remoteSigner.token).then((response) => {
      if (response.addresses?.length === 0) throw new Error('No addresses found');
      this.remoteSigner.address = response.addresses[0];
      return this.remoteSigner.address;
    });
  }

  signTxPayload(payload: string | Bytes): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.token, 'No JWT token set');
    invariant(this.remoteSigner.address, 'No address set');

    const payloadBytes = typeof payload === 'string' ? toUtf8Bytes(payload) : payload;
    const payloadBase64 = Buffer.from(Uint8Array.from(payloadBytes)).toString('base64');

    return RemoteSignerAPI.signTransaction(
      this.remoteSigner.url,
      this.remoteSigner.token,
      this.remoteSigner.address,
      payloadBase64
    ).then((response) => response.txPayload);
  }

  signPayload(payload: string | Bytes): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.token, 'No JWT token set');
    invariant(this.remoteSigner.address, 'No address set');

    const payloadBytes = typeof payload === 'string' ? toUtf8Bytes(payload) : payload;
    const payloadBase64 = Buffer.from(Uint8Array.from(payloadBytes)).toString('base64');

    return RemoteSignerAPI.sign(
      this.remoteSigner.url,
      this.remoteSigner.token,
      this.remoteSigner.address,
      payloadBase64
    ).then((response) => response.signature);
  }
}
