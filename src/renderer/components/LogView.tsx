import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Net } from 'types/types';

const LogView = () => {
  const [logs, setLogs] = useState('');

  useEffect(() => {
    const listener = (logsResp: any) => {
      console.log(logsResp);
      ReactDOM.unstable_batchedUpdates(() => {
        setLogs(
          (prevLogs: string) => `${prevLogs}\n${logsResp.logs.join('\n')}`
        );
      });
    };
    window.electron.ipcRenderer.on('transaction-logs', listener);
    window.electron.ipcRenderer.subscribeTransactionLogs({
      net: Net.Localhost,
    });

    return () => {
      window.electron.ipcRenderer.removeListener('transaction-logs', listener);
      window.electron.ipcRenderer.unsubscribeTransactionLogs({
        net: Net.Localhost,
      });
    };
  }, []);

  return (
    <div>
      {logs !== '' ? (
        <pre>
          <code>{logs}</code>
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
