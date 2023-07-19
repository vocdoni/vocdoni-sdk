import { VocdoniSDKClient } from '../../src';
// @ts-ignore
import { clientParams } from './util/client.params';
import { sha256 } from '@ethersproject/sha2';

describe('Client tests', () => {
  it('should fetch the anonymous circuits correctly', async () => {
    const client = new VocdoniSDKClient(clientParams());
    const firstFetch = await client.fetchCircuits();
    const secondFetch = await client.fetchCircuits();
    expect(firstFetch).toEqual(secondFetch);
    await expect(
      client.setCircuits({
        zKeyData: new Uint8Array(),
        zKeyHash: sha256(new Uint8Array()),
        zKeyURI: '',
        vKeyData: new Uint8Array(),
        vKeyHash: sha256(new Uint8Array()),
        vKeyURI: '',
        wasmData: new Uint8Array(),
        wasmHash: sha256(new Uint8Array()),
        wasmURI: '',
      })
    ).resolves;
  }, 50000);
});
