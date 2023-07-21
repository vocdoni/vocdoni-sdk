import { Wallet } from '@ethersproject/wallet';
import { Election, EnvOptions, PlainCensus, VocdoniSDKClient, Vote } from '@vocdoni/sdk';
import chalk from 'chalk';

export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const createElection = (census, electionType = null) => {
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);

  const election = Election.from({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: endDate.getTime(),
    census,
    electionType: electionType ?? null,
  });

  election.addQuestion('This is a title', 'This is a description', [
    {
      title: 'Option 1',
      value: 0,
    },
    {
      title: 'Option 2',
      value: 1,
    },
  ]);

  return election;
};

async function main() {
  console.log(chalk.yellow('Creating a new voting process!'));

  const creator = Wallet.createRandom();
  const client = new VocdoniSDKClient({
    env: EnvOptions.STG,
    wallet: creator,
  });

  console.log('Creating account...');
  await client.createAccount();

  console.log('Creating census with some random wallets...');
  const census = new PlainCensus();
  census.add(await Wallet.createRandom().getAddress());
  census.add(await Wallet.createRandom().getAddress());
  census.add(await Wallet.createRandom().getAddress());
  const voter = Wallet.createRandom();
  census.add(await voter.getAddress());

  const election = createElection(census);

  console.log('Creating election...');
  await client
    .createElection(election)
    .then((electionId) => {
      client.setElectionId(electionId);
      console.log(chalk.green('Election created!'), chalk.blue(electionId));
      console.log('Waiting a bit to ensure we can vote...');
      // blocks take ~13s to get confirmed
      return delay(28000);
    })
    .then(() => {
      client.wallet = voter;
      const vote = new Vote([1]);
      console.log('Voting...');
      return client.submitVote(vote);
    })
    .then((voteId) => console.log(chalk.green('Vote sent! Vote id:'), chalk.blue(voteId)));
}

main()
  .then(() => {
    console.log(chalk.green('Done ✅'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
