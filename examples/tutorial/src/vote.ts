import { Wallet } from '@ethersproject/wallet';
import { VocdoniSDKClient, Vote } from '@vocdoni/sdk';

export async function castVotes (voters: Wallet[], client: VocdoniSDKClient) {
  for await (const voter of voters) {
    client.wallet = voter;
    // Create a vote for option 0 or 1
    const vote = new Vote([Math.round(Math.random())]);
    await client.submitVote(vote).then(voteId => {
      console.log('Vote sent! Vote id: ', voteId);
      console.log('Verify vote at https://stg.explorer.vote/verify/#/' + voteId);
    });
  }
}

export async function countVotes (client: VocdoniSDKClient) {
  client.fetchElection().then(election => {
    console.log('Election results: ' + election.results);
  });
}
