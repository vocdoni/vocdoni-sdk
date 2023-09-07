import { ElectionMetadataTemplate, VocdoniSDKClient } from '../../src';
// @ts-ignore
import { clientParams } from './util/client.params';

describe('Other tests', () => {
  it('should calculate the correct IPFS hash', async () => {
    const client = new VocdoniSDKClient(clientParams());
    const b64Metadata = JSON.stringify(ElectionMetadataTemplate);
    const cid = await client.calculateCID(b64Metadata);
    expect(cid).toEqual('ipfs://bafybeigs3vmszvbzvhheixhgkynbc57csmga6ayhwephtyganed4xkanyi');
  });
  it('should calculate the correct IPFS hash with special characters', async () => {
    const client = new VocdoniSDKClient(clientParams());
    const election = ElectionMetadataTemplate;
    election.title = {
      default: 'Això és un títol',
    };
    election.description = {
      default: 'こんにちは世界',
    };
    const b64Metadata = JSON.stringify(election);
    const cid = await client.calculateCID(b64Metadata);
    expect(cid).toEqual('ipfs://bafybeics2rrjzgnlfliplny2l4ke7jxa3keq6oqlbg5op7pmubvz7sp5ga');
  });
});
