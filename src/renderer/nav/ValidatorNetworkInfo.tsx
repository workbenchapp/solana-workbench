import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Container from 'react-bootstrap/Container';
import { Row, Col } from 'react-bootstrap';
import { VictoryPie } from 'victory';
import { RootState } from '../slices/mainSlice';

import * as sol from '@solana/web3.js';
import { netToURL } from '../../common/strings';
import {
  VCount,
  ValidatorNetworkInfoRequest,
  ValidatorNetworkInfoResponse,
} from '../../types/types';

interface VersionCount {
  [key: string]: number
}

const fetchValidatorNetworkInfo = async (url: string) => {
  const solConn = new sol.Connection(url);
  const contactInfo = await solConn.getClusterNodes();
  const nodeVersion = await solConn.getVersion();

  const frequencyCount: VersionCount = {}

  contactInfo.map((info: sol.ContactInfo) => {
    let version = 'none'
    if (info.version) {
      version = info.version
    }

    if (frequencyCount[version]) {
      frequencyCount[version] += 1
    } else {
      frequencyCount[version] = 1
    }
    return undefined
  })
  const versions: VCount[] = []
  Object.entries(frequencyCount).forEach(([version, count]) => {
    versions.push({
      version,
      count,
    })
  })

  const response: ValidatorNetworkInfoResponse = {
    nodes: contactInfo,
    version: nodeVersion['solana-core'],
    versionCount: versions,
  }


  return response;
};

//export default fetchValidatorNetworkInfo;

function ValidatorNetworkInfo() {
  const validator = useSelector((state: RootState) => state.validator);
  const { net } = validator;
  const url = netToURL(net)

  const [data, setData] = useState<ValidatorNetworkInfoResponse>({
    version: 'unknown',
    nodes: [],
    versionCount: [],
  });

  useEffect(() => {
    // TODO: set a spinner while waiting for response
    fetchValidatorNetworkInfo(url).then((d) => setData(d))
  }, [net])

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
