import { ACCOUNTS_NONE_KEY } from '../data/accounts/accountInfo';

const prettifyPubkey = (pk = '', formatLength?: number) => {
  if (pk === null) {
    // cope with bad data in config
    return '';
  }
  if (pk === ACCOUNTS_NONE_KEY) {
    // cope with bad data in config
    return '';
  }
  if (!formatLength || formatLength + 2 > pk.length) {
    return pk;
  }
  const partLen = (formatLength - 1) / 2;

  return `${pk.slice(0, partLen)}…${pk.slice(pk.length - partLen, pk.length)}`;
};

export default prettifyPubkey;
