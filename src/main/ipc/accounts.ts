import cfg from 'electron-cfg';
import promiseIpc from 'electron-promise-ipc';
import { IpcMainEvent, IpcRendererEvent } from 'electron';

import * as web3 from '@solana/web3.js';
import * as bip39 from 'bip39';

import { logger } from '../logger';

async function createNewKeypair() {
  const mnemonic = bip39.generateMnemonic();
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const newKeypair = web3.Keypair.fromSeed(seed.slice(0, 32));

  logger.info(
    `main generated new account${newKeypair.publicKey.toString()} ${JSON.stringify(
      newKeypair
    )}`
  );

  const val = {
    privatekey: newKeypair.secretKey,
    mnemonic,
  };
  cfg.set(`accounts.${newKeypair.publicKey.toString()}`, val);

  return val;
}

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initAccountPromises() {
  // gets written to .\AppData\Roaming\SolanaWorkbench\electron-cfg.json on windows
  promiseIpc.on('ACCOUNT-GetAll', (event: IpcEvent | undefined) => {
    logger.info('main: called ACCOUNT-GetAll', event);
    const config = cfg.get('accounts');
    if (!config) {
      return {};
    }
    return config;
  });
  // TODO: so the idea is that this == a list of private keys with annotations (like human name...)
  // so it could be key: public key, value is a map[string]interface{} with a convention that 'privatekey' contains that in X form...
  promiseIpc.on(
    'ACCOUNT-Set',
    (key: unknown, val: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called ACCOUNT-Set, ${key}, ${val}, ${event}`);
      return cfg.set(`accounts.${key}`, val);
    }
  );
  promiseIpc.on('ACCOUNT-CreateNew', (event: IpcEvent | undefined) => {
    logger.info(`main: called ACCOUNT-CreateNew, ${event}`);
    return createNewKeypair();
  });
}

export default {};
