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
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;

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
          const MAX_DISPLAYED_LOG_LINES = window.innerHeight / 22;
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
        /* eslint-disable-next-line no-console */
        .catch(console.log);
    };
  }, [net]);

  return (
    <div>
      <div className="mb-2">
        <small>
          <strong>Stream validator transaction logs ({commitmentLevel})</strong>
        </small>
      </div>
      {logs.length > 0 ? (
        <pre>
          <code>{logs.join('\n')}</code>
        </pre>
      ) : (
        <p className="text-secondary">
          Logs will appear here once transactions are processed.
        </p>
      )}
    </div>
  );
}

export default LogView;
