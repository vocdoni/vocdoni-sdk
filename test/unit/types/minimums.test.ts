import {
  ApprovalElection,
  BudgetElection,
  CensusType,
  Election,
  ElectionResultsTypeNames,
  IVoteType,
  PublishedCensus,
  PublishedElection,
  QuadraticElection,
  Vote,
} from '../../../src';

const census = new PublishedCensus(
  '43cbda11b9d1a322c03eac325eb8a7b72779b46a76f8a727cff94b539ed9b903',
  'ipfs://QmeowUvr4Q9SMBSB942QVzFAqQQYukbjLYXxwANH3oTxbf',
  CensusType.WEIGHTED
);

const baseParams = (voteType?: IVoteType) => ({
  title: 'Minimums',
  endDate: new Date().getTime() + 10000000,
  census,
  voteType,
});

const choices = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];

describe('Ballot minimums', () => {
  describe('vote options', () => {
    it('should send no minimums by default', () => {
      const election = Election.from(baseParams());
      election.addQuestion('Q', 'D', choices);
      expect(election.generateVoteOptions()).toEqual({
        maxCount: 1,
        maxValue: 2,
        maxVoteOverwrites: 0,
        maxTotalCost: 0,
        costExponent: 1,
        minValue: 0,
        minTotalCost: 0,
      });
    });
    it('should send the minimums of the vote type', () => {
      const election = Election.from(baseParams({ minValue: 1, minTotalCost: 2, maxTotalCost: 4 }));
      election.addQuestion('Q', 'D', choices);
      expect(election.generateVoteOptions()).toMatchObject({ maxTotalCost: 4, minValue: 1, minTotalCost: 2 });
    });
    it('should send the minimums of typed elections', () => {
      const budget = BudgetElection.from({
        ...baseParams({ minTotalCost: 10 }),
        useCensusWeightAsBudget: false,
        maxBudget: 10,
      });
      budget.addQuestion('Q', 'D', choices);
      expect(budget.generateVoteOptions()).toMatchObject({ maxTotalCost: 10, minTotalCost: 10, minValue: 0 });

      const approval = ApprovalElection.from(baseParams({ minTotalCost: 1 }));
      approval.addQuestion('Q', 'D', choices);
      expect(approval.generateVoteOptions()).toMatchObject({ maxValue: 1, minTotalCost: 1 });
    });
    it('should reject a min value greater than the max value', () => {
      const election = Election.from(baseParams({ minValue: 3 }));
      election.addQuestion('Q', 'D', choices);
      expect(() => election.generateVoteOptions()).toThrow('Min value (3) cannot be greater than max value (2)');
    });
    it('should reject a min total cost greater than the max total cost', () => {
      const budget = BudgetElection.from({
        ...baseParams({ minTotalCost: 11 }),
        useCensusWeightAsBudget: false,
        maxBudget: 10,
      });
      budget.addQuestion('Q', 'D', choices);
      expect(() => budget.generateVoteOptions()).toThrow(
        'Min total cost (11) cannot be greater than max total cost (10)'
      );
    });
    it('should accept any min total cost when there is no max total cost', () => {
      const quadratic = QuadraticElection.from({ ...baseParams({ minTotalCost: 50 }), useCensusWeightAsBudget: true });
      quadratic.addQuestion('Q', 'D', choices);
      expect(quadratic.generateVoteOptions()).toMatchObject({ maxTotalCost: 0, minTotalCost: 50, costExponent: 2 });
    });
    it('should reject a cost exponent over 8 with a min total cost', () => {
      const election = Election.from(baseParams({ minTotalCost: 1, costExponent: 9 }));
      election.addQuestion('Q', 'D', choices);
      expect(() => election.generateVoteOptions()).toThrow(
        'Cost exponent cannot be greater than 8 when min total cost is set'
      );
      election.voteType.minTotalCost = 0;
      expect(election.generateVoteOptions()).toMatchObject({ costExponent: 9, minTotalCost: 0 });
    });
    it('should reject negative or non-integer minimums', () => {
      const election = Election.from(baseParams({ minValue: -1 }));
      election.addQuestion('Q', 'D', choices);
      expect(() => election.generateVoteOptions()).toThrow('Min value must be a non-negative integer');
      election.voteType.minValue = 0;
      election.voteType.minTotalCost = 1.5;
      expect(() => election.generateVoteOptions()).toThrow('Min total cost must be a non-negative integer');
    });
  });

  describe('checkVote', () => {
    const voteType: IVoteType = {
      uniqueChoices: false,
      maxCount: 3,
      maxValue: 5,
      costExponent: 1,
      minValue: 0,
      minTotalCost: 0,
    };

    it('should accept any ballot without minimums', () => {
      expect(PublishedElection.checkVote(new Vote([]), voteType)).toBeUndefined();
      expect(PublishedElection.checkVote(new Vote([0, 0, 0]), voteType)).toBeUndefined();
    });
    it('should reject a value below the min value', () => {
      const withMin = { ...voteType, minValue: 1 };
      expect(PublishedElection.checkVote(new Vote([1, 5]), withMin)).toBeUndefined();
      expect(PublishedElection.checkVote(new Vote([]), withMin)).toBeUndefined();
      expect(() => PublishedElection.checkVote(new Vote([1, 0]), withMin)).toThrow(
        'Invalid choice value, minimum is 1'
      );
    });
    it('should reject a total cost below the min total cost', () => {
      const withMin = { ...voteType, minTotalCost: 3 };
      expect(PublishedElection.checkVote(new Vote([1, 2]), withMin)).toBeUndefined();
      expect(() => PublishedElection.checkVote(new Vote([1, 1]), withMin)).toThrow(
        'Total cost is below the minimum of 3'
      );
      expect(() => PublishedElection.checkVote(new Vote([]), withMin)).toThrow('Total cost is below the minimum of 3');
    });
    it('should count every field with cost exponent 0, as 0^0 = 1', () => {
      const withMin = { ...voteType, costExponent: 0, minTotalCost: 2 };
      expect(PublishedElection.checkVote(new Vote([0, 0]), withMin)).toBeUndefined();
      expect(() => PublishedElection.checkVote(new Vote([0]), withMin)).toThrow('Total cost is below the minimum of 2');
    });
    it('should apply the minimums in typed elections', () => {
      const resultsType = {
        name: ElectionResultsTypeNames.QUADRATIC,
        properties: { useCensusWeightAsBudget: false, maxBudget: 20, forceFullBudget: false, minStep: 1 },
      } as any;
      const quadratic = { ...voteType, maxValue: 0, maxTotalCost: 20, costExponent: 2, minTotalCost: 9 };
      expect(QuadraticElection.checkVote(new Vote([3, 0, 0]), resultsType, quadratic)).toBeUndefined();
      expect(() => QuadraticElection.checkVote(new Vote([2, 2, 0]), resultsType, quadratic)).toThrow(
        'Total cost is below the minimum of 9'
      );

      const approval = { ...voteType, maxValue: 1, minTotalCost: 1 };
      expect(ApprovalElection.checkVote(new Vote([0, 1, 0]), approval)).toBeUndefined();
      expect(() => ApprovalElection.checkVote(new Vote([0, 0, 0]), approval)).toThrow(
        'Total cost is below the minimum of 1'
      );
    });
  });
});
