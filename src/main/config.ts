import cfg from 'electron-cfg';
import promiseIpc from 'electron-promise-ipc';
import type { IpcMainEvent, IpcRendererEvent } from 'electron';
import { ConfigAction, ConfigMap } from '../types/types';

import { logger } from './logger';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

promiseIpc.on('getSven', (count: unknown, event: IpcEvent | undefined) => {
  logger.info(`main: called getSven${count}`);
  return `asdf${event}`;
});
promiseIpc.on('CONFIG-GetAll', (event: IpcEvent | undefined) => {
  logger.info('main: called CONFIG-GetAll', event);
  return cfg.get('config');
});
promiseIpc.on(
  'CONFIG-Set',
  (key: unknown, val: unknown, event?: IpcEvent | undefined) => {
    logger.info(`main: called CONFIG-Set, ${key}, ${val}, ${event}`);
    return cfg.set(`config.${key}`, val);
  }
);

export type WBConfigRequest = {
  key: string;
  val?: string;
  action: string;
};

export type WBConfigResponse = {
  values: ConfigMap;
};

async function wbConfig(msg: WBConfigRequest): Promise<WBConfigResponse> {
  const { action, key } = msg;
  if (action === ConfigAction.Set) {
    const { val } = msg;
    await cfg.set(`config.${key}`, val);
  }
  const values: ConfigMap = await cfg.get('config');
  logger.info('config values', { values: JSON.stringify(values) });
  return { values };
}

export default wbConfig;

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
