import { Service, ServiceProperties } from './service';
import { RemoteSignerAPI } from '../api';
import invariant from 'tiny-invariant';
import { RemoteSigner } from '../types';
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
   * @returns The JWT token
   */
  register(): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.credentials, 'No authentication data set');
    return RemoteSignerAPI.register(
      this.remoteSigner.url,
      this.remoteSigner.credentials.email,
      this.remoteSigner.credentials.password
    ).then((response) => response.token);
  }

  /**
   * Logs in to the remote signer.
   *
   * @returns The JWT token
   */
  login(): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.credentials, 'No authentication data set');
    return RemoteSignerAPI.login(
      this.remoteSigner.url,
      this.remoteSigner.credentials.email,
      this.remoteSigner.credentials.password
    ).then((response) => response.token);
  }

  /**
   * Refreshes the JWT token.
   *
   * @returns The JWT token
   */
  refresh(): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
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
    return RemoteSignerAPI.address(this.remoteSigner.url, this.remoteSigner.token).then((response) => response.address);
  }

  signTxPayload(payload: string | Bytes): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.token, 'No JWT token set');

    const payloadBytes = typeof payload === 'string' ? toUtf8Bytes(payload) : payload;
    const payloadBase64 = Buffer.from(Uint8Array.from(payloadBytes)).toString('base64');

    return RemoteSignerAPI.signTransaction(this.remoteSigner.url, this.remoteSigner.token, payloadBase64).then(
      (response) => response.txPayload
    );
  }

  signPayload(payload: string | Bytes): Promise<string> {
    invariant(this.remoteSigner.url, 'No URL set');
    invariant(this.remoteSigner.token, 'No JWT token set');

    const payloadBytes = typeof payload === 'string' ? toUtf8Bytes(payload) : payload;
    const payloadBase64 = Buffer.from(Uint8Array.from(payloadBytes)).toString('base64');

    return RemoteSignerAPI.sign(this.remoteSigner.url, this.remoteSigner.token, payloadBase64).then(
      (response) => response.signature
    );
  }
}
