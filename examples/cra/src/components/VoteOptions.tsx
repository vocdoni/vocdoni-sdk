import { Box, Button, Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Signer } from '@ethersproject/abstract-signer'
import { Wallet } from '@ethersproject/wallet'
import { EnvOptions, IQuestion, VocdoniSDKClient, Vote } from '@vocdoni/sdk'
import { useState } from 'react'
import { Else, If, Then } from 'react-if'

type VoteProps = {
  signer: Signer | Wallet,
  election: string,
  address: string,
  questions: IQuestion[],
  update: () => void,
}

const VoteOptions = ({questions, signer, election, address, update} : VoteProps) => {
  const [voting, setVoting] = useState<{[key: number]: boolean}>({0: false, 1: false})
  const [voteId, setVoteId] = useState<string>('')
  const [disabled, setDisabled] = useState<boolean>(false)

  return (
    <Box padding={3} backgroundColor='gray.100'>
      <Text fontSize='sm'>Voting process for <Code>{address}</Code></Text>
      <hr />
      <If condition={voteId.length === 0}>
        <Then>
        {
          questions.map((q, i) => (
            <div key={i}>
              <Heading size='xs' mt={3} mb={2}>
                {q.title.default}
              </Heading>
              <Stack direction='row'>
              {
                q.choices.map((c, k) => (
                  <Button
                    key={k}
                    size='sm'
                    isLoading={voting[k]}
                    disabled={disabled}
                    onClick={async () => {
                      setVoting({...voting, [k]: true})
                      setDisabled(true)
                      const client = new VocdoniSDKClient({
                        env: EnvOptions.STG,
                        wallet: signer,
                      })
                      // set election id to be voted
                      client.setElectionId(election)
                      // define vote object
                      const vote = new Vote([c.value])
                      // vote, retrieving that vote id as response
                      try {
                        const vid = await client.submitVote(vote)

                        update()
                        setVoteId(vid)
                      } catch (e) {
                        console.error('could not commit vote', e)
                      }

                      setVoting({...voting, [k]: false})
                      setDisabled(false)
                    }}
                  >
                    {c.title.default}
                  </Button>
                ))
              }
              </Stack>
            </div>
          ))
        }
        </Then>
        <Else>
          <Text fontSize='sm'>
            You already voted! Vote id: <Code>{voteId}</Code>
          </Text>
        </Else>
      </If>
    </Box>
  )
}

export default VoteOptions
