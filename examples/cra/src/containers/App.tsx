import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Alert, Box, Button, Link, Stack, Tag, Text } from '@chakra-ui/react'
import { Web3Provider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { Election, EnvOptions, PlainCensus, PublishedElection, VocdoniSDKClient, dummy } from '@vocdoni/sdk'
import { useEffect, useState } from 'react'
import { Else, If, Then, When } from 'react-if'
import Census from '../components/Census'
import Connect from '../components/Connect'
import Vote from '../components/VoteOptions'
import { connector as metamask, hooks as mhooks } from '../connectors/metamask'
import { hooks as whooks } from '../connectors/walletconnect'

export const App = () => {
  const [provider, setProvider] = useState<string>('')
  const [account, setAccount] = useState<string>('')
  const [balance, setBalance] = useState<number>(0)
  const [electionId, setElectionId] = useState<string>('')
  const [creating, setCreating] = useState<boolean>(false)
  const [election, setElection] = useState<PublishedElection>()
  const [signers, setSigners] = useState<Wallet[]>([])

  const mprovider = mhooks.useProvider()
  const wprovider = whooks.useProvider()
  const isMMActive = mhooks.useIsActive()
  const isWCActive = whooks.useIsActive()
  const providers : {[key: string]: Web3Provider|undefined} = {
    'metamask': mprovider,
    'walletconnect': wprovider,
  }

  const update = async () => {
    const client = new VocdoniSDKClient({
      env: EnvOptions.DEV,
      electionId: electionId
    })
    const publishedElection = await client.fetchElection()

    setElection(publishedElection)
  }

  // get user account when a provider is defined (aka user has logged in)
  useEffect(() => {
    (async () => {
      if (account.length || balance > 0 || provider.length === 0) return
      // client instance
      const client = new VocdoniSDKClient({
        env: EnvOptions.DEV,
        wallet: (providers[provider] as Web3Provider).getSigner()
      })
      // fetch info or create account if does not exist
      try {
        let acc = await client.createAccount()
        if (!acc) {
          throw new Error('fetch account failed')
        }

        // only for development purposes, request more tokens if balance is zero
        if (acc.balance <= 0) {
          await client.collectFaucetTokens()
          acc = await client.fetchAccountInfo()
        }

        setAccount(acc.address)
        setBalance(acc.balance)
      } catch (e) {
        console.error('failed account creation', e)
      }

    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.length, balance, provider])

  // when the election is created, fetch its info
  useEffect(() => {
    if (!electionId.length || election) return
    update()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId, election])

  return (
    <Box fontSize='xl' m={20}>
      <Button onClick={() => dummy().then(console.log).catch(console.error)}>dummy</Button>
      <Stack direction='row'>
        <If condition={isMMActive || isWCActive}>
          <Then>
            <Stack spacing={3}>
              <If condition={!account.length}>
                <Then>
                  <Alert status='warning'>
                    Loading account information, please wait.
                  </Alert>
                </Then>
                <Else>
                  <Census
                    disabled={creating || electionId.length > 0}
                    account={account}
                    balance={balance}
                    signers={signers}
                    setSigners={setSigners}
                  />
                  <p>Once you've finished, you can create the election:</p>
                  <Button
                    isLoading={creating}
                    disabled={creating || electionId.length > 0 || balance <= 0}
                    onClick={async () => {
                    setCreating(true)
                    const signer = (providers[provider] as Web3Provider).getSigner()
                    // client instance
                    const client = new VocdoniSDKClient({
                      env: EnvOptions.DEV,
                      wallet: signer
                    })

                    // create a census for the voting process
                    const census = new PlainCensus()
                    // here we add any of the random wallets we created in the previous action
                    for (const w of signers) {
                      census.add(await w.getAddress())
                    }
                    // and here we add ourselves, so we can vote in the next step
                    census.add(await signer.getAddress())

                    const endDate = new Date()
                    endDate.setHours(
                      endDate.getHours() + 10,
                    )
                    // fill basic election metadata
                    const election = Election.from({
                        title: 'Election title',
                        description: 'Election description',
                        header: 'https://source.unsplash.com/random',
                        streamUri: 'https://source.unsplash.com/random',
                        endDate: endDate.getTime(),
                        census,
                    })

                    // add questions
                    election.addQuestion('This is an awesome question', 'With its awesome description', [
                        {
                            title: 'Option 1',
                            value: 0,
                        },
                        {
                            title: 'Option 2',
                            value: 1,
                        },
                    ])

                    setElectionId(await client.createElection(election))
                    setCreating(false)
                  }}>
                    Create election with {signers.length + 1} people in census
                  </Button>
                </Else>
              </If>
            </Stack>
          </Then>
          <Else>
            <Stack spacing={6} direction='row' justifyContent='center' w='full'>
              <Connect provider={metamask} onSuccess={() => setProvider('metamask')}>
                Metamask connect
              </Connect>
            </Stack>
          </Else>
        </If>
        <When condition={electionId.length > 0 && typeof election?.questions !== 'undefined'}>
          {() => (
            <Stack direction='column' textAlign='left'>
              <Alert status='success'>
                <Text fontSize='sm'>
                  Election created!&nbsp;
                  <Link href={`https://dev.explorer.vote/processes/show/#/${electionId}`} isExternal>
                    Check it out in the explorer <ExternalLinkIcon mx='2px' />
                  </Link>
                </Text>
              </Alert>
              <Vote
                questions={election?.questions ?? []}
                address={`0x${account}`}
                election={electionId}
                signer={(providers[provider] as Web3Provider).getSigner()}
                update={update}
              />
              {
                signers.map((s, k) => (
                  <Vote
                    key={k}
                    questions={election?.questions ?? []}
                    address={s.address}
                    election={electionId}
                    signer={s}
                    update={update}
                  />
                ))
              }
              <Tag colorScheme='green'>
                Received votes: {election?.voteCount}
              </Tag>
              <Tag colorScheme='blue'>
                Votes (raw): {JSON.stringify(election?.results)}
              </Tag>
            </Stack>
          )}
        </When>
      </Stack>
    </Box>
  )
}
