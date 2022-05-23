import * as web3 from '@solana/web3.js';

// import { struct, u32, ns64 } from '@solana/buffer-layout';
// import { Buffer } from 'buffer';

import { reloadFromMain } from './accountState';
import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';

const logger = window.electron.log;

export async function airdropSol(net: Net, toKey: string, solAmount: string) {
  const to = new web3.PublicKey(toKey);
  const sols = parseFloat(solAmount);

  const connection = new web3.Connection(netToURL(net));

  const airdropSignature = await connection.requestAirdrop(
    to,
    sols * web3.LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(airdropSignature);
}

export async function transferSol(
  fromKey: string,
  toKey: string,
  solAmount: string
) {
  logger.info(
    `TODO(need to store private keys safely first): transfer ${solAmount} from ${fromKey} to ${toKey}`
  );
  return new Promise((resolve) => setTimeout(resolve, 2000));
}
// TODO: replace this with a request to remote (cos in a few months, the private key should not be accessible in the client code.)
async function createNewAccount(dispatch): Promise<web3.Keypair> {
  return window.promiseIpc
    .send('ACCOUNT-CreateNew')
    .then((account) => {
      if (dispatch) {
        dispatch(reloadFromMain());
      }
      logger.info(`renderer received a new account${JSON.stringify(account)}`);
      const newKeypair = web3.Keypair.fromSeed(account.privatekey.slice(0, 32));
      return newKeypair;
    })
    .catch((e) => {
      logger.error(e);
      throw e;
    });
}

export default createNewAccount;
