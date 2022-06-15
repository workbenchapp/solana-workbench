import {
  accountsActions,
  selectAccountsListState,
  setSelected,
} from '@/data/SelectedAccountsList/selectedAccountsState';
import {
  faFilter,
  faSortDesc,
  faSpinner,
  faUnsorted,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';
import EdiText from 'react-editext';
import OutsideClickHandler from 'react-outside-click-handler';
import { toast } from 'react-toastify';
import createNewAccount from '../data/accounts/account';
import { AccountInfo } from '../data/accounts/accountInfo';
import {
  BASE58_PUBKEY_REGEX,
  GetTopAccounts,
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
import InlinePK from './InlinePK';
import { ProgramChange } from './ProgramChange';
import WatchAccountButton from './WatchAccountButton';

const logger = window.electron.log;

export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;
export enum KnownProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

interface PinnedAccountMap {
  [pubKey: string]: boolean;
}

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

    const changes = GetTopAccounts(
      net,
      MAX_PROGRAM_CHANGES_DISPLAYED,
      sortFunction
    );

    // logger.info('GetTopAccounts', changes);
    changes.forEach((key: string) => {
      if (!(key in pinMap)) {
        showKeys.push(key);
      }
    });
    setPinnedAccount(pinMap);
    setDisplayList(showKeys);
  }, 666);

  const uniqueAccounts = displayList.length;
  const [filterDropdownShow, setFilterDropdownShow] = useState(false);
  const filterProgramIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);

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
    return <div>network not available</div>;
  }

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  const sortIcon = () => {};

  return (
    <div className="w-full p-3 flex flex-col">
      <div className="mb-2">
        <div className="mb-2">
          <small>
            <strong>Program Account Changes</strong>:
            <small>(Validator Slot {validatorSlot})</small>
          </small>
        </div>
        <div className="mb-2">
          <Dropdown>
            <OutsideClickHandler
              onOutsideClick={() => setFilterDropdownShow(false)}
              display="inline"
            >
              <DropdownButton
                size="sm"
                id="dropdown-basic-button"
                title={changeFilterDropdownTitle}
                onSelect={(s: string | null) => {
                  setFilterDropdownShow(false);
                  if (s) setProgramID(s as KnownProgramID);
                }}
                onClick={() => {
                  if (!filterDropdownShow) {
                    setFilterDropdownShow(true);
                  } else {
                    setFilterDropdownShow(false);
                  }
                }}
                className="ms-2 d-inline"
                variant="light"
                show={filterDropdownShow}
              >
                <div className="ms-1 p-1 border-bottom border-light">
                  <small>
                    <strong>Program ID</strong>
                  </small>
                </div>
                <Dropdown.Item eventKey="">
                  <small>System Program</small>
                </Dropdown.Item>
                <Dropdown.Item eventKey={KnownProgramID.TokenProgram}>
                  <small>Token Program</small>
                </Dropdown.Item>
                <Dropdown.Item eventKey={KnownProgramID.SerumDEXV3}>
                  <small>Serum DEX V3</small>
                </Dropdown.Item>
                <div className="p-2">
                  <EdiText
                    type="text"
                    value={programID}
                    onSave={(val: string) => {
                      const pastedID = val;
                      if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                        unsubscribeProgramChanges(net, programID);
                        subscribeProgramChanges(
                          net,
                          programID,
                          setValidatorSlot
                        );
                        setProgramID(pastedID);
                      } else {
                        toast.warn(`Invalid program ID: ${pastedID}`);
                      }
                      filterProgramIDRef.current.value = 'Custom';
                      filterProgramIDRef.current.blur();
                      setFilterDropdownShow(false);
                    }}
                  />
                </div>
              </DropdownButton>
            </OutsideClickHandler>
          </Dropdown>
        </div>
        <div>
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
        <span>
          <small className="ms-2 text-secondary">
            <span>
              Program:
              <code className="me-2">{programID}</code>
              {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
            </span>
          </small>
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {displayList.length > 0 ? (
          <table className="w-full h-full border-collapse overflow-auto">
            <thead>
              <tr className="bg-surface-400">
                <th>
                  {' '}
                  <IconMdiStarOutline />
                </th>
                <th>Address</th>
                <th onClick={() => setSortColumn(SortColumn.MaxDelta)}>
                  Max Δ{' '}
                  <FontAwesomeIcon
                    className="me-1"
                    icon={
                      sortColumn === SortColumn.MaxDelta
                        ? faSortDesc
                        : faUnsorted
                    }
                  />
                </th>
                <th onClick={() => setSortColumn(SortColumn.Sol)}>
                  SOL{' '}
                  <FontAwesomeIcon
                    className="me-1"
                    icon={
                      sortColumn === SortColumn.Sol ? faSortDesc : faUnsorted
                    }
                  />
                </th>
                <th onClick={() => setSortColumn(SortColumn.Count)}>
                  Count{' '}
                  <FontAwesomeIcon
                    className="me-1"
                    icon={
                      sortColumn === SortColumn.Count ? faSortDesc : faUnsorted
                    }
                  />
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
