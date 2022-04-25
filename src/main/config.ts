import {
  ConfigAction,
  ConfigMap,
  WBConfigRequest,
  WBConfigResponse,
} from '../types/types';
import db from './db';
import { logger } from './logger';

async function wbConfig(msg: WBConfigRequest): Promise<WBConfigResponse> {
  const { action, key } = msg;
  if (action === ConfigAction.Set) {
    const { val } = msg;
    await db.config.set(key, val);
  }
  const values: ConfigMap = await db.config.all();
  logger.info('config values', { values: JSON.stringify(values) });
  return { values };
}

export default wbConfig;
