import chalk from 'chalk';
import { Wallet } from '@ethersproject/wallet';
import {
  Election,
  EnvOptions,
  IChoice,
  IVoteType,
  OffchainCensus,
  UnpublishedElection,
  VocdoniSDKClient,
  Vote,
  WeightedCensus,
} from '@vocdoni/sdk';
import { waitForElectionReady } from './utils/utils';

/**
 * Set the total number of random voters.
 */
const VOTERS_NUM = 10;

/**
 * Define the exponent for quadratic voting calculation. In the context of quadratic voting, this value
 * is usually set to 2. This exponent determines the cost of a vote. For example, if a voter assigns 2 credits to an option,
 * the cost of that vote would be 2^2 = 4.
 */
const COST_EXPONENT = 2;

/**
 * Defines the total amount of credits available to each voter for casting their votes.
 * In this example, every voter is assumed to have an equal amount of credits. However, in a different scenario,
 * each voter could be allotted a varying number of credits depending on their weight in a weighted census.
 */
const CREDITS = 14;

/**
 * An array representing a single voter's allocation of credits towards various options.
 *
 * For example, the array [1, 0, 3, 2] signifies:
 *
 * - `1` credit assigned to option 0,
 * - `0` credit assigned to option 1,
 * - `3` credit assigned to option 2,
 * - `2` credit assigned to option 3,
 *
 * The cost of these votes in a quadratic voting system would be:
 *
 * ```
 * 1^2 = 1 (Cost for option 0)
 * 0^2 = 0 (Cost for option 1)
 * 3^2 = 9 (Cost for option 2)
 * 2^2 = 4 (Cost for option 3)
 * Total = 14 (Total cost of votes)
 * ```
 *
 * The total cost of the votes must not exceed the total `CREDITS` available to the voter.
 *
 * Given these parameters, an election involving 10 voters would yield the following results:
 *
 * ```
 * [[ 10, 0, 30, 20 ]]
 * ```
 */
const VOTE_ARRAY = [1, 0, 3, 2];

/**
 * An example configuration for setting up a quadratic voting system.
 */
const ELECTION_OPTS: IVoteType = {
  uniqueChoices: false,
  costFromWeight: true, // This will set that the weight on a weighted census is actually the credits available
  costExponent: COST_EXPONENT,
  maxValue: 4, // Have to be the choices length
  maxCount: 0, //Must be 0 for quadratic elections
};

const submitVote = (participant: Wallet, electionId: string) => {
  const pClient = new VocdoniSDKClient({
    env: EnvOptions.DEV,
    api_url: process.env.API_URL,
    wallet: participant,
  });
  const vote = new Vote(VOTE_ARRAY);
  pClient.setElectionId(electionId);
  return pClient.submitVote(vote);
};

const createElection = (census: OffchainCensus): UnpublishedElection => {
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);

  const election: UnpublishedElection = Election.from({
    title: 'Quadratic vote election',
    description: 'What NGO have to receive the credits?',
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: endDate.getTime(),
    census,
    voteType: ELECTION_OPTS,
  });

  election.addQuestion("Select NGO's", 'Quadratic vote example', [
    {
      title: 'Greenpeace',
      value: 0,
    },
    {
      title: 'Red Cross',
      value: 1,
    },
    {
      title: 'MSF',
      value: 2,
    },
    {
      title: 'Amnesty',
      value: 3,
    },
  ]);

  return election;
};

async function main() {
  console.log(chalk.yellow('Creating a new quadratic voting process!'));

  const creator = Wallet.createRandom();
  const client = new VocdoniSDKClient({
    env: EnvOptions.DEV,
    api_url: process.env.API_URL,
    wallet: creator,
  });

  console.log('Creating account...');
  await client.createAccount();

  console.log('Creating census with some random wallets...');
  const participants: Wallet[] = [...new Array(VOTERS_NUM)].map(() => Wallet.createRandom());
  const census = new WeightedCensus();
  census.add(
    participants.map((participant, index) => ({
      key: participant.address,
      weight: BigInt(CREDITS),
    }))
  );

  console.log('Creating election...');
  const election = createElection(census);

  let electionIdentifier: string;

  await client
    .createElection(election)
    .then((electionId) => {
      client.setElectionId(electionId);
      console.log(chalk.green('Election created!'), chalk.blue(electionId));
      console.log('Waiting a bit to ensure we can vote...');
      client.setElectionId(electionId);
      electionIdentifier = electionId;
      return waitForElectionReady(client, electionId);
    })
    .then(() => {
      console.log(chalk.green('Election ready!'));
      console.log('Submitting all votes');
      return Promise.all(
        participants.map(async (participant, index) => {
          console.log(
            `Submitting vote ${index} with value ${VOTE_ARRAY}`,
            chalk.yellow('VoterId: '),
            chalk.blue(participant.address)
          );
          return submitVote(participant, electionIdentifier);
        })
      );
    })
    .then(() => {
      console.log(chalk.green('Votes submitted!'));
      return client.fetchElection();
    })
    .then((election) => {
      console.log('Election results: ', election.results);
      console.log(
        'Expected results: ',
        VOTE_ARRAY.map((value, i) => [String(value * VOTERS_NUM)])
      );
    });
}

main()
  .then(() => {
    console.log(chalk.green('Done ✅'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(chalk.red(err));
    process.exit(1);
  });
