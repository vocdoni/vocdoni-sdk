import { CensusType, Election, UnpublishedElection, PublishedCensus, InvalidElection } from '../../../src';

const validCensusId = '43cbda11b9d1a322c03eac325eb8a7b72779b46a76f8a727cff94b539ed9b903';
const validCensusURI = 'ipfs://QmeowUvr4Q9SMBSB942QVzFAqQQYukbjLYXxwANH3oTxbf';
const validCensusType = CensusType.WEIGHTED;

const publishedCensus: PublishedCensus = new PublishedCensus(validCensusId, validCensusURI, validCensusType);

let electionData;

beforeEach(() => {
  electionData = {
    title: {
      en: 'This is a test in english',
      es: 'Esto es un test en castellano',
      default: 'This is the default title',
    },
    description: 'Test',
    header: 'Test',
    streamUri: 'Test',
    meta: {
      test: 'testValue',
      array: [1, 2],
      object: {
        test1: 'test1',
        test2: 'test2',
      },
      census: {
        fields: ['firstname', 'lastname', 'email'],
        type: 'spreadsheet',
      },
    },
    startDate: new Date().getTime() + 80000,
    endDate: new Date().getTime() + 10000000,
    census: publishedCensus,
  };
});

describe('Election tests', () => {
  it('should have the correct type', () => {
    const election = Election.from(electionData);
    expect(election).toBeInstanceOf(UnpublishedElection);
    expect(election.census).toBeInstanceOf(PublishedCensus);
  });
  it('should have the correct default values', () => {
    const election = Election.from(electionData);
    expect(election['id']).toBeUndefined();
    expect(election.maxCensusSize).toBeUndefined();
    expect(election.addSDKVersion).toBeTruthy();
    expect(election.meta).toEqual({
      test: 'testValue',
      array: [1, 2],
      object: {
        test1: 'test1',
        test2: 'test2',
      },
      census: {
        fields: ['firstname', 'lastname', 'email'],
        type: 'spreadsheet',
      },
    });
    expect(election.get('census.type')).toEqual('spreadsheet');
    expect(election.electionType).toEqual({
      autoStart: true,
      interruptible: true,
      dynamicCensus: false,
      secretUntilTheEnd: false,
      anonymous: false,
    });
    expect(election.voteType).toEqual({
      uniqueChoices: false,
      maxVoteOverwrites: 0,
      costFromWeight: false,
      costExponent: 10000,
      maxCount: null,
      maxTotalCost: null,
      maxValue: null,
    });
  });
  it('should have no questions', () => {
    const election = Election.from(electionData);
    expect(election.questions).toEqual([]);
  });
  it('should have the correct default language property even if not set explicitly', () => {
    const election = Election.from(electionData);
    expect(election.description).toEqual({
      default: 'Test',
    });
  });
  it('should throw when start date is invalid', () => {
    electionData.startDate = 'invalid';
    expect(() => {
      Election.from(electionData);
    }).toThrow('Invalid start date');
  });
  it('should throw when end date is invalid', () => {
    electionData.endDate = 'invalid';
    expect(() => {
      Election.from(electionData);
    }).toThrow('Invalid end date');
  });
  it('should throw when end date is before start date', () => {
    electionData.endDate = new Date().getTime();
    expect(() => {
      Election.from(electionData);
    }).toThrow('The end date cannot be prior to the start date');
  });
  it('should throw when no title is set', () => {
    electionData.title = null;
    expect(() => {
      Election.from(electionData);
    }).toThrow('Title is not set');
  });
  it('should throw when no census is set', () => {
    electionData.census = null;
    expect(() => {
      Election.from(electionData);
    }).toThrow('Invalid census');
  });
  it('should throw when maximum census size is zero or negative', () => {
    electionData.maxCensusSize = 0;
    expect(() => {
      Election.from(electionData);
    }).toThrow('Maximum census size cannot be zero or negative');
    electionData.maxCensusSize = -1;
    expect(() => {
      Election.from(electionData);
    }).toThrow('Maximum census size cannot be zero or negative');
  });
  it('should throw when meta uses the sdk restricted field', () => {
    electionData.meta = {
      sdk: 'test',
    };
    expect(() => {
      Election.from(electionData);
    }).toThrow('Field `sdk` is restricted in metadata');
  });
  it('should be possible to create an invalid election', () => {
    const election = new InvalidElection({ id: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' });
    expect(election).toBeInstanceOf(InvalidElection);
    expect(election.id).toEqual('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    expect(election.isValid).toBeFalsy();
  });
});
