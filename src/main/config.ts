import {
  ConfigAction,
  ConfigMap,
  WBConfigRequest,
  WBConfigResponse,
} from '../types/types';
import { db } from './db';

async function wbConfig(msg: WBConfigRequest): Promise<WBConfigResponse> {
  const { action, key } = msg;
  if (action === ConfigAction.Set) {
    const { val } = msg;
    const existingRow = await db.get('SELECT * FROM config WHERE key = ?', key);
    if (existingRow) {
      await db.run('UPDATE config SET val = ? WHERE key = ?', val, key);
    } else {
      await db.run('INSERT INTO config (key, val) VALUES (?, ?)', key, val);
    }
  }
  const cfgVals = await db.all('SELECT * FROM config');
  const values: ConfigMap = {};
  if (cfgVals) {
    cfgVals.forEach((setting: any) => {
      values[setting.key] = setting.val;
    });
  }
  return { values };
}

export default wbConfig;
