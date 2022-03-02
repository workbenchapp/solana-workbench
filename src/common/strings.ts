import { ACCOUNTS_NONE_KEY, Net } from '../types/types';

const netToURL = (net: Net): string => {
  switch (net) {
    case Net.Localhost:
      return 'http://127.0.0.1:8899';
    case Net.Dev:
      return 'https://api.devnet.solana.com';
    case Net.Test:
      return 'https://api.testnet.solana.com';
    case Net.MainnetBeta:
      return 'https://api.mainnet-beta.solana.com';
    default:
  }
  return '';
};

const explorerURL = (net: Net, address: string) => {
  switch (net) {
    case Net.Test:
    case Net.Dev:
      return `https://explorer.solana.com/address/${address}?cluster=${net}`;
    case Net.Localhost:
      return `https://explorer.solana.com/address/${address}/ \
  ?cluster=custom&customUrl=${encodeURIComponent(netToURL(net))}`;
    default:
      return `https://explorer.solana.com/address/${address}`;
  }
};

const prettifyPubkey = (pk = '') =>
  pk !== ACCOUNTS_NONE_KEY
    ? `${pk.slice(0, 4)}…${pk.slice(pk.length - 4, pk.length)}`
    : '';

const truncateSolAmount = ( solAmount: number | undefined ) => {
  if (solAmount === undefined) {
    return ""
  }
  if (solAmount > 999) {
    return solAmount.toFixed(0)
  }
  if (solAmount < 0.001) {
    return solAmount.toPrecision(6) // This is probably redundant
  }
  return solAmount.toPrecision(9)
}

export { netToURL, prettifyPubkey, explorerURL, truncateSolAmount };
