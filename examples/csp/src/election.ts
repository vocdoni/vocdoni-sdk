import { Census, Election, ElectionStatus, UnpublishedElection, VocdoniSDKClient } from '@vocdoni/sdk';

export const createElection = (census: Census): UnpublishedElection => {
  const election: UnpublishedElection = Election.from({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    endDate: new Date().getTime() + 100000000,
    maxCensusSize: 2000,
    census: census,
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

const waitForElectionReady = (client: VocdoniSDKClient, electionId: string): Promise<string> => {
  return new Promise((f) => setTimeout(f, 5000))
    .then(() => client.fetchElection(electionId))
    .then((election) => {
      if (election.status !== ElectionStatus.ONGOING) {
        return waitForElectionReady(client, electionId);
      }
      return Promise.resolve(electionId);
    });
};

export const publishElection = (client: VocdoniSDKClient, election: UnpublishedElection): Promise<string> => {
  return client.createElection(election).then((electionId) => {
    client.setElectionId(electionId);
    console.log('Election created!', electionId);
    console.log('View this election at ' + client.explorerUrl + '/processes/show/#/' + electionId);
    console.log('Waiting for election to be published...');
    return waitForElectionReady(client, electionId);
  });
};
