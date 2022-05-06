import { faStar } from '@fortawesome/free-solid-svg-icons';
import * as faRegular from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { setSelected } from 'renderer/data/SelectedAccountsList/selectedAccountsState';
import { useAppDispatch } from '../hooks';

import InlinePK from './InlinePK';

import { AccountInfo } from '../data/accounts/accountInfo';
import { truncateLamportAmount } from '../data/accounts/getAccount';
import { Net } from '../data/ValidatorNetwork/validatorNetworkState';

export function ProgramChange(props: {
  net: Net;
  pinned: boolean;
  pinAccount: (pk: string, b: boolean) => void;
  selected: boolean;
  change: AccountInfo;
}) {
  const dispatch = useAppDispatch();
  const { selected, net, pinned, pinAccount, change } = props;
  const { pubKey } = change;

  const formatSolAmount = (amt: number): string => {
    if (Math.abs(amt) < 0.01) {
      return '<0.01';
    }
    return Math.abs(amt).toFixed(2);
  };

  const showCount = change?.count || 0;
  const showSOL = change
    ? truncateLamportAmount(change)
    : `no account on ${net}`;
  const showChange = change ? formatSolAmount(change.maxDelta) : 0;

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
          <small className="ms-2">{showChange}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">{change ? 'SOL' : ''}</small>
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
