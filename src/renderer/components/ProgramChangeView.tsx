import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { css } from 'vite-plugin-inline-css-modules';
import {
  accountsActions,
  selectAccountsListState,
  setSelected,
} from '@/data/SelectedAccountsList/selectedAccountsState';
import { logger } from '@/common/globals';
import createNewAccount from '../data/accounts/account';
import { AccountInfo } from '../data/accounts/accountInfo';
import {
  BASE58_PUBKEY_REGEX,
  getTopAccounts,
  refreshAccountInfos,
} from '../data/accounts/getAccount';
import {
  subscribeProgramChanges,
  unsubscribeProgramChanges,
} from '../data/accounts/programChanges';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAppDispatch, useAppSelector, useInterval } from '../hooks';
import Chip from './base/Chip';
import EditableText from './base/EditableText';
import InlinePK from './InlinePK';
import { ProgramChange } from './ProgramChange';
import WatchAccountButton from './WatchAccountButton';

export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;
export enum KnownProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

interface PinnedAccountMap {
  [pubKey: string]: boolean;
}

const classes = css`
  .account-view {
    @apply w-full h-full border-collapse overflow-auto text-xs;
    & th:not(:global(.text-center)) {
      @apply text-left;
    }

    & th svg {
      @apply inline-block;
    }
  }
`;

