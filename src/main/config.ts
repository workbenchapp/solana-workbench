import cfg from 'electron-cfg';
import promiseIpc from 'electron-promise-ipc';
import type { IpcMainEvent, IpcRendererEvent } from 'electron';

import { logger } from './logger';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

// NOTE: using the electron-cfg window size code can reault in the window shrinking every time the app restarts
// Sven has seen it on windows with one 4k screen at 100%, the other at 200%

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initConfigPromises() {
  // gets written to .\AppData\Roaming\SolanaWorkbench\electron-cfg.json on windows
  promiseIpc.on('CONFIG-GetAll', (event: IpcEvent | undefined) => {
    logger.info('main: called CONFIG-GetAll', event);
    const config = cfg.get('config');
    if (!config) {
      return {};
    }
    return config;
  });
  promiseIpc.on(
    'CONFIG-Set',
    (key: unknown, val: unknown, event?: IpcEvent | undefined) => {
      logger.info(`main: called CONFIG-Set, ${key}, ${val}, ${event}`);
      return cfg.set(`config.${key}`, val);
    }
  );
}

export default {};
// TODO: https://github.com/sindresorhus/electron-store has schema, so am very likely to move to that

/*
PS C:\Users\svend> more '.\AppData\Roaming\SolanaWorkbench\electron-cfg.json'
{
  "windowState": {
    "main": {
      "isMaximized": false,
      "isFullScreen": false,
      "x": 772,
      "y": 177,
      "width": 1994,
      "height": 1359
    }
  },
  "config": {
    "analytics_enabled": "false"
  }
}
*/
