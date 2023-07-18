import { initializeConnector } from '@web3-react/core'
import { WalletConnect } from '@web3-react/walletconnect'

export const [connector, hooks] = initializeConnector<any>(
  (actions) =>
    new WalletConnect({
      actions,
      options: {
        rpc: {
          1: 'https://cloudflare-eth.com',
        },
      },
    })
)
