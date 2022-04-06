import { ACCOUNTS_NONE_KEY } from '../data/accounts/accountInfo';

import CopyIcon from './CopyIcon';

const prettifyPubkey = (pk = '') =>
  pk !== ACCOUNTS_NONE_KEY
    ? `${pk.slice(0, 4)}…${pk.slice(pk.length - 4, pk.length)}`
    : '';

function InlinePK(props: { pk: string; className?: string }) {
  const { pk, className } = props;
  return (
    <span className={className}>
      <code>{prettifyPubkey(pk)}</code>
      <CopyIcon writeValue={pk} />
    </span>
  );
}

InlinePK.defaultProps = {
  className: '',
};

export default InlinePK;
