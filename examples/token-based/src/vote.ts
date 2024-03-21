import { Wallet } from '@ethersproject/wallet';
import { EnvOptions, VocdoniSDKClient, Vote } from '@vocdoni/sdk';

export const castVotes = (electionId: string, voters: string[]) => {
  var votePromises = [];
  for (const voter of voters) {
    const wallet = new Wallet(voter);
    const client = new VocdoniSDKClient({ env: EnvOptions.STG, wallet: wallet, electionId: electionId });
    // Create a vote for option 0 or 1
    const vote = new Vote([Math.round(Math.random())]);
    votePromises.push(
      client.submitVote(vote).then(voteId => {
        console.log('Vote sent! Vote id: ', voteId);
        console.log('Verify vote at ' + client.explorerUrl + '/verify/#/' + voteId);
      })
    );
  }
  return Promise.all(votePromises);
};

export const countVotes = (client: VocdoniSDKClient) => {
  return client.fetchElection().then(election => {
    console.log('Election results: ');
    election.questions.forEach(question => {
      question.choices.forEach(choice => {
        console.log(choice.title.default + ': ' + choice.results);
      });
    });
  });
};
