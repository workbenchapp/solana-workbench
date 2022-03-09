import { WBConfigRequest, WBConfigResponse } from 'types/types';
import { db } from './db';

async function wbConfig(msg: WBConfigRequest): Promise<WBConfigResponse> {
  const { action, key } = msg;
  if (action === 'set') {
    const { val } = msg;
    db.run('UPDATE config SET val = ? WHERE name = ?', val, key);
    return { val };
  }
  const val = await db.get('SELECT val FROM config WHERE name = ?', key);
  return { val };
}

export default wbConfig;
