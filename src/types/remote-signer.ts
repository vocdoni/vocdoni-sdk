import { Provider, TransactionRequest } from '@ethersproject/providers';
import { Bytes } from '@ethersproject/bytes';
import { Signer } from '@ethersproject/abstract-signer';
import { RemoteSignerService } from '../services';

export type RemoteSignerProperties = {
  url: string;
  credentials: RemoteSignerCredentials;
  token: string;
};

export type RemoteSignerCredentials = {
  email: string;
  password: string;
};

export class RemoteSigner extends Signer {
  public url: string;
  public credentials: RemoteSignerCredentials;
  public token: string;
  private _remoteSignerService: RemoteSignerService;

  constructor(params: Partial<RemoteSignerProperties>) {
    super();
    Object.assign(this, params);
    this.remoteSignerService = new RemoteSignerService({ remoteSigner: this });
  }

  async register(): Promise<string> {
    return this.remoteSignerService.register().then((token) => {
      this.token = token;
      return token;
    });
  }

  async login(): Promise<string> {
    return this.remoteSignerService.login().then((token) => {
      this.token = token;
      return token;
    });
  }

  async refresh(): Promise<string> {
    return this.remoteSignerService.refresh().then((token) => {
      this.token = token;
      return token;
    });
  }

  async signMessage(_message: string | Bytes): Promise<string> {
    throw new Error('Not implemented');
  }

  async signTransactionRemotely(message: string | Bytes): Promise<string> {
    return this.remoteSignerService.signPayload(message);
  }

  async getAddress(): Promise<string> {
    return this.remoteSignerService.getAddress();
  }

  async signTransaction(_transaction: TransactionRequest): Promise<string> {
    throw new Error('Not implemented');
  }

  connect(_provider: Provider): Signer {
    return this;
  }

  get remoteSignerService(): RemoteSignerService {
    return this._remoteSignerService;
  }

  set remoteSignerService(value: RemoteSignerService) {
    this._remoteSignerService = value;
  }
}