function ProgramChangeView() {
  const dispatch = useAppDispatch();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: I suspect It would be nicer to use a function need to try it..
  const selectAccounts = useAppSelector(selectAccountsListState);
  const { pinnedAccounts } = selectAccounts;

  const pinAccount = (pubKey: string, pinned: boolean) => {
    if (!pinned) {
      dispatch(accountsActions.unshift(pubKey));
    } else {
      dispatch(accountsActions.rm(pubKey));
    }
  };

  enum SortColumn {
    Count,
    Sol,
    MaxDelta,
  }

  const [displayList, setDisplayList] = useState<string[]>([]);
  // const [paused, setPausedState] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>(SortColumn.MaxDelta);
  const [validatorSlot, setValidatorSlot] = useState<number>(0);
  const [pinnedAccount, setPinnedAccount] = useState<PinnedAccountMap>({});
  const WalletAdapterState = useWallet();

  function sortFunction(a: AccountInfo, b: AccountInfo) {
    switch (sortColumn) {
      case SortColumn.Count:
        return b.count - a.count;
      case SortColumn.Sol:
        if (!b.accountInfo || !a.accountInfo) {
          return 0;
        }
        return b.accountInfo.lamports - a.accountInfo.lamports;
      case SortColumn.MaxDelta:
      default:
        return Math.abs(b.maxDelta) - Math.abs(a.maxDelta);
    }
  }

  useInterval(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    const pinMap: PinnedAccountMap = {};

    const showKeys: string[] = []; // list of Keys
    // Add the solana wallet's account to the monitored list (if its not already watched.)
    if (WalletAdapterState.publicKey) {
      const key = WalletAdapterState.publicKey.toString();
      showKeys.push(key);
      pinMap[key] = true;
    }
    pinnedAccounts.forEach((key: string) => {
      if (!(key in pinMap)) {
        showKeys.push(key);
        pinMap[key] = true;
      }
    });

    const changes = getTopAccounts(
      net,
      MAX_PROGRAM_CHANGES_DISPLAYED,
      sortFunction
    );

    changes.forEach((key: string) => {
      if (!(key in pinMap)) {
        showKeys.push(key);
      }
    });
    setPinnedAccount(pinMap);
    setDisplayList(showKeys);
    refreshAccountInfos(net, showKeys);
  }, 666);

  const uniqueAccounts = displayList.length;

  const [programID, setProgramID] = useState<string>(
    KnownProgramID.SystemProgram
  );

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return () => {};
    }
    setDisplayList([]);
    subscribeProgramChanges(net, programID, setValidatorSlot);

    return () => {
      setDisplayList([]);
      unsubscribeProgramChanges(net, programID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, programID, status]);

  if (status !== NetStatus.Running) {
    return (
      <div className="h-full w-full justify-center items-center flex flex-col">
        <div className="relative z-0 flex flex-col items-center">
          <svg
            viewBox="0 0 200 200"
            className="absolute transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-80 h-80 -z-1"
          >
            <path
              fill="rgb(var(--surface-300))"
              d="M41.7,-52.4C52.9,-40.3,60.2,-26.1,67,-8.7C73.8,8.7,80.2,29.4,72.9,42.1C65.6,54.9,44.5,59.8,25.6,63.7C6.7,67.7,-10.1,70.7,-25.1,66.3C-40.1,62,-53.3,50.2,-61.3,35.7C-69.4,21.2,-72.4,3.9,-70.2,-13.1C-68.1,-30.1,-60.8,-47,-48.3,-58.9C-35.7,-70.9,-17.9,-77.9,-1.3,-76.3C15.2,-74.8,30.5,-64.6,41.7,-52.4Z"
              transform="translate(100 100)"
            />
          </svg>
          <IconMdiWarning className="text-6xl z-1" />
          <span className="z-2">Network Not Available</span>
        </div>
      </div>
    );
  }

  const SortIcon: React.FC<{
    sortColumn: SortColumn;
    target: SortColumn;
  }> = ({ sortColumn: column, target }) => {
    return column === target ? (
      <IconMdiChevronDown />
    ) : (
      <IconMdiUnfoldMoreHorizontal />
    );
  };

  return (
    <div>
      <div className="mb-2">
        <div className="mb-2 flex gap-2 items-center">
          <strong>Program Account Changes</strong>
          <small>(Validator Slot {validatorSlot})</small>
        </div>
        <div className="mb-2">
          <Button
            onClick={() => {
              createNewAccount(dispatch)
                .then((newKeypair) => {
                  const pubKey = newKeypair.publicKey.toString();
                  logger.info('renderer got new account', pubKey);

                  pinAccount(pubKey, false);
                  dispatch(setSelected(pubKey));
                  toast(
                    <div>
                      Watching new keypair: <br />
                      <InlinePK pk={pubKey} />
                    </div>
                  );
                  return newKeypair;
                })
                .catch(logger.error);
            }}
            className="mr-2"
            size="sm"
          >
            Create Account
          </Button>

          <WatchAccountButton pinAccount={pinAccount} />
        </div>
        <div className="mt-2">
          <span className="text-sm font-bold">Filter Programs</span>
          <div className="flex gap-2 text-sm flex-wrap w-full my-2">
            {Object.entries(KnownProgramID).map(([name, value]) => (
              <Chip
                key={name}
                onClick={() => setProgramID(value)}
                active={programID === value}
              >
                {name}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <span className="mb-2">
        <small className="ms-2 text-secondary">
          <span className="flex gap-2 items-center">
            Program:
            <EditableText
              type="text"
              value={programID}
              onSave={(val: string) => {
                const pastedID = val;
                if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                  unsubscribeProgramChanges(net, programID);
                  subscribeProgramChanges(net, programID, setValidatorSlot);
                  setProgramID(pastedID);
                } else {
                  toast.warn(`Invalid program ID: ${pastedID}`);
                }
              }}
            />
            <div className="flex-1" />
            <span className="font-bold">
              {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
            </span>
          </span>
        </small>
      </span>
      <div className="flex-1 block min-h-0 overflow-auto">
        {displayList.length > 0 ? (
          <table className={classes['account-view']}>
            <thead>
              <tr className="bg-surface-400">
                <th className="text-center">
                  {' '}
                  <IconMdiStarOutline className="inline-block" />
                </th>
                <th>Address</th>
                <th onClick={() => setSortColumn(SortColumn.MaxDelta)}>
                  Max Δ{' '}
                  <SortIcon
                    sortColumn={sortColumn}
                    target={SortColumn.MaxDelta}
                  />
                </th>
                <th onClick={() => setSortColumn(SortColumn.Sol)}>
                  SOL{' '}
                  <SortIcon sortColumn={sortColumn} target={SortColumn.Sol} />
                </th>
                <th onClick={() => setSortColumn(SortColumn.Count)}>
                  Count{' '}
                  <SortIcon sortColumn={sortColumn} target={SortColumn.Count} />
                </th>
              </tr>
            </thead>
            <tbody className="w-full">
              {displayList
                .slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
                .map((pubKey: string) => {
                  return (
                    <ProgramChange
                      selected={pubKey === selectAccounts.selectedAccount}
                      key={pubKey}
                      pubKey={pubKey}
                      net={net}
                      pinned={pinnedAccount[pubKey]}
                      pinAccount={pinAccount}
                    />
                  );
                })}
            </tbody>
          </table>
        ) : (
          <div>
            <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
            <small className="me-2">Scanning for program changes...</small>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgramChangeView;
