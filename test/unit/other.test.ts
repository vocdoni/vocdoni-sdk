import { ProcessMetadataTemplate } from '../../src';

describe('Other tests', () => {
  it('should calculate the correct IPFS hash', async () => {
    const Hash = require('ipfs-only-hash');
    const cid = await Hash.of(JSON.stringify(ProcessMetadataTemplate));
    expect(cid).toEqual('Qme1mR1LsCkvpNVFFn78exciru29pmqa7HAHhPKpjK21JY');
  });
});
