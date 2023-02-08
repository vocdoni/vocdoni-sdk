const { EnvOptions } = require('@vocdoni/sdk/umd');

if (EnvOptions.DEV !== 'dev') {
  throw new Error('EnvOptions.DEV is not "dev". This may be caused by a bundling issue.');
}
