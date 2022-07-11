import classnames from 'classnames';
import { faExplosion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import React from 'react';
import { ACCOUNTS_NONE_KEY } from '../data/accounts/accountInfo';

import analytics from '../common/analytics';
import { useAppSelector } from '../hooks';
import {
  Net,
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

import CopyIcon from './CopyIcon';

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

const InlinePK: React.FC<{
  pk: string | undefined;
  className?: string;
  formatLength?: number;
}> = ({ pk, className, formatLength }) => {
  const { net } = useAppSelector(selectValidatorNetworkState);

  if (!pk) {
    return (
      <span className={classnames('flex items-center', className)}>
        <small>No onchain account</small>
      </span>
    );
  }

  return (
    <span className={classnames('flex items-center', className)}>
      <pre>{prettifyPubkey(pk, formatLength)}</pre>
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
};

InlinePK.defaultProps = {
  className: '',
  formatLength: 32,
};

export default InlinePK;
