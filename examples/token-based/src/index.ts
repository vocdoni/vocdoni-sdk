import { createAccount } from './account';
import { checkTokenReady } from './census3';
import { getDefaultClient, getDefaultCensus3Client } from './client';
import { createElection, publishElection } from './election';
import { castVotes, countVotes } from './vote';

// This is a hard-coded example of token you might use.
const myToken = {
  address: '0x...',
  chainID: 11155111,
  type: 'erc20',
};

// Hard-coded list of private keys of token holders
const voters = ['...'];

async function main () {
  const client = getDefaultClient();
  const census3Client = getDefaultCensus3Client();

  console.log('Checking if token is registered to the census3 service...');
  const tokenIsReady = await checkTokenReady(census3Client, myToken.address, myToken.type, myToken.chainID);
  if (!tokenIsReady) {
    return;
  }

  console.log('Creating token-based census...');
  const census = await census3Client.createTokenCensus(myToken.address, myToken.chainID);

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
