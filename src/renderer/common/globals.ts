import * as sol from '@solana/web3.js';
import { Net, netToURL } from '../data/ValidatorNetwork/validatorNetworkState';

// eslint-disable-next-line import/prefer-default-export
export const logger = (() => {
  return window.electron?.log;
})();

// TODO: make this selectable - Return information at the selected commitment level
//      [possible values: processed, confirmed, finalized]
//      cli default seems to be finalized
// The _get_ data commitment level - can cause some mutation API calls to fail (i think due to wallet-adapter / metaplex things)
export const commitmentLevel = 'processed';

let solConn: sol.Connection | undefined;
let connNet: Net;

export function GetValidatorConnection(net: Net) {
  if (connNet === net) {
    if (solConn) {
      return solConn;
    }
    solConn = undefined;
    connNet = net;
  }
  const cfg: sol.ConnectionConfig = {
    commitment: commitmentLevel,
    disableRetryOnRateLimit: true,
  };
  solConn = new sol.Connection(netToURL(net), cfg);

  return solConn;
}
