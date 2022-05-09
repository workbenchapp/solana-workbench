import { faStar } from '@fortawesome/free-solid-svg-icons';
import * as faRegular from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { setSelected } from 'renderer/data/SelectedAccountsList/selectedAccountsState';
import { useCallback, useEffect, useState } from 'react';
import { Net, NetStatus } from 'types/types';
import { selectValidatorNetworkState } from 'renderer/data/ValidatorNetwork/validatorNetworkState';
import { useAppDispatch, useAppSelector, useInterval } from '../hooks';

import InlinePK from './InlinePK';

import { AccountInfo } from '../data/accounts/accountInfo';
import { getAccount, truncateLamportAmount } from '../data/accounts/getAccount';

export function ProgramChange(props: {
  pinned: boolean;
  pinAccount: (pk: string, b: boolean) => void;
  selected: boolean;
  change: AccountInfo | undefined;
  net: Net;
  pubKey: string;
}) {
  const dispatch = useAppDispatch();
  const { net, pubKey, selected, pinned, pinAccount, change } = props;
  const [latestChange, setLatestChange] = useState<AccountInfo | undefined>(
    change
  );
  const { status } = useAppSelector(selectValidatorNetworkState);
  let ACCOUNT_POLL_INTERVAL = 1000;
  switch (net) {
    case Net.MainnetBeta:
      ACCOUNT_POLL_INTERVAL = 5000;
      break;
    case Net.Dev:
    case Net.Test:
      ACCOUNT_POLL_INTERVAL = 2000;
      break;
    default:
  }

  const updateAccount = useCallback(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    if (pubKey) {
      getAccount(net, pubKey)
        .then((res) => {
          // eslint-disable-next-line promise/always-return
          if (res) {
            setLatestChange(res);
          }
        })
        .catch(window.electron.log.info);
    } else {
      setLatestChange(undefined);
    }
  }, [net, status, pubKey]);

  useEffect(() => {
    if (pinned) updateAccount();
  }, [net, pubKey, updateAccount, pinned]);

  useInterval(() => {
    if (pinned) updateAccount();
  }, ACCOUNT_POLL_INTERVAL);

  const formatSolAmount = (amt: number): string => {
    if (Math.abs(amt) < 0.01) {
      return '<0.01';
    }
    return Math.abs(amt).toFixed(2);
  };

  const showCount = latestChange?.count || 0;
  const showSOL = latestChange
    ? truncateLamportAmount(latestChange)
    : `no account on ${net}`;
  const showChange = latestChange ? formatSolAmount(latestChange.maxDelta) : 0;

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
      {!pinned && (
        <td>
          <span className="ms-2 rounded p-1">
            <small className="text-secondary">Max Δ</small>
            <small className="ms-2">{showChange}</small>
          </span>
        </td>
      )}
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">{latestChange ? 'SOL' : ''}</small>
          <small className="ms-2">{showSOL}</small>
        </span>
      </td>
      {!pinned && (
        <td>
          <span className="ms-2 badge bg-secondary rounded-pill">
            {showCount}
          </span>
        </td>
      )}
    </tr>
  );
}

export default ProgramChange;
