import Hash from 'ipfs-only-hash';
import { ElectionMetadataTemplate } from '../../src';

describe('Other tests', () => {
  it('should calculate the correct IPFS hash', async () => {
    const cid = await Hash.of(JSON.stringify(ElectionMetadataTemplate))
    expect(cid).toEqual('Qme1mR1LsCkvpNVFFn78exciru29pmqa7HAHhPKpjK21JY')
  });
});
