import { ICspFinalStepResponse, ICspIntermediateStepResponse } from '../../src/api/csp';
import { Wallet } from '@ethersproject/wallet';
import { Election, VocdoniSDKClient, Vote } from '../../src';
import { delay } from '../../src/util/common';
import { CspCensus } from '../../src/types/census/csp';
// @ts-ignore
import { clientParams } from './util/client.params';

const CSP_URL = 'https://csp-stg.vocdoni.net/v1';
const CSP_PUBKEY = '0299f6984fddd0fab09c364d18e2759d6b728e933fae848676b8bd9700549a1817';

/*
const generateProof = async (client: VocdoniSDKClient, address: string) => {
  //const url = 'https://csp-stg.vocdoni.net/v1';
  //const info = await CspAPI.info(url);
  //console.log(info);
  //const info = await client.cspInfo();
  //console.log(info);

  const step0 = (await CspAPI.step(url, electionId, info.signatureType[0], info.authType, 0, [
    'Name Test',
  ])) as ICspIntermediateStepResponse;
  console.log(step0);

  const step0 = (await client.cspStep(0, ['Name test'])) as ICspIntermediateStepResponse;

  const step1 = (await CspAPI.step(
    url,
    electionId,
    info.signatureType[0],
    info.authType,
    1,
    [step0.response.reduce((acc, v) => +acc + +v, 0).toString()],
    step0.authToken
  )) as ICspFinalStepResponse;
  console.log(step1);

  const step1 = (await client.cspStep(
    1,
    [step0.response.reduce((acc, v) => +acc + +v, 0).toString()],
    step0.authToken
  )) as ICspFinalStepResponse;

  const { hexBlinded: blindedPayload, userSecretData } = getBlindedPayload(
    electionId,
    step1.token,
    participant.address
  );
  console.log(blindedPayload, userSecretData);

  const signature = await CspAPI.sign(url, electionId, info.signatureType[0], blindedPayload, step1.token);
  console.log(signature);

  return CensusBlind.unblind(signature.signature, userSecretData);

  return await client.cspSign(address, step1.token);
};
*/
describe('CSP tests', () => {
  it('should create an election with 10 participants and each of them should vote correctly', async () => {
    const numVotes = 10; // should be even number
    const census = new CspCensus(CSP_PUBKEY, CSP_URL);
    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());

    const wallet = Wallet.createRandom();
    const client = new VocdoniSDKClient(clientParams(wallet));

    const election = Election.from({
      title: 'Election title',
      description: 'Election description',
      header: 'https://source.unsplash.com/random',
      streamUri: 'https://source.unsplash.com/random',
      endDate: new Date().getTime() + 10000000,
      census,
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
        return delay(12000);
      })
      .then(() => {
        return Promise.all(
          participants.map(async (participant, index) => {
            const sdkParams = clientParams(participant);
            sdkParams.csp_url = CSP_URL;
            const pClient = new VocdoniSDKClient(sdkParams);
            pClient.setElectionId(electionIdentifier);
            const step0 = (await pClient.cspStep(0, ['Name test'])) as ICspIntermediateStepResponse;
            const step1 = (await pClient.cspStep(
              1,
              [step0.response.reduce((acc, v) => +acc + +v, 0).toString()],
              step0.authToken
            )) as ICspFinalStepResponse;
            const signature = await pClient.cspSign(participant.address, step1.token);
            const vote = pClient.cspVote(new Vote([index % 2]), signature);
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
      });
  }, 285000);
});
