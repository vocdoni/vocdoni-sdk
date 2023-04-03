import { ElectionStatus, VocdoniSDKClient } from '../../../src';
import { delay } from '../../../src/util/common';

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
