import cfg from 'electron-cfg';
import promiseIpc from 'electron-promise-ipc';
import type { IpcMainEvent, IpcRendererEvent } from 'electron';

import { logger } from '../logger';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initAccountPromises() {
  // gets written to .\AppData\Roaming\SolanaWorkbench\electron-cfg.json on windows
  promiseIpc.on('ACCOUNT-GetAll', (event: IpcEvent | undefined) => {
    logger.silly('main: called ACCOUNT-GetAll', event);
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
}

export default {};
