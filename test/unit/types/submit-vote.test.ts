import { Wallet } from '@ethersproject/wallet';
import {
  CensusType,
  CspVote,
  EnvOptions,
  ErrElectionMetadataChanged,
  PublishedElection,
  VocdoniSDKClient,
} from '../../../src';
import { VoteCore } from '../../../src/core/vote';

const ELECTION_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2b3';
const PARENT_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2ff';
const SHOWN_HASH = 'aa'.repeat(32);
const CHANGED_HASH = 'bb'.repeat(32);

describe('submitVote metadata hash attestation', () => {
  let client: VocdoniSDKClient;
  // the election state the API currently returns
  let currentHash: string | undefined;
  let currentParentHash: string | undefined;
  let parentElectionId: string | undefined;
  let metadataOnly: boolean;
  let fetchElection: jest.SpyInstance;
  let generateVoteTransaction: jest.SpyInstance;
  let vote: jest.SpyInstance;

  const attestation = () => generateVoteTransaction.mock.calls[generateVoteTransaction.mock.calls.length - 1][5];
  const attestedHash = () => attestation().metadataHash;
  const attestedParentHash = () => attestation().parentMetadataHash;
  const cspVote = () => new CspVote([1], 'cc'.repeat(65));

  beforeEach(() => {
    client = new VocdoniSDKClient({ env: EnvOptions.DEV, wallet: Wallet.createRandom(), electionId: ELECTION_ID });
    currentHash = SHOWN_HASH;
    currentParentHash = SHOWN_HASH;
    parentElectionId = undefined;
    metadataOnly = false;
    fetchElection = jest.spyOn(client.electionService, 'fetchElection').mockImplementation(async (electionId) =>
      electionId === PARENT_ID
        ? ({ id: PARENT_ID, metadataOnly: true, metadataHash: currentParentHash } as unknown as PublishedElection)
        : ({
            id: ELECTION_ID,
            census: { type: CensusType.CSP },
            electionType: { anonymous: false, secretUntilTheEnd: false },
            metadataHash: currentHash,
            parentElectionId,
            metadataOnly,
          } as unknown as PublishedElection)
    );
    generateVoteTransaction = jest
      .spyOn(VoteCore, 'generateVoteTransaction')
      .mockReturnValue({ tx: new Uint8Array(), message: '' });
    jest.spyOn(client.voteService, 'signTransaction').mockResolvedValue('signed');
    vote = jest.spyOn(client.voteService, 'vote').mockResolvedValue({ txHash: 'txhash', voteID: 'voteid' } as never);
    jest.spyOn(client.chainService, 'waitForTransaction').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should attest the version returned by fetchElection, not the one submitVote fetches', async () => {
    await client.fetchElection();
    currentHash = CHANGED_HASH;

    await client.submitVote(cspVote());
    expect(attestedHash()).toEqual(SHOWN_HASH);
  });

  it('should keep attesting the shown version on a retry after a rejection', async () => {
    await client.fetchElection();
    currentHash = CHANGED_HASH;
    vote.mockRejectedValue(new ErrElectionMetadataChanged());

    await expect(client.submitVote(cspVote())).rejects.toThrow(ErrElectionMetadataChanged);
    await expect(client.submitVote(cspVote())).rejects.toThrow(ErrElectionMetadataChanged);
    expect(attestedHash()).toEqual(SHOWN_HASH);
  });

  it('should attest the new version once fetchElection is called again', async () => {
    await client.fetchElection();
    currentHash = CHANGED_HASH;
    await client.fetchElection();

    await client.submitVote(cspVote());
    expect(attestedHash()).toEqual(CHANGED_HASH);
  });

  it('should attest an empty hash when the shown version had none', async () => {
    currentHash = undefined;
    await client.fetchElection();
    currentHash = CHANGED_HASH;

    await client.submitVote(cspVote());
    expect(attestedHash()).toEqual('');
  });

  it('should attest the current version when the app never called fetchElection', async () => {
    currentHash = CHANGED_HASH;

    await client.submitVote(cspVote());
    expect(attestedHash()).toEqual(CHANGED_HASH);
  });

  it('should attest the explicitly given metadata hash', async () => {
    await client.fetchElection();
    const given = 'dd'.repeat(32);

    await client.submitVote(cspVote(), { metadataHash: given });
    expect(attestedHash()).toEqual(given);
  });

  it('should refuse to vote on a metadata-only election', async () => {
    metadataOnly = true;

    await expect(client.submitVote(cspVote())).rejects.toThrow('Metadata-only elections do not accept votes');
    expect(vote).not.toHaveBeenCalled();
  });

  it('should attest an empty parent hash for elections without a parent', async () => {
    await client.submitVote(cspVote());
    expect(attestedParentHash()).toEqual('');
  });

  describe('with a parent election', () => {
    beforeEach(() => {
      parentElectionId = PARENT_ID;
    });

    it('should attest the parent version returned by fetchElection', async () => {
      await client.fetchElection(PARENT_ID);
      await client.fetchElection();
      currentParentHash = CHANGED_HASH;

      await client.submitVote(cspVote());
      expect(attestedParentHash()).toEqual(SHOWN_HASH);
      expect(attestedHash()).toEqual(SHOWN_HASH);
    });

    it('should keep attesting the shown parent version on a retry after a rejection', async () => {
      await client.fetchElection(PARENT_ID);
      currentParentHash = CHANGED_HASH;
      vote.mockRejectedValue(new ErrElectionMetadataChanged());

      await expect(client.submitVote(cspVote())).rejects.toThrow(ErrElectionMetadataChanged);
      await expect(client.submitVote(cspVote())).rejects.toThrow(ErrElectionMetadataChanged);
      expect(attestedParentHash()).toEqual(SHOWN_HASH);
    });

    it('should attest the new parent version once fetchElection is called again for it', async () => {
      await client.fetchElection(PARENT_ID);
      currentParentHash = CHANGED_HASH;
      await client.fetchElection(PARENT_ID);

      await client.submitVote(cspVote());
      expect(attestedParentHash()).toEqual(CHANGED_HASH);
    });

    it('should fetch the current parent version when the app never fetched the parent', async () => {
      currentParentHash = CHANGED_HASH;

      await client.submitVote(cspVote());
      expect(fetchElection).toHaveBeenCalledWith(PARENT_ID);
      expect(attestedParentHash()).toEqual(CHANGED_HASH);
    });

    it('should not record the parent it fetched itself as shown', async () => {
      await client.submitVote(cspVote());
      currentParentHash = CHANGED_HASH;

      await client.submitVote(cspVote());
      expect(attestedParentHash()).toEqual(CHANGED_HASH);
    });

    it('should not fetch the parent when the app fetched it', async () => {
      await client.fetchElection(PARENT_ID);
      fetchElection.mockClear();

      await client.submitVote(cspVote());
      expect(fetchElection).not.toHaveBeenCalledWith(PARENT_ID);
    });

    it('should attest the explicitly given parent metadata hash', async () => {
      await client.fetchElection(PARENT_ID);
      const given = 'dd'.repeat(32);

      await client.submitVote(cspVote(), { parentMetadataHash: given });
      expect(attestedParentHash()).toEqual(given);
    });
  });
});
