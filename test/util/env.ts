/**
 * The network test suites (integration, services, api) must never talk to a
 * deployed Vocdoni server: every endpoint has to be provided explicitly via
 * environment variables, normally exported by `scripts/integration-stack.sh`,
 * which spins up the local docker stack (voconed + blind-csp + vocfaucet).
 */
export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} environment variable. These tests only run against the local docker stack — ` +
        `start it and run them with 'yarn test:integration:stack', or bring it up with ` +
        `'scripts/integration-stack.sh up' and export the env vars it prints. ` +
        `Running the test suites against a deployed server is not supported.`
    );
  }
  return value;
};
