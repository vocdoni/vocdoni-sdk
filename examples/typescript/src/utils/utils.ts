import { ElectionStatus, VocdoniSDKClient } from '@vocdoni/sdk';

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
