import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Container from 'react-bootstrap/Container';
import { Row, Col } from 'react-bootstrap';
import { VictoryPie } from 'victory';
import { RootState } from '../slices/mainSlice';
import { ValidatorNetworkInfoResponse } from '../../types/types';

function ValidatorNetworkInfo() {
  const validator = useSelector((state: RootState) => state.validator);
  const { net } = validator;

  const [data, setData] = useState<ValidatorNetworkInfoResponse>({
    version: 'unknown',
    nodes: [],
    versionCount: [],
  });

  useEffect(() => {
    window.electron.ipcRenderer.fetchValidatorNetworkInfo({
      net,
    });
  }, [net]);

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
    <Container fluid>
      <Row>
        <Col>
          Current Network:
          {net}
        </Col>
        <Col>
          Current Version:
          {data.version}
        </Col>
      </Row>
      <Row>
        <VictoryPie
          // https://formidable.com/open-source/victory/docs/victory-pie
          data={data.versionCount}
          colorScale="heatmap"
          height={200}
          labelRadius={55}
          style={{ labels: { fontSize: 4 } }}
          // labels={({ datum }) => datum.version}
          x={(d) => d.version}
          y={(d) => d.count}
        />
      </Row>
    </Container>
  );
}

export default ValidatorNetworkInfo;
