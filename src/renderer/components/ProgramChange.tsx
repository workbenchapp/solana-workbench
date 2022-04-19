import { useEffect, useState, useCallback } from 'react';

import { faStar } from '@fortawesome/free-solid-svg-icons';
import * as faRegular from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from 'react-bootstrap/Container';
import { setSelected } from 'renderer/data/SelectedAccountsList/selectedAccountsState';
import { useAppDispatch, useInterval } from '../hooks';

import InlinePK from './InlinePK';

import { AccountInfo } from '../data/accounts/accountInfo';
import { getAccount, truncateLamportAmount } from '../data/accounts/getAccount';
import { Net } from '../data/ValidatorNetwork/validatorNetworkState';

export function ProgramChange(props: {
  net: Net;
  pubKey: string;
  pinned: boolean;
  pinAccount: (pk: string, b: boolean) => void;
  selected: boolean;
}) {
  const dispatch = useAppDispatch();
  const { pubKey, selected, net, pinned, pinAccount } = props;
  const [change, setChangeInfo] = useState<AccountInfo | undefined>(undefined);

  const updateAccount = useCallback(() => {
    if (pubKey) {
      getAccount(net, pubKey)
        .then((res) => {
          // eslint-disable-next-line promise/always-return
          if (res) {
            setChangeInfo(res);
          }
        })
        /* eslint-disable no-console */
        .catch(console.log);
    } else {
      setChangeInfo(undefined);
    }
  }, [net, pubKey]);

  useEffect(() => {
    updateAccount();
  }, [net, pubKey, updateAccount]);

  useInterval(() => {
    updateAccount();
  }, 666);

  if (!change) {
    return <Container key={pubKey}>Loading change for {pubKey}...</Container>;
  }

  const formatSolAmount = (amt: number): string => {
    if (Math.abs(amt) < 0.01) {
      return '<0.01';
    }
    return Math.abs(amt).toFixed(2);
  };
  return (
    <tr
      onClick={() => dispatch(setSelected(pubKey))}
      className={selected ? 'bg-lightblue' : ''}
    >
      <td onClick={() => pinAccount(pubKey, pinned)}>
        <span className="icon icon-interactive">
          <FontAwesomeIcon icon={pinned ? faStar : faRegular.faStar} />
        </span>
      </td>
      <td>
        <InlinePK pk={pubKey} />
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">Max Δ</small>
          <small className="ms-2">{formatSolAmount(change.maxDelta)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">SOL</small>
          <small className="ms-2">{truncateLamportAmount(change)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 badge bg-secondary rounded-pill">
          {change.count}
        </span>
      </td>
    </tr>
  );
}

export default ProgramChange;
