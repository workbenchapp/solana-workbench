import cfg from 'electron-cfg';
import {
  ConfigAction,
  ConfigMap,
  WBConfigRequest,
  WBConfigResponse,
} from '../types/types';

import { logger } from './logger';

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
