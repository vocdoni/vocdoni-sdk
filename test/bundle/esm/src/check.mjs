import { EnvOptions } from '@vocdoni/sdk'

if (EnvOptions.DEV !== 'dev') {
  throw new Error('EnvOptions.DEV is not "dev". This may be caused by a bundling issue.')
}
