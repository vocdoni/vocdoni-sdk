import { AnonymousVote, CspVote, Vote } from '../../../src';

describe('Vote tests', () => {
  it('should have the correct type', () => {
    const vote = new Vote([1, 2, 3]);
    expect(vote).toBeInstanceOf(Vote);
    expect(vote.votes).toEqual([1, 2, 3]);
    expect(vote.memo).toBeUndefined();
  });
  it('should accept a memo', () => {
    const vote = new Vote([1], 'free-text note');
    expect(vote.memo).toEqual('free-text note');
    vote.memo = 'changed';
    expect(vote.memo).toEqual('changed');
  });
  it('should accept a memo of up to 256 bytes', () => {
    const vote = new Vote([1], 'a'.repeat(256));
    expect(vote.memo).toHaveLength(256);
  });
  it('should throw when the memo is longer than 256 bytes', () => {
    expect(() => new Vote([1], 'a'.repeat(257))).toThrow('Memo cannot be longer than 256 bytes');
    // multibyte characters count as their UTF-8 encoded size
    expect(() => new Vote([1], '€'.repeat(86))).toThrow('Memo cannot be longer than 256 bytes');
  });
  it('should normalize an empty memo to undefined', () => {
    expect(new Vote([1], '').memo).toBeUndefined();
    const vote = new Vote([1], 'something');
    vote.memo = '';
    expect(vote.memo).toBeUndefined();
  });
  it('should accept a memo on an anonymous vote', () => {
    const vote = new AnonymousVote([1], 'signature', '0', 'anon note');
    expect(vote).toBeInstanceOf(Vote);
    expect(vote.memo).toEqual('anon note');
    expect(new AnonymousVote([1], 'signature').memo).toBeUndefined();
  });
  it('should accept a memo on a csp vote', () => {
    const vote = new CspVote([1], 'signature', undefined, undefined, 'csp note');
    expect(vote).toBeInstanceOf(Vote);
    expect(vote.memo).toEqual('csp note');
    expect(new CspVote([1], 'signature').memo).toBeUndefined();
  });
});
