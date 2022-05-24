import * as web3 from '@solana/web3.js';

import { WalletContextState } from '@solana/wallet-adapter-react';

import { ConfigState } from 'types/types';
import { reloadFromMain } from './accountState';
import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';
import { setConfigValue } from '../Config/configState';

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

export async function sendSolFromSelectedWallet(
  connection: web3.Connection,
  fromKey: WalletContextState,
  toKey: string,
  solAmount: string
) {
  const { publicKey, sendTransaction } = fromKey;
  if (!publicKey) {
    throw Error('no wallet selected');
  }
  const toPublicKey = new web3.PublicKey(toKey);

  const lamports = web3.LAMPORTS_PER_SOL * parseFloat(solAmount);

  let signature: web3.TransactionSignature = '';

  const transaction = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  );

  signature = await sendTransaction(transaction, connection);

  await connection.confirmTransaction(signature, 'finalized');
}

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

export async function getElectronStorageWallet(
  config?: ConfigState,
  dispatch
): Promise<web3.Keypair> {
  // if (config && config.values && `ElectronAppStorageKeypair` in config.values) {
  //   return getAccountFromConfig(config.values.ElectronAppStorageKeypair);
  // }

  // if the config doesn't have a keypair set, make one..
  return createNewAccount(dispatch)
    .then((keypair) => {
      dispatch(
        setConfigValue({
          key: 'ElectronAppStorageKeypair',
          value: keypair.publicKey.toString(),
        })
      );
      return keypair;
    })
    .catch((e) => {
      logger.error(e);
      throw e;
    });
}

export default createNewAccount;
