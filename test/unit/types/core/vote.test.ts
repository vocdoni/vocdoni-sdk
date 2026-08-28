import { Tx } from '@vocdoni/proto/vochain';
import { Buffer } from 'buffer';
import { CensusType, CspService, PublishedElection, Vote } from '../../../../src';
import { CensusProof } from '../../../../src/services';
import { VoteCore } from '../../../../src/core/vote';

const electionId = '43cbda11b9d1a322c03eac325eb8a7b72779b46a76f8a727cff94b539ed9b903';

// generateVoteTransaction only reads the identifier and the census type off the election
const election = {
  id: electionId,
  census: { type: CensusType.WEIGHTED },
} as unknown as PublishedElection;

const censusProof: CensusProof = {
  type: CensusType.WEIGHTED,
  weight: '1',
  root: electionId,
  proof: 'deadbeef',
  value: '01',
};

const decodeMemo = (tx: Uint8Array): string => {
  const decoded = Tx.decode(tx);
  if (decoded.payload?.$case !== 'vote') {
    throw new Error('The decoded transaction is not a vote');
  }
  const memo = decoded.payload.vote.memo;
  return memo ? Buffer.from(memo).toString('utf8') : undefined;
};

describe('Vote core tests', () => {
  it('should encode the memo into the vote envelope', () => {
    const { tx } = VoteCore.generateVoteTransaction(election, censusProof, new Vote([1], 'free-text note'));
    expect(decodeMemo(tx)).toEqual('free-text note');
  });
  it('should roundtrip a multibyte memo verbatim', () => {
    const memo = 'Otro: ñandú 🗳 ✓';
    const { tx } = VoteCore.generateVoteTransaction(election, censusProof, new Vote([1], memo));
    expect(decodeMemo(tx)).toEqual(memo);
  });
  it('should omit the memo when the vote carries none', () => {
    const { tx } = VoteCore.generateVoteTransaction(election, censusProof, new Vote([1]));
    expect(decodeMemo(tx)).toBeUndefined();
    const empty = VoteCore.generateVoteTransaction(election, censusProof, new Vote([1], ''));
    expect(decodeMemo(empty.tx)).toBeUndefined();
  });
  it('should keep the memo when building a csp vote out of a plain vote', () => {
    const cspVote = CspService.cspVote(new Vote([1], 'csp note'), 'signature');
    expect(cspVote.memo).toEqual('csp note');
    expect(cspVote.votes).toEqual([1]);
  });
});
