import { CENSUS3_URL } from '../../../src/util/constants';
import { VocdoniCensus3Client, EnvOptions } from '../../../src';

describe('Census3 tests', () => {
  it('should have the correct type', () => {
    const census3 = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    expect(census3).toBeInstanceOf(VocdoniCensus3Client);
  });
  it('should have the correct default values for development environment', () => {
    const census3 = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    expect(census3.url).toEqual(CENSUS3_URL.dev);
  });
  it('should have the correct default values for staging environment', () => {
    const census3 = new VocdoniCensus3Client({ env: EnvOptions.STG });
    expect(census3.url).toEqual(CENSUS3_URL.stg);
  });
  it('should have the correct default values for production environment', () => {
    const census3 = new VocdoniCensus3Client({ env: EnvOptions.PROD });
    expect(census3.url).toEqual(CENSUS3_URL.prod);
  });
});
