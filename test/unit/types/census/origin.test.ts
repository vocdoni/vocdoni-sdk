import { CensusOrigin } from '@vocdoni/proto/vochain';
import { Census, CensusType, CspCensus, ElectionService, PublishedCensus } from '../../../../src';
import { ElectionCore } from '../../../../src/core/election';

const CENSUS_ROOT = '0x02a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const CENSUS_URL = 'https://csp.example/v1';

describe('Census origin mapping tests', () => {
  it('should create CSP elections with the OFF_CHAIN_CA_V2 origin', () => {
    expect(ElectionCore.censusOriginFromCensusType(CensusType.CSP)).toEqual(CensusOrigin.OFF_CHAIN_CA_V2);
  });

  it('should read both CSP origins as a CSP census', () => {
    expect(Census.censusTypeFromCensusOrigin('OFF_CHAIN_CA')).toEqual(CensusType.CSP);
    expect(Census.censusTypeFromCensusOrigin('OFF_CHAIN_CA_V2')).toEqual(CensusType.CSP);
    expect(Census.isCspCensusOrigin('OFF_CHAIN_CA')).toBe(true);
    expect(Census.isCspCensusOrigin('OFF_CHAIN_CA_V2')).toBe(true);
    expect(Census.isCspCensusOrigin('OFF_CHAIN_TREE_WEIGHTED')).toBe(false);
  });

  it.each(['OFF_CHAIN_CA', 'OFF_CHAIN_CA_V2'])('should build a CspCensus for a %s election', async (censusOrigin) => {
    const service = new ElectionService({});
    const census = await (service as any).buildCensus({
      census: { censusOrigin, censusRoot: CENSUS_ROOT, censusURL: CENSUS_URL },
    });
    expect(census).toBeInstanceOf(CspCensus);
    expect(census.type).toEqual(CensusType.CSP);
    expect(census.censusURI).toEqual(CENSUS_URL);
  });

  it('should read Merkle tree origins as a weighted census, and anonymous ones as unknown', () => {
    expect(Census.censusTypeFromCensusOrigin('OFF_CHAIN_TREE_WEIGHTED')).toEqual(CensusType.WEIGHTED);
    expect(Census.censusTypeFromCensusOrigin('OFF_CHAIN_TREE_WEIGHTED', true)).toEqual(CensusType.UNKNOWN);
  });

  it.each([
    [false, CensusType.WEIGHTED],
    [true, CensusType.UNKNOWN],
  ])(
    'should build a PublishedCensus for an OFF_CHAIN_TREE_WEIGHTED election (anonymous: %s)',
    async (anonymous, type) => {
      const censusService = {
        get: () => Promise.resolve({ size: 2, weight: BigInt(2), type: CensusType.WEIGHTED }),
      };
      const service = new ElectionService({ censusService: censusService as any });
      const census = await (service as any).buildCensus({
        census: { censusOrigin: 'OFF_CHAIN_TREE_WEIGHTED', censusRoot: CENSUS_ROOT, censusURL: 'ipfs://census' },
        voteMode: { anonymous },
      });
      expect(census).toBeInstanceOf(PublishedCensus);
      expect(census.type).toEqual(type);
      expect(census.size).toEqual(2);
    }
  );
});
