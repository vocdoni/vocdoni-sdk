import { Account, VocdoniSDKClient } from '@vocdoni/sdk';

export const createAccount = (client: VocdoniSDKClient) => {
  return client
    .createAccount({
      account: new Account({
        languages: ['en'],
        name: {
          default: 'Account name',
        },
        description: 'Description of the account',
        logo: 'https://logo.io',
      }),
    })
    .then(() => client.fetchAccountInfo().then(info => console.log(info)));
};
