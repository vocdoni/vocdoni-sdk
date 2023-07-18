import { Box, Button, Code, Heading, ListItem, Text, UnorderedList } from '@chakra-ui/react'
import { Wallet } from '@ethersproject/wallet'
import React from 'react'

type CensusProps = {
  account: string,
  balance: number,
  disabled: boolean,
  signers: Wallet[],
  setSigners: React.Dispatch<React.SetStateAction<Wallet[]>>,
}

const Census = ({account, balance, signers, setSigners, disabled} : CensusProps) => (
  <>
    <Text>Logged in with <Code>{account}</Code> ({balance} vocdoni tokens)</Text>
    <Text>
      Your current wallet will be added to the census, but you can add
      some random wallets here for testing purposes:
    </Text>
    <Button
      disabled={disabled}
      onClick={() => {
      setSigners([
        ...signers,
        Wallet.createRandom(),
      ])
    }}>
      Create random wallet
    </Button>
    <Box backgroundColor={'gray.100'} p={4} borderRadius={5}>
      <Heading size='md' textAlign='center'>Census</Heading>
      <UnorderedList>
        <ListItem><Code>0x{account}</Code></ListItem>
        {
          signers.map((w, k) => (
            <ListItem key={k}>
              <Code>{w.address}</Code>
            </ListItem>
          ))
        }
      </UnorderedList>
    </Box>
  </>
)

export default Census
