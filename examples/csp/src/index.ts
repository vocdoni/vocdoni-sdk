import { getDefaultClient } from './client';
import { createElection, publishElection } from './election';
import { castVotes, countVotes } from './vote';
import { CspCensus } from '@vocdoni/sdk';
import { createAccount } from './account';

// Testing CSP
const CSP_URL = 'https://csp-dev-simplemath.vocdoni.net/v1';
const CSP_PUBKEY = '025de8cb8de1005aa939c1403e37e1fa165ebc758da49cb37215c6237d01591104';

async function main() {
  console.log('Initializing client...');
  const { client } = getDefaultClient();
  console.log('Creating account...');
  await createAccount(client);
  console.log('Creating election...');
  const election = createElection(new CspCensus(CSP_PUBKEY, CSP_URL));
  const electionId = await publishElection(client, election);
  console.log('Voting...');
  await castVotes(electionId);
  console.log('Getting results...');
  await countVotes(client);
}

main();
