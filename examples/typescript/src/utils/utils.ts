import { ElectionStatus, VocdoniSDKClient } from '@vocdoni/sdk';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const waitForElectionReady = (client: VocdoniSDKClient, electionId: string): Promise<void> => {
  return delay(5000)
    .then(() => client.fetchElection(electionId))
    .then((election) => {
      if (election.status !== ElectionStatus.ONGOING) {
        return waitForElectionReady(client, electionId);
      }
      return Promise.resolve();
    });
};
