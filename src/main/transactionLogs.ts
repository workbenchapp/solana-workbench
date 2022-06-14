import { LogSubscriptionMap } from '@/types/types';
import * as sol from '@solana/web3.js';
import Electron from 'electron';
import { netToURL } from '../common/strings';

const logSubscriptions: LogSubscriptionMap = {};
const subscribeTransactionLogs = async (
  event: Electron.IpcMainEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: any
) => {
  const solConn = new sol.Connection(netToURL(msg.net));
  const subscriptionID = solConn.onLogs(
    'all',
    (logsInfo) => {
      event.reply('transaction-logs', logsInfo);
    },
    'processed'
  );
  logSubscriptions[msg.net] = { subscriptionID, solConn };
};

const unsubscribeTransactionLogs = async (
  _event: Electron.IpcMainEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: any
) => {
  const sub = logSubscriptions[msg.net];
  await sub.solConn.removeOnLogsListener(sub.subscriptionID);
  delete logSubscriptions[msg.net];
};

export { unsubscribeTransactionLogs, subscribeTransactionLogs };
