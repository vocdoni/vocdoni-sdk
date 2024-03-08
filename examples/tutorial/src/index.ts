import { getDefaultClient } from './client';
import { createElection, publishElection } from './election';
import { createCensus } from './census';
import { castVotes, countVotes } from './vote';

async function main () {
  console.log('Initializing client...');
  const { client } = getDefaultClient();

  console.log('Creating account...');
  await client.createAccount();

  console.log('Creating census with some random wallets...');
  const { census, voters } = await createCensus();

  console.log('Creating election...');
  const election = createElection(census);
  await publishElection(client, election);

  console.log('Voting...');
  await castVotes(voters, client);

  console.log('Getting results...');
  await countVotes(client);
}
main();
