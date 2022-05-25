import cfg from 'electron-cfg';
import promiseIpc from 'electron-promise-ipc';
import type { IpcMainEvent, IpcRendererEvent } from 'electron';

import { logger } from '../logger';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

// NOTE: using the electron-cfg window size code can reault in the window shrinking every time the app restarts
// Sven has seen it on windows with one 4k screen at 100%, the other at 200%

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initConfigPromises() {
  logger.info(`Config file at ${cfg.file()}`);
  // gets written to .\AppData\Roaming\SolanaWorkbench\electron-cfg.json on windows
  promiseIpc.on('CONFIG-GetAll', (event: IpcEvent | undefined) => {
    logger.silly('main: called CONFIG-GetAll', event);
    const config = cfg.get('config');
    if (!config) {
      return {};
    }
    return config;
  });
  promiseIpc.on(
    'CONFIG-Set',
    (key: unknown, val: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called CONFIG-Set, ${key}, ${val}, ${event}`);
      return cfg.set(`config.${key}`, val);
    }
  );
}

export default {};
