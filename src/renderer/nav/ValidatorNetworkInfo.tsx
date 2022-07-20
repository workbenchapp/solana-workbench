import * as sol from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';
import { VictoryPie } from 'victory';
import { GetValidatorConnection, logger } from '../common/globals';
import {
  Net,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAppSelector } from '../hooks';

interface VersionCount {
  [key: string]: number;
}
export type VCount = {
  version: string;
  count: number;
};
export type ValidatorNetworkInfoResponse = {
  version: string;
  nodes: sol.ContactInfo[];
  versionCount: VCount[];
};
// https://docs.solana.com/developing/clients/jsonrpc-api#getclusternodes
const fetchValidatorNetworkInfo = async (net: Net) => {
  const solConn = GetValidatorConnection(net);
  const contactInfo = await solConn.getClusterNodes();
  // TODO: on success / failure update the ValidatorNetworkState..
  const nodeVersion = await solConn.getVersion();

  const frequencyCount: VersionCount = {};

  contactInfo.map((info: sol.ContactInfo) => {
    let version = 'none';
    if (info.version) {
      version = info.version;
    }

    if (frequencyCount[version]) {
      frequencyCount[version] += 1;
    } else {
      frequencyCount[version] = 1;
    }
    return undefined;
  });
  const versions: VCount[] = [];
  Object.entries(frequencyCount).forEach(([version, count]) => {
    versions.push({
      version,
      count,
    });
  });

  const response: ValidatorNetworkInfoResponse = {
    nodes: contactInfo,
    version: nodeVersion['solana-core'],
    versionCount: versions,
  };

  return response;
};

function ValidatorNetworkInfo() {
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;

  const [data, setData] = useState<ValidatorNetworkInfoResponse>({
    version: 'unknown',
    nodes: [],
    versionCount: [],
  });
  useEffect(() => {
    // TODO: set a spinner while waiting for response
    fetchValidatorNetworkInfo(net)
      .then((d) => setData(d))
      .catch(logger.info);
  }, [validator, net]);

  // TODO: maybe show te version spread as a histogram and feature info ala
  // solana --url mainnet-beta feature status
  return (
    <Container fluid className="p-3">
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
          style={{ labels: { fontSize: 8, stroke: 'grey' } }}
          // labels={({ datum }) => datum.version}
          x={(d) => (d as VCount).version}
          y={(d) => (d as VCount).count}
        />
      </Row>
    </Container>
  );
}

export default ValidatorNetworkInfo;
