import * as sol from '@solana/web3.js';
import { netToURL } from '../common/strings';
import {
  NodeInfo,
  ValidatorNetworkInfoRequest,
  ValidatorNetworkInfoResponse,
} from '../types/types';

const fetchValidatorNetworkInfo = async (msg: ValidatorNetworkInfoRequest) => {
  const url = netToURL(msg.net);
  const solConn = new sol.Connection(url);
  const contactInfo = await solConn.getClusterNodes();
  const nodeVersion = await solConn.getVersion();

  const nodeInfos: NodeInfo[] = contactInfo.map((info: sol.ContactInfo) => {
    const newInfo: NodeInfo = {
      pubkey: info.pubkey,
      version: info.version,
      rpc: info.rpc,
      gossip: info.gossip,
    };

    return newInfo;
  });

  const response: ValidatorNetworkInfoResponse = {
    nodes: nodeInfos,
    version: nodeVersion['solana-core'],
  };

  return response;
};

export default fetchValidatorNetworkInfo;
