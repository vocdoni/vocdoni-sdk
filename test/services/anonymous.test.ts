import { AnonymousService, ChainCircuits } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';
import { sha256 } from 'js-sha256';

describe('Anonymous Service tests', () => {
  it('should have the correct type and properties', () => {
    const service = new AnonymousService({});
    expect(service).toBeInstanceOf(AnonymousService);
    expect(service.url).toBeUndefined();
  });
  it('should have set the correct parameters', async () => {
    const chainCircuits: ChainCircuits = {
      zKeyData: new Uint8Array(),
      zKeyHash: sha256(new Uint8Array()),
      zKeyURI: '',
      vKeyData: new Uint8Array(),
      vKeyHash: sha256(new Uint8Array()),
      vKeyURI: '',
      wasmData: new Uint8Array(),
      wasmHash: sha256(new Uint8Array()),
      wasmURI: '',
    };
    const service = new AnonymousService({ url: URL, chainCircuits });
    expect(service.url).toEqual(URL);
    expect(service.chainCircuits).toEqual(chainCircuits);
    expect(service.checkCircuitsHashes()).toBeTruthy();
  });
});
