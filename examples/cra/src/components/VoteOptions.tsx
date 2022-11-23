import { Button, Heading, Stack } from '@chakra-ui/react'
import { Signer } from '@ethersproject/abstract-signer'
import { Wallet } from '@ethersproject/wallet'
import { useState } from 'react'
import { Else, If, Then } from 'react-if'
import { IQuestion, VocdoniSDKClient, Vote } from 'vocdoni-sdk'

type VoteProps = {
  signer: Signer | Wallet,
  election: string,
  address: string,
  questions: IQuestion[],
}

const VoteOptions = ({questions, signer, election, address} : VoteProps) => {
  const [voting, setVoting] = useState<boolean>(false)
  const [voteId, setVoteId] = useState<string>('')

  return (
    <>
      <Heading size='sm'>Voting process for {address}</Heading>
      <If condition={voteId.length === 0}>
        <Then>
        {
          questions.map((q, i) => (
            <div key={i}>
              <Heading size='xs'>{q.title.default}</Heading>
              <Stack direction='row'>
              {
                q.choices.map((c, k) => (
                  <Button
                    key={k}
                    isLoading={voting}
                    onClick={async () => {
                      setVoting(true)
                      const client = new VocdoniSDKClient('https://api-dev.vocdoni.net/v2', signer)
                      try {
                        client.setElectionId(election)
                        // vote to the very first option, for the sake of the example
                        const vote = new Vote([c.value])
                        const vid = await client.submitVote(vote)
                        setVoteId(vid)
                      } catch (e) {
                        console.error('could not vote:', e)
                      }
                      setVoting(false)
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
          You already voted! Vote id: {voteId}
        </Else>
      </If>
    </>
  )
}

export default VoteOptions
