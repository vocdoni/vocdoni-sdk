import { Box, Button, Code, Stack, Text } from '@chakra-ui/react'
import { Web3Provider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { useEffect, useState } from 'react'
import { Else, If, Then, When } from 'react-if'
import { Election, PlainCensus, VocdoniSDKClient } from 'vocdoni-sdk'
import Connect from '../components/Connect'
import { connector as metamask, hooks as mhooks } from '../connectors/metamask'
import { connector as walletconnect, hooks as whooks } from '../connectors/walletconnect'

export const App = () => {
  const [provider, setProvider] = useState<string>('')
  const [account, setAccount] = useState<string>('')
  const [balance, setBalance] = useState<number>(0)
  const [election, setElection] = useState<string>('')
  const [creating, setCreating] = useState<boolean>(false)
  // const [voting, setVoting] = useState<boolean>(false)

  const mprovider = mhooks.useProvider()
  const wprovider = whooks.useProvider()
  const providers : {[key: string]: Web3Provider|undefined} = {
    'metamask': mprovider,
    'walletconnect': wprovider,
  }
  const isMMActive = mhooks.useIsActive()
  const isWCActive = whooks.useIsActive()

  // get user account when a provider is defined (aka user has logged in)
  useEffect(() => {
    (async () => {
      if (account.length || balance > 0 || provider.length === 0) return
      // client instance
      const client = new VocdoniSDKClient('https://api-dev.vocdoni.net/v2', (providers[provider] as Web3Provider).getSigner())
      // fetch info
      const acc = await client.createAccount({getTokens: true})
      if (!acc) {
        throw new Error('fetch account failed')
      }

      setAccount(acc.address)
      setBalance(acc.balance)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.length, balance, provider])

  return (
    <Box textAlign='center' fontSize='xl' m={20}>
      <If condition={isMMActive || isWCActive}>
        <Then>
          <Stack spacing={3} alignItems='center'>
            <When condition={account.length > 0}>
              <Text>Logged in with <Code>{account}</Code> ({balance} vocdoni tokens)</Text>
            </When>
            <Button
              isLoading={creating}
              disabled={creating}
              onClick={async () => {
              setCreating(true)
              const signer = (providers[provider] as Web3Provider).getSigner()
              // client instance
              const client = new VocdoniSDKClient('https://api-dev.vocdoni.net/v2', signer)
              // await client.fetchChainId()

              // create a census for the voting process
              const census = new PlainCensus()
              // here we create three random wallets, just for demonstration purposes
              census.add(await Wallet.createRandom().getAddress())
              census.add(await Wallet.createRandom().getAddress())
              census.add(await signer.getAddress())

              const now = new Date().getTime()
              // fill basic election metadata
              const election = new Election({
                  title: 'Election title',
                  description: 'Election description',
                  header: 'https://source.unsplash.com/random',
                  streamUri: 'https://source.unsplash.com/random',
                  startDate: now + 25000,
                  endDate: now + 100000000000,
                  census,
              })

              // add questions
              election.addQuestion('This is a title', 'This is a description', [
                  {
                      title: 'Option 1',
                      value: 0,
                  },
                  {
                      title: 'Option 2',
                      value: 1,
                  },
              ])

              setElection(await client.createElection(election))
              setCreating(false)
            }}>
              Create election
            </Button>
            <Button>
              Vote {election}
            </Button>
          </Stack>
        </Then>
        <Else>
          <Stack spacing={6} direction='row' justifyContent='center'>
            <Connect provider={metamask} onSuccess={() => setProvider('metamask')}>
              Metamask connect
            </Connect>
            <Connect provider={walletconnect} onSuccess={() => setProvider('walletconnect')}>
              WalletConnect
            </Connect>
          </Stack>
        </Else>
      </If>
    </Box>
  )
}
