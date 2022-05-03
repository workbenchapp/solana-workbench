import { useEffect, useState } from 'react';
import * as sol from '@solana/web3.js';
import { useAppSelector } from '../hooks';
import {
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

export interface LogSubscriptionMap {
  [net: string]: {
    subscriptionID: number;
    solConn: sol.Connection;
  };
}

// TODO: make this selectable - Return information at the selected commitment level
//      [possible values: processed, confirmed, finalized]
//      cli default seems to be finalized

const commitmentLevel = 'processed';

const logSubscriptions: LogSubscriptionMap = {};

function LogView() {
  const [logs, setLogs] = useState<string[]>([]);
  const { net } = useAppSelector(selectValidatorNetworkState);

  useEffect(() => {
    setLogs([]);

    const solConn = new sol.Connection(netToURL(net));
    const subscriptionID = solConn.onLogs(
      'all',
      (logsInfo) => {
        setLogs((prevLogs: string[]) => {
          const newLogs = [
            logsInfo.signature,
            logsInfo.err?.toString() || 'Ok',
            ...logsInfo.logs.reverse(),
            ...prevLogs,
          ];

          // utter pseudo-science -- determine max log lines from window size
          const MAX_DISPLAYED_LOG_LINES = (3 * window.innerHeight) / 22;
          if (newLogs.length > MAX_DISPLAYED_LOG_LINES) {
            return newLogs.slice(0, MAX_DISPLAYED_LOG_LINES);
          }
          return newLogs;
        });
      },
      commitmentLevel
    );
    logSubscriptions[net] = { subscriptionID, solConn };

    return () => {
      const sub = logSubscriptions[net];
      sub.solConn
        .removeOnLogsListener(sub.subscriptionID)
        // eslint-disable-next-line promise/always-return
        .then(() => {
          delete logSubscriptions[net];
        })
        .catch(window.electron.log.info);
    };
  }, [net]);

  return (
    <div>
      <textarea
        readOnly
        className="vscroll almost-vh-100 w-100"
        value={
          logs.length > 0
            ? logs.join('\n')
            : 'Logs will appear here once transactions are processed.'
        }
      />
    </div>
  );
}

export default LogView;
