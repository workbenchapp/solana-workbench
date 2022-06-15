import { ACCOUNTS_NONE_KEY } from '../data/accounts/accountInfo';

const prettifyPubkey = (pk = '') => {
  if (pk === null) {
    // cope with bad data in config
    return '';
  }
  return pk !== ACCOUNTS_NONE_KEY
    ? `${pk.slice(0, 4)}…${pk.slice(pk.length - 4, pk.length)}`
    : '';
};

function InlinePK(props: { pk: string; className?: string }) {
  const { pk, className } = props;
  return (
    <span className={className}>
      <code className="overflow-ellipsis">{pk}</code>
    </span>
  );
}

InlinePK.defaultProps = {
  className: '',
};

export default InlinePK;
