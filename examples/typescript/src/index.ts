import { Wallet } from '@ethersproject/wallet';
import { VocdoniSDKClient } from '@vocdoni/sdk';

const wallet = Wallet.createRandom();

const client = new VocdoniSDKClient({
  env: 'dev' as any,
});

client.setElectionId('318f0043bf6638d2bc91b89928f78cbab3e4b1949e28787ec7a3020000000004');
(async () => {
  const election = await client.fetchElection();

  console.log('Received election:', election);
})();
