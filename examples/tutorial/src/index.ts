import { getDefaultClient } from './client';
import { createElection, publishElection } from './election';
import { createCensus } from './census';
import { castVotes, countVotes } from './vote';
import { Account } from '@vocdoni/sdk';
import { createAccount } from './account';

async function main () {
  console.log('Initializing client...');
  const { client } = getDefaultClient();

  console.log('Creating account...');
  await createAccount(client);

  console.log('Creating census with some random wallets...');
  const { census, voters } = await createCensus();

  console.log('Creating election...');
  const election = createElection(census);
  const electionId = await publishElection(client, election);

  console.log('Voting...');
  await castVotes(electionId, voters);

  console.log('Getting results...');
  await countVotes(client);
}
main();
