
import * as sol from '@solana/web3.js';
import { netToURL } from '../common/strings';
import { vCount, ValidatorNetworkInfoResponse, ValidatorNetworkInfoRequest } from '../types/types';

interface VersionCount {
  [key: string]: number
}

const fetchValidatorNetworkInfo = async (msg: ValidatorNetworkInfoRequest) => {
  const url = netToURL(msg.net);
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
  const versions: vCount[] = []
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

export default fetchValidatorNetworkInfo;
