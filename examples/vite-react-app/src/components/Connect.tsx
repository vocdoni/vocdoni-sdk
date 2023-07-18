import { Button } from '@chakra-ui/react'
import { MetaMask } from '@web3-react/metamask'
import { WalletConnect } from '@web3-react/walletconnect'

type Props = {
  children: string,
  onSuccess: () => void,
  provider: MetaMask | WalletConnect,
}

const Connect = ({children, onSuccess, provider} : Props) => (
  <Button onClick={() => {
    provider
      .activate()
      .then(onSuccess)
      .catch(console.error)
  }}>
    {children}
  </Button>
)

export default Connect
