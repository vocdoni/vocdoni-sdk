import { EnvOptions, VocdoniSDKClient } from '@vocdoni/sdk'
import { Wallet } from '@ethersproject/wallet'

export const getDefaultClient = () => {
  const wallet = Wallet.createRandom()
  const client = new VocdoniSDKClient({
    env: EnvOptions.STG,
    api_url: 'https://api-stg.vocdoni.net/v2',
    wallet: wallet
  })

  return { wallet, client }
}
