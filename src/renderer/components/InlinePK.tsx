import { faExplosion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import { ACCOUNTS_NONE_KEY } from '../data/accounts/accountInfo';
import analytics from '../common/analytics';
import { useAppSelector } from '../hooks';
import {
  Net,
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

import CopyIcon from './CopyIcon';

const prettifyPubkey = (pk = '') => {
  if (pk === null) {
    // cope with bad data in config
    return '';
  }
  return pk !== ACCOUNTS_NONE_KEY
    ? `${pk.slice(0, 4)}…${pk.slice(pk.length - 4, pk.length)}`
    : '';
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

const renderCopyTooltip = (id: string, text: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,func-names
  function (ttProps: any) {
    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <Tooltip id={id} {...ttProps}>
        <div>{text}</div>
      </Tooltip>
    );
  };

function InlinePK(props: { pk: string; className?: string }) {
  const { pk, className } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);

  return (
    <span className={className}>
      <code>{prettifyPubkey(pk)}</code>
      <CopyIcon writeValue={pk} />
      <small>
        {pk !== '' ? (
          <OverlayTrigger
            placement="bottom"
            delay={{ show: 250, hide: 0 }}
            overlay={renderCopyTooltip(pk, 'Solana Explorer')}
          >
            <a
              onClick={() => analytics('clickExplorerLink', { net })}
              href={explorerURL(net, pk)}
              target="_blank"
              className="sol-link"
              rel="noreferrer"
            >
              <FontAwesomeIcon
                className="border-success rounded p-1 exe-icon"
                icon={faExplosion}
              />
            </a>
          </OverlayTrigger>
        ) : (
          'No onchain account'
        )}
      </small>
    </span>
  );
}

InlinePK.defaultProps = {
  className: '',
};

export default InlinePK;
