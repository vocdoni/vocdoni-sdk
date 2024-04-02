import { Wallet } from '@ethersproject/wallet';
import { EnvOptions, ICspFinalStepResponse, ICspIntermediateStepResponse, VocdoniSDKClient, Vote } from '@vocdoni/sdk';

export const castVotes = (electionId: string) => {
  var votePromises = [];
  for (let i = 0; i < 10; i++) {
    const voter = Wallet.createRandom();
    const client = new VocdoniSDKClient({ env: EnvOptions.STG, wallet: voter, electionId: electionId });
    votePromises.push(
      new Promise<void>(async (resolve) => {
        // Auth steps for the CSP (can vary of the type of the CSP)
        const step0 = (await client.cspStep(0, ['Name test'])) as ICspIntermediateStepResponse;
        // Auth step 1: for this CSP, add the two values and return the result
        const challenge = step0.response.reduce((accumulator, value) => +accumulator + +value, 0).toString();
        const step1 = (await client.cspStep(1, [challenge], step0.authToken)) as ICspFinalStepResponse;

        // Request a CSP signature of the voter's address, proven by the token
        const signature = await client.cspSign(voter.address, step1.token);

        // Create a random vote alongside the CSP signature
        const vote = client.cspVote(new Vote([Math.round(Math.random())]), signature);

        // Submit the vote as usual
        await client.submitVote(vote);
        resolve();
      })
    );
  }
  return Promise.all(votePromises);
};

export const countVotes = (client: VocdoniSDKClient) => {
  return client.fetchElection().then((election) => {
    console.log('Election results: ');
    election.questions.forEach((question) => {
      question.choices.forEach((choice) => {
        console.log(choice.title.default + ': ' + choice.results);
      });
    });
  });
};
