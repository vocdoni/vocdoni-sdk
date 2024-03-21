import { VocdoniCensus3Client } from '@vocdoni/sdk';

// Check if target chain is supported
export const supportsChain = (census3Client: VocdoniCensus3Client, chainID: number) => {
  return census3Client.getSupportedChains().then(chains => {
    for (let chain of chains) {
      // Check for Sepolia chainID
      if (chain.chainID == chainID) {
        return true;
      }
    }
    return false;
  });
};

// Check if token is already supported
export const supportsToken = (census3Client: VocdoniCensus3Client, tokenAddress: string) => {
  return census3Client.getSupportedTokens().then(tokens => {
    for (let token of tokens) {
      if (token.ID.toLowerCase() === tokenAddress.toLowerCase()) {
        return true;
      }
    }
    return false;
  });
};

export async function checkTokenReady (census3Client: VocdoniCensus3Client, tokenAddress: string, chainID: number) {
  // See if our token's chain is supported
  const supportsMyChain = await supportsChain(census3Client, chainID);
  if (!supportsMyChain) {
    console.error('Census service does not support chain %d', chainID);
    return false;
  }

  // See if our token is already supported
  const supportsMyToken = await supportsToken(census3Client, tokenAddress);
  if (!supportsMyToken) {
    console.log('Census service does not support token ' + tokenAddress + '. Registering token now.');
    await census3Client.createToken(tokenAddress, 'erc20', chainID);
  }

  // Check the token status. If syncing, return and try again later.
  let status = (await census3Client.getToken(tokenAddress, chainID)).status;
  if (!status.synced) {
    console.log('Token %s is syncing. Progress %d%. Try again later.', tokenAddress, status.progress);
    return false;
  }
  return true;
}
