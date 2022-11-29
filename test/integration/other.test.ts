import { ElectionMetadataTemplate, EnvironmentInitialitzationOptions, VocdoniSDKClient } from '../../src';

describe('Other tests', () => {
  it('should calculate the correct IPFS hash', async () => {
    const client = new VocdoniSDKClient({ env: EnvironmentInitialitzationOptions.DEV });
    const b64Metadata = Buffer.from(JSON.stringify(ElectionMetadataTemplate), 'binary').toString('base64');
    const cid = await client.calculateCID(b64Metadata);
    expect(cid).toEqual('ipfs://bagaaiera3vfjf7cowopsmb2xvhx5lhrxhi6ahettmhdcvwwhzteqodrc5eqa');
  });
});
