import { useEffect, useState, useCallback } from 'react';
import { faStar, faKey } from '@fortawesome/free-solid-svg-icons';
import * as faRegular from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { setSelected } from 'renderer/data/SelectedAccountsList/selectedAccountsState';
import { useAppDispatch, useInterval, useAppSelector } from '../hooks';

import InlinePK from './InlinePK';

import { AccountInfo } from '../data/accounts/accountInfo';
import {
  getAccount,
  truncateLamportAmount,
  truncateSolAmount,
} from '../data/accounts/getAccount';
import {
  Net,
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAccountMeta } from '../data/accounts/accountState';

const logger = window.electron.log;

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
  const { status } = useAppSelector(selectValidatorNetworkState);
  const accountMeta = useAccountMeta(pubKey);

  const updateAccount = useCallback(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    if (pubKey) {
      getAccount(net, pubKey)
        .then((res) => {
          // eslint-disable-next-line promise/always-return
          if (res) {
            setChangeInfo(res);
          }
        })
        .catch(logger.info);
    } else {
      setChangeInfo(undefined);
    }
  }, [net, status, pubKey]);

  useEffect(() => {
    updateAccount();
  }, [net, pubKey, updateAccount]);

  useInterval(() => {
    updateAccount();
  }, 666);

  const showCount = change?.count || 0;
  const showSOL = change
    ? truncateLamportAmount(change)
    : `no account on ${net}`;
  const showChange = change ? truncateSolAmount(change.maxDelta) : 0;

  return (
    <tr
      onClick={() => dispatch(setSelected(pubKey))}
      className={selected ? 'blue' : ''}
    >
      <td onClick={() => pinAccount(pubKey, pinned)}>
        <span className="icon icon-interactive">
          <FontAwesomeIcon icon={pinned ? faStar : faRegular.faStar} />
        </span>
      </td>
      <td>
        <InlinePK pk={pubKey} />
        {accountMeta?.privatekey ? (
          <FontAwesomeIcon title="has private key" icon={faKey} />
        ) : (
          ''
        )}
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="ms-2">{showChange}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="ms-2">{showSOL}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 badge bg-secondary rounded-pill">
          {showCount}
        </span>
      </td>
    </tr>
  );
}

export default ProgramChange;
