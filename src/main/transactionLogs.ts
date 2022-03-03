import * as sol from '@solana/web3.js';
import Electron from 'electron';
import { netToURL } from '../common/strings';
import { logger } from './logger';

let sub: any = {};
const subscribeTransactionLogs = async (
  event: Electron.IpcMainEvent,
  msg: any
) => {
  const solConn = new sol.Connection(netToURL(msg.net));
  sub = { solConn };
  sub.subscriptionID = solConn.onLogs(
    'all',
    (logsInfo) => {
      logger.info('logs', logsInfo);
      event.reply('transaction-logs', logsInfo);
    },
    'processed'
  );
};

const unsubscribeTransactionLogs = async () => {
  await sub.solConn.removeProgramAccountChangeListener(sub.subscriptionID);
  sub.subscriptionID = 0;
};

export { unsubscribeTransactionLogs, subscribeTransactionLogs };
