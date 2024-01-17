import { ICspFinalStepResponse, ICspIntermediateStepResponse } from '../../src/api/csp';
import { Wallet } from '@ethersproject/wallet';
import { CspProofType, Election, VocdoniSDKClient, Vote } from '../../src';
import { CspCensus } from '../../src';
// @ts-ignore
import { clientParams, setFaucetURL } from './util/client.params';
// @ts-ignore
import { waitForElectionReady } from './util/client.utils';

const CSP_URL = process.env.BLINDCSP_URL ?? 'https://csp-dev-simplemath.vocdoni.net/v1';
const CSP_PUBKEY = process.env.BLINDCSP_PUBKEY ?? '025de8cb8de1005aa939c1403e37e1fa165ebc758da49cb37215c6237d01591104';

describe('CSP tests', () => {
  it('should create an election with 4 participants and each of them should vote correctly', async () => {
    const numVotes = 4; // should be even number
    const census = new CspCensus(CSP_PUBKEY, CSP_URL);
    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());

    const wallet = Wallet.createRandom();
    let client = new VocdoniSDKClient(clientParams(wallet));
    client = setFaucetURL(client);

    const election = Election.from({
      title: 'Election title',
      description: 'Election description',
      header: 'https://source.unsplash.com/random',
      streamUri: 'https://source.unsplash.com/random',
      endDate: new Date().getTime() + 60 * 60 * 1000,
      census,
      maxCensusSize: numVotes,
    });

    election.addQuestion('This is a title', 'This is a description', [
      {
        title: 'Option 1',
        value: 0,
      },
      {
        title: 'Option 2',
        value: 1,
      },
    ]);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return waitForElectionReady(client, electionId);
      })
      .then(() => {
        return Promise.all(
          participants.map(async (participant, index) => {
            const sdkParams = clientParams(participant);
            const pClient = new VocdoniSDKClient(sdkParams);
            pClient.setElectionId(electionIdentifier);
            const step0 = (await pClient.cspStep(0, ['Name test'])) as ICspIntermediateStepResponse;
            const step1 = (await pClient.cspStep(
              1,
              [step0.response.reduce((acc, v) => +acc + +v, 0).toString()],
              step0.authToken
            )) as ICspFinalStepResponse;
            const signature = await pClient.cspSign(participant.address, step1.token);
            const vote = pClient.cspVote(new Vote([index % 2]), signature, CspProofType.ECDSA_BLIND_PIDSALTED);
            return pClient.submitVote(vote);
          })
        );
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(election.title);
        expect(election.voteCount).toEqual(numVotes);
        expect(election.results[0][0]).toEqual(election.results[0][1]);
        expect(election.census).toBeInstanceOf(CspCensus);
        expect(election.census.size).toBeUndefined();
        expect(election.census.weight).toBeUndefined();
      });
  }, 285000);
});
