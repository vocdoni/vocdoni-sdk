import { createAccount } from './account';
import { checkTokenReady } from './census3';
import { getDefaultClient, getDefaultCensus3Client } from './client';
import { createElection, publishElection } from './election';
import { castVotes, countVotes } from './vote';

// This is a hard-coded example of token you might use.
const myToken = {
  chainID: 11155111,
  address: '...',
};

// Hard-coded list of private keys of token holders
const voters = ['...'];

async function main () {
  const client = getDefaultClient();
  const census3Client = getDefaultCensus3Client();

  console.log('Checking if token is registered to the census3 service...');
  const tokenIsReady = await checkTokenReady(census3Client, myToken.address, myToken.chainID);
  if (!tokenIsReady) {
    return;
  }

  console.log('Creating token-based census...');
  // census3Client.validatePredicate()
  const census = await census3Client.createTokenCensus(myToken.address, myToken.chainID);
  // const census = await census3Client.createTokenCensus(myToken.address, myToken.chainID, true);

  console.log('Creating account...');
  await createAccount(client);

  console.log('Creating election...');
  const election = createElection(census);
  const electionId = await publishElection(client, election);

  console.log('Voting...');
  await castVotes(electionId, voters);

  console.log('Getting results...');
  await countVotes(client);
}
main();
