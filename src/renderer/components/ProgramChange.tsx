import { useCallback, useEffect, useState } from 'react';
import { setSelected } from '@/data/SelectedAccountsList/selectedAccountsState';
import { AccountInfo } from '../data/accounts/accountInfo';
import { useAccountMeta } from '../data/accounts/accountState';
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
import { useAppDispatch, useAppSelector, useInterval } from '../hooks';
import InlinePK from './InlinePK';

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
      className={`transition duration-50 bg-opacity-20 hover:bg-opacity-30 hover:bg-primary-light ${
        selected ? 'bg-primary-light' : ''
      }`}
    >
      <td onClick={() => pinAccount(pubKey, pinned)} align="center">
        <span className="icon icon-interactive">
          {pinned ? <IconMdiStar /> : <IconMdiStarOutline />}
        </span>
      </td>
      <td>
        <InlinePK
          className="inline-flex items-center mr-2"
          format
          formatLength={12}
          pk={pubKey}
        />
        {accountMeta?.privatekey ? <IconMdiKey className="inline-block" /> : ''}
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
