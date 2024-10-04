import { ElectionMetadataTemplate, getElectionMetadataTemplate, VocdoniSDKClient } from '../../src';
// @ts-ignore
import { clientParams } from './util/client.params';

describe('Other tests', () => {
  it('should calculate the correct IPFS hash', async () => {
    const client = new VocdoniSDKClient(clientParams());
    const b64Metadata = JSON.stringify(ElectionMetadataTemplate);
    const cid = await client.calculateCID(b64Metadata);
    expect(cid).toEqual('ipfs://bafybeih3bjtnienqbz5ecgr5my7lotw3lanffdjpv3jl7ma3srdwnhx4pi');
  });
  it('should calculate the correct IPFS hash with special characters', async () => {
    const client = new VocdoniSDKClient(clientParams());
    const election = getElectionMetadataTemplate();
    election.title = {
      default: 'Això és un títol',
    };
    election.description = {
      default: 'こんにちは世界',
    };
    const b64Metadata = JSON.stringify(election);
    const cid = await client.calculateCID(b64Metadata);
    expect(cid).toEqual('ipfs://bafybeibl2lkbswtxcqdynzvxs6ku76avkjtkcan44ypnju4txx7rt2udfi');
  });
});
