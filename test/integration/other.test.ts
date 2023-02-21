import { ElectionMetadataTemplate, VocdoniSDKClient } from '../../src';
// @ts-ignore
import { clientParams } from './util/client.params';

describe('Other tests', () => {
  it('should calculate the correct IPFS hash', async () => {
    const client = new VocdoniSDKClient(clientParams());
    const b64Metadata = Buffer.from(JSON.stringify(ElectionMetadataTemplate), 'utf8').toString('base64');
    const cid = await client.calculateCID(b64Metadata);
    expect(cid).toEqual('ipfs://bagaaieratw2qwvf4mt7qh4mjucqol6542q2t655q3scrx4gc7xtjlrihompq');
  });
});
