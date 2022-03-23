import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from 'renderer/slices/mainSlice';

function LogView() {
  const [logs, setLogs] = useState<string[]>([]);
  const validator = useSelector((state: RootState) => state.validator);
  const { net } = validator;

  useEffect(() => {
    const listener = (logsResp: any) => {
      ReactDOM.unstable_batchedUpdates(() => {
        setLogs((prevLogs: string[]) => {
          const newLogs = [...logsResp.logs.reverse(), ...prevLogs];

          // utter pseudo-science -- determine max log lines from window size
          const MAX_DISPLAYED_LOG_LINES = window.innerHeight / 22;
          if (newLogs.length > MAX_DISPLAYED_LOG_LINES) {
            return newLogs.slice(0, MAX_DISPLAYED_LOG_LINES);
          }
          return newLogs;
        });
      });
    };
    setLogs([]);
    window.electron.ipcRenderer.on('transaction-logs', listener);
    window.electron.ipcRenderer.subscribeTransactionLogs({
      net,
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners('transaction-logs');
      window.electron.ipcRenderer.unsubscribeTransactionLogs({
        net,
      });
    };
  }, [net]);

  return (
    <div>
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
};

export default LogView;
