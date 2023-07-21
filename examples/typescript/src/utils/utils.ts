import { ElectionStatus, EnvOptions, VocdoniSDKClient, Vote } from '@vocdoni/sdk';
import { Wallet } from '@ethersproject/wallet';

export const getRandomVoters = (voters: number) => [...new Array(voters)].map(() => Wallet.createRandom());

export const getDefaultClient = (wallet?: Wallet) => {
  const creator = wallet ?? Wallet.createRandom();
  const client = new VocdoniSDKClient({
    env: EnvOptions.STG,
    api_url: process.env.API_URL,
    wallet: creator,
  });

  return { creator, client };
};

export const submitVote = (participant: Wallet, electionId: string, voteArray: (number | bigint)[]) => {
  const { client: pClient } = getDefaultClient(participant);
  const vote = new Vote(voteArray);
  pClient.setElectionId(electionId);
  return pClient.submitVote(vote);
};

/**
 * Await to specific election to be ready
 * @param client the specific client
 * @param electionId election identifier to check
 * @param delayTimeout delay until next check
 * @param abortController mechanism used to abort de function execution. To use it:
 *
 * ```ts
 *       let controller = new AbortController();
 *       const promise = waitForElectionReady(client, electionId, { abortController: controller });
 *       controller.abort();
 *       promise.then(() => console.log('Election is ready')).catch((err) => console.log('Error:', err.message));
 *```
 */
export const waitForElectionReady = (
  client: VocdoniSDKClient,
  electionId: string,
  {
    delayTimeout = 5000,
    abortController = new AbortController(),
  }: { delayTimeout?: number; abortController?: AbortController } = {}
): Promise<void> => {
  const signal = abortController.signal;

  const delay = (timeout: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const id = setTimeout(() => resolve(), timeout);
      signal.addEventListener('abort', () => {
        clearTimeout(id);
        reject(new Error('Aborted'));
      });
    });

  return delay(delayTimeout)
    .then(() => {
      if (signal.aborted) {
        throw new Error('Aborted');
      }
      return client.fetchElection(electionId);
    })
    .then((election) => {
      if (signal.aborted) {
        throw new Error('Aborted');
      }
      if (election.status !== ElectionStatus.ONGOING) {
        return waitForElectionReady(client, electionId, { delayTimeout, abortController });
      }
      return Promise.resolve();
    });
};
