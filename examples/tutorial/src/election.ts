import {
  Election,
  ElectionStatus,
  PlainCensus,
  UnpublishedElection,
  VocdoniSDKClient
} from '@vocdoni/sdk'

export const createElection = (census: PlainCensus): UnpublishedElection => {
  const election: UnpublishedElection = Election.from({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    endDate: new Date().getTime() + 100000,
    census,
    electionType: {
      // This is the default behavior
      secretUntilTheEnd: false
    }
  })

  election.addQuestion('This is a title', 'This is a description', [
    {
      title: 'Option 1',
      value: 0
    },
    {
      title: 'Option 2',
      value: 1
    }
  ])

  return election
}

const waitForElectionReady = (
  client: VocdoniSDKClient,
  electionId: string
): Promise<void> => {
  return new Promise(f => setTimeout(f, 5000))
    .then(() => client.fetchElection(electionId))
    .then(election => {
      if (election.status !== ElectionStatus.ONGOING) {
        return waitForElectionReady(client, electionId)
      }
      return Promise.resolve()
    })
}

export const publishElection = (
  client: VocdoniSDKClient,
  election: UnpublishedElection
): Promise<void> => {
  return client.createElection(election).then(electionId => {
    client.setElectionId(electionId)
    console.log('Election created!', electionId)
    console.log(
      'View this election at https://stg.explorer.vote/processes/show/#/' +
        electionId
    )
    console.log('Waiting a bit to ensure we can vote...')
    return waitForElectionReady(client, electionId)
  })
}
