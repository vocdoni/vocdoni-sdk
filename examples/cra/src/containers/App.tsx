import { Box, Button, Code, Heading, ListItem, Stack, Text, UnorderedList } from '@chakra-ui/react'
import { Web3Provider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { useEffect, useState } from 'react'
import { Else, If, Then, When } from 'react-if'
import { Election, IElection, PlainCensus, VocdoniSDKClient } from 'vocdoni-sdk'
import Connect from '../components/Connect'
import Vote from '../components/VoteOptions'
import { connector as metamask, hooks as mhooks } from '../connectors/metamask'
import { connector as walletconnect, hooks as whooks } from '../connectors/walletconnect'

export const App = () => {
  const [provider, setProvider] = useState<string>('')
  const [account, setAccount] = useState<string>('')
  const [balance, setBalance] = useState<number>(0)
  const [election, setElection] = useState<string>('')
  const [creating, setCreating] = useState<boolean>(false)
  const [metadata, setMetadata] = useState<IElection>()
  const [voting, setVoting] = useState<boolean>(false)
  const [voteHash, setVoteHash] = useState<string>('')
  const [signers, setSigners] = useState<Wallet[]>([])

  const mprovider = mhooks.useProvider()
  const wprovider = whooks.useProvider()
  const isMMActive = mhooks.useIsActive()
  const isWCActive = whooks.useIsActive()
  const providers : {[key: string]: Web3Provider|undefined} = {
    'metamask': mprovider,
    'walletconnect': wprovider,
  }

  // get user account when a provider is defined (aka user has logged in)
  useEffect(() => {
    (async () => {
      if (account.length || balance > 0 || provider.length === 0) return
      // client instance
      const client = new VocdoniSDKClient('https://api-dev.vocdoni.net/v2', (providers[provider] as Web3Provider).getSigner())
      // fetch info or create account if does not exist
      let acc = await client.createAccount()
      try {
        if (!acc) {
          throw new Error('fetch account failed')
        }

        // only for development purposes, request more tokens if balance is zero
        if (acc.balance <= 0) {
          await client.collectFaucetTokens()
          acc = await client.fetchAccountInfo()
        }
      } catch (e) {
        console.error('failed account creation', e)
      }

      setAccount(acc.address)
      setBalance(acc.balance)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.length, balance, provider])

  // when the election is created, fetch its info
  useEffect(() => {
    if (!election.length || metadata) return

    ;(async () => {
      const client = new VocdoniSDKClient('https://api-dev.vocdoni.net/v2')
      client.setElectionId(election)
      const meta = await client.fetchElection()

      setMetadata(meta as any)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [election, metadata, provider])

  return (
    <Box textAlign='center' fontSize='xl' m={20}>
      <If condition={isMMActive || isWCActive}>
        <Then>
          <Stack spacing={3} alignItems='center'>
            <When condition={account.length > 0}>
              <Text>Logged in with <Code>{account}</Code> ({balance} vocdoni tokens)</Text>
            </When>
            <p>
              Your current wallet will be added to the census, but you can add
              some random wallets here for testing purposes:
            </p>
            <Button
              onClick={() => {
              setSigners([
                ...signers,
                Wallet.createRandom(),
              ])
            }}>
              Create random wallet
            </Button>
            <Box>
              <Heading size='md'>Census</Heading>
              <UnorderedList>
                <ListItem>0x{account}</ListItem>
                {
                  signers.map((w, k) => <ListItem key={k}>{w.address}</ListItem>)
                }
              </UnorderedList>
            </Box>
            <p>Once you've finished, you can create the election:</p>
            <Button
              isLoading={creating}
              disabled={creating || election.length > 0 || balance <= 0}
              onClick={async () => {
              setCreating(true)
              const signer = (providers[provider] as Web3Provider).getSigner()
              // client instance
              const client = new VocdoniSDKClient('https://api-dev.vocdoni.net/v2', signer)

              // create a census for the voting process
              const census = new PlainCensus()
              // here we add any of the random wallets we created in the previous action
              for (const w of signers) {
                census.add(await w.getAddress())
              }
              // census.add(await Wallet.createRandom().getAddress())
              // and here we add ourselves, so we can vote in the next step
              census.add(await signer.getAddress())

              const now = new Date().getTime()
              // fill basic election metadata
              const election = new Election({
                  title: 'Election title',
                  description: 'Election description',
                  header: 'https://source.unsplash.com/random',
                  streamUri: 'https://source.unsplash.com/random',
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
              Create election with {signers.length + 1} people in census
            </Button>
            <When condition={election.length > 0 && typeof (metadata as any)?.metadata.questions !== 'undefined'}>
              {() => (
                <>
                  <p>
                    Election created!&nbsp;
                    <a target='_blank' href={`https://dev.explorer.vote/processes/show/#/${election}`}>
                      Check it out in the explorer
                    </a>
                  </p>
                  <Vote
                    questions={(metadata as any)?.metadata.questions}
                    address={`0x${account}`}
                    election={election}
                    signer={(providers[provider] as Web3Provider).getSigner()}
                  />
                  {
                    signers.map((s, k) => (
                      <Vote
                        key={k}
                        questions={(metadata as any)?.metadata.questions}
                        address={s.address}
                        election={election}
                        signer={s}
                      />
                    ))
                  }
                </>
              )}
            </When>
            <When condition={voteHash.length > 0}>
              <p>Your vote hash is {voteHash}</p>
            </When>
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
