import { PlainCensus } from '@vocdoni/sdk';
import { Wallet } from '@ethersproject/wallet';

export async function createCensus () {
  const census = new PlainCensus();
  // Create a list of random voters, register them to the census
  let voters: Wallet[] = [];
  for (let i = 0; i < 5; i++) {
    voters.push(Wallet.createRandom());
    census.add(await voters[i].getAddress());
  }

  return { census, voters };
}
