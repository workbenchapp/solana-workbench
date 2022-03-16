import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import { RootState } from 'renderer/slices/mainSlice';
import { ValidatorNetworkInfoResponse } from '../../types/types';

const ValidatorNetworkInfo = () => {
  const validator = useSelector((state: RootState) => state.validator);

  const columns = [
    {
      text: 'Pub Key',
      dataField: 'pubkey',
    },
    {
      text: 'Version',
      dataField: 'version',
    },
  ];

  const [data, setData] = useState<ValidatorNetworkInfoResponse>({
    version: 'unknown',
    nodes: [],
  });

  useEffect(() => {
    const { net } = validator;
    window.electron.ipcRenderer.fetchValidatorNetworkInfo({
      net,
    });
  }, [validator]);

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;

      switch (method) {
        case 'get-validator-network-info':
          if (res) {
            setData(res);
          }
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);
    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  // TODO: maybe show te version spread as a histogram and feature info ala
  // solana --url mainnet-beta feature status
  return (
    <div className="col">
      <div className="row">
        <span className="column">Current Network: {validator.net}</span>
        <span className="column">Current Version: {data.version}</span>
      </div>
      <div className="row">
        <BootstrapTable
          keyField="pubkey"
          data={data.nodes}
          columns={columns}
          pagination={paginationFactory({
            paginationSize: 25,
          })}
        />
      </div>
    </div>
  );
};

export default ValidatorNetworkInfo;
