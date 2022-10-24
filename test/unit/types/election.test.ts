import { CensusType, Election, PublishedCensus } from '../../../src';

const validCensusId = '43cbda11b9d1a322c03eac325eb8a7b72779b46a76f8a727cff94b539ed9b903';
const validCensusURI = 'ipfs://QmeowUvr4Q9SMBSB942QVzFAqQQYukbjLYXxwANH3oTxbf';
const validCensusType = CensusType.WEIGHTED;

const publishedCensus: PublishedCensus = new PublishedCensus(validCensusId, validCensusURI, validCensusType);

const electionData = {
  title: {
    es: 'This is a test in english',
    en: 'Esto es un test en castellano',
    default: 'This is the default title',
  },
  description: 'Test',
  header: 'Test',
  streamUri: 'Test',
  startDate: new Date().getTime() + 80000,
  endDate: new Date().getTime() + 10000000,
  census: publishedCensus,
};

describe('Election tests', () => {
  it('should have the correct type', () => {
    const election = new Election(electionData);
    expect(election).toBeInstanceOf(Election);
    expect(election.census).toBeInstanceOf(PublishedCensus);
  });
  it('should have the correct default values', () => {
    const election = new Election(electionData);
    expect(election.electionType).toEqual({
      autoStart: true,
      interruptible: true,
      dynamicCensus: false,
      secretUntilTheEnd: false,
      anonymous: false,
    });
    expect(election.voteType).toEqual({
      uniqueChoices: false,
      maxVoteOverwrites: 1,
      costFromWeight: false,
      costExponent: 10000,
    });
  });
  it('should have no questions', () => {
    const election = new Election(electionData);
    expect(election.questions).toEqual([]);
  });
});
