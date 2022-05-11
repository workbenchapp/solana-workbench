import { AnyAction, Dispatch, ThunkDispatch } from '@reduxjs/toolkit';
import { WalletContextState } from '@solana/wallet-adapter-react';
import * as sol from '@solana/web3.js';
import { logger } from '@/common/globals';
import { NewKeyPairInfo } from '../../../types/types';
import { ConfigState, setConfigValue } from '../Config/configState';
import { SelectedAccountsList } from '../SelectedAccountsList/selectedAccountsState';
import {
  Net,
  netToURL,
  ValidatorState,
} from '../ValidatorNetwork/validatorNetworkState';
import { AccountsState, reloadFromMain } from './accountState';

export async function airdropSol(net: Net, toKey: string, solAmount: string) {
  const to = new sol.PublicKey(toKey);
  const sols = parseFloat(solAmount);

  const connection = new sol.Connection(netToURL(net));

  const airdropSignature = await connection.requestAirdrop(
    to,
    sols * sol.LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(airdropSignature);
}

export async function sendSolFromSelectedWallet(
  connection: sol.Connection,
  fromKey: WalletContextState,
  toKey: string,
  solAmount: string
) {
  const { publicKey, sendTransaction } = fromKey;
  if (!publicKey) {
    throw Error('no wallet selected');
  }
  const toPublicKey = new sol.PublicKey(toKey);

  const lamports = sol.LAMPORTS_PER_SOL * parseFloat(solAmount);

  let signature: sol.TransactionSignature = '';

  const transaction = new sol.Transaction().add(
    sol.SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  );

  signature = await sendTransaction(transaction, connection);

  await connection.confirmTransaction(signature, 'finalized');
}

async function createNewAccount(
  dispatch?: ThunkDispatch<
    {
      validatornetwork: ValidatorState;
      selectedaccounts: SelectedAccountsList;
      config: ConfigState;
      account: AccountsState;
    },
    undefined,
    AnyAction
  > &
    Dispatch<AnyAction>
): Promise<sol.Keypair> {
  return window.promiseIpc
    .send('ACCOUNT-CreateNew')
    .then((account: NewKeyPairInfo) => {
      if (dispatch) {
        dispatch(reloadFromMain());
      }
      logger.info(`renderer received a new account${JSON.stringify(account)}`);
      const newKeypair = sol.Keypair.fromSeed(account.privatekey.slice(0, 32));
      return newKeypair;
    })
    .catch((e: Error) => {
      logger.error(e);
      throw e;
    });
}

export async function getElectronStorageWallet(
  dispatch: ThunkDispatch<
    {
      validatornetwork: ValidatorState;
      selectedaccounts: SelectedAccountsList;
      config: ConfigState;
      account: AccountsState;
    },
    undefined,
    AnyAction
  > &
    Dispatch<AnyAction>,
  config: ConfigState,
  accounts: AccountsState
): Promise<sol.Keypair> {
  // TODO: This will eventually move into an electron wallet module, with its promiseIPC bits abstracted, but not this month.
  if (config?.values?.ElectronAppStorageKeypair) {
    const account =
      accounts.accounts[config?.values?.ElectronAppStorageKeypair];

    if (account) {
      const pk = new Uint8Array({ length: 64 });
      // TODO: so i wanted a for loop, but somehow, all the magic TS stuff said nope.
      let i = 0;
      while (i < 64) {
        // const index = i.toString();
        const value = account.privatekey[i];
        pk[i] = value;
        i += 1;
      }
      // const pk = account.accounts[key].privatekey as Uint8Array;
      try {
        return await new Promise((resolve) => {
          resolve(sol.Keypair.fromSecretKey(pk));
        });
      } catch (e) {
        logger.error('useKeypair: ', e);
      }
    }
  }
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
