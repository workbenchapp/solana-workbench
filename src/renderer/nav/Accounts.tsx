/* eslint-disable no-console */
/* eslint-disable no-case-declarations */
import { faKey, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';

import AccountListView from 'renderer/components/AccountListView';
import AccountView from 'renderer/components/AccountView';
import InlinePK from 'renderer/components/InlinePK';
import LogView from '../components/LogView';
import ProgramChangeView from '../components/ProgramChangeView';

import {
  AccountsState,
  ACCOUNTS_NONE_KEY,
  BASE58_PUBKEY_REGEX,
  Net,
  NetStatus,
  WBAccount,
} from '../../types/types';

const LIVE_TAB_CHANGES = 'changes';
const LIVE_TAB_TXN_LOGS = 'logs';

function Accounts() {
  const dispatch = useDispatch();
  const accounts: AccountsState = useSelector(
    (state: RootState) => state.accounts
  );
  const validator = useSelector((state: RootState) => state.validator);
  const { net } = validator;
  const { rootKey, selectedAccount, listedAccounts } = accounts;
  const [addBtnClicked, setAddBtnClicked] = useState<boolean>(false);
  const [selectedLiveTab, setSelectedLiveTab] =
    useState<string>(LIVE_TAB_CHANGES);

  const attemptAccountAdd = (pubKey: string, initializing: boolean) => {
    if (initializing && pubKey === ACCOUNTS_NONE_KEY) {
      dispatch(accountsActions.shift());
    } else {
      // todo: excludes first (same) element, not generic to anywhere
      // in array but it'll do
      if (
        // accounts has an entry for the new (attempted) account ID already,
        // so we sum up the instances of that key, and it'll be 2 if it's
        // a duplicate of an existing one
        listedAccounts
          .map((a): number => (a.pubKey === pubKey ? 1 : 0))
          .reduce((a, b) => a + b, 0) === 1
      ) {
        dispatch(
          toastActions.push({
            msg: 'Account already imported',
            variant: 'warning',
          })
        );
        dispatch(accountsActions.shift());
        return;
      }
      if (pubKey.match(BASE58_PUBKEY_REGEX)) {
        window.electron.ipcRenderer.getAccount({
          net,
          pubKey,
        });
      } else {
        dispatch(
          toastActions.push({ msg: 'Invalid account ID', variant: 'warning' })
        );
        dispatch(accountsActions.shift());
      }
    }
  };

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      switch (method) {
        case 'accounts':
          dispatch(accountsActions.setAccounts(res.accounts));
          dispatch(accountsActions.setRootKey(res.rootKey));
          break;
        case 'get-account':
          const { pubKey, exists } = res.account;
          if (exists) {
            dispatch(accountsActions.unshift(res.account));
            dispatch(accountsActions.setSelected(pubKey));

            analytics('accountAddSuccess', { net: res.account.net });

            window.electron.ipcRenderer.importAccount({
              net: res.account.net,
              pubKey,
            });

            dispatch(
              toastActions.push({
                msg: 'Account imported',
                variant: 'sol-green',
              })
            );
          } else {
            dispatch(accountsActions.rm(pubKey));
            dispatch(
              toastActions.push({
                msg: `Account not found in ${res.account.net}`,
                variant: 'warning',
              })
            );
          }
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);

    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  useEffect(() => {
    window.electron.ipcRenderer.accounts({
      net,
    });
  }, [net]);

  const selectedAccountInfo: WBAccount | undefined = listedAccounts.find(
    (a) => selectedAccount === a.pubKey
  );

  const initializingAccount: boolean =
    listedAccounts.filter((a) => ACCOUNTS_NONE_KEY === a.pubKey).length > 0;

  let initView = (
    <>
      <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
      <small className="me-2">
        Generating seed wallets. This can take up to 30 seconds.
      </small>
    </>
  );

  if (net !== Net.Localhost) {
    initView = (
      <small className="me-2">
        No accounts found. Add some with &quot;Add Account&quot;.
      </small>
    );
  }

  let selectedLiveComponent = <LogView />;
  if (selectedLiveTab === LIVE_TAB_CHANGES) {
    selectedLiveComponent = (
      <ProgramChangeView
        accounts={listedAccounts}
        attemptAccountAdd={attemptAccountAdd}
      />
    );
  }

  let display = <></>;
  if (validator.status === NetStatus.Running) {
    display = (
      <>
        <div className="col-auto">
          <div className="sticky-top sticky-account-list">
            <div className="mb-3">
              <FontAwesomeIcon icon={faKey} />
              <span className="ms-1">
                <InlinePK pk={rootKey} />
              </span>
              <button
                type="button"
                className={`ms-2 btn rounded btn-block btn-sm no-box-shadow ${
                  addBtnClicked ? 'btn-primary-darker' : 'btn-primary'
                }`}
                onMouseDown={(
                  e: React.MouseEvent<HTMLButtonElement, MouseEvent>
                ): void => {
                  e.preventDefault();
                  setAddBtnClicked(true);
                  if (!initializingAccount) {
                    dispatch(accountsActions.init(undefined));
                  }
                }}
                onMouseUp={() => setAddBtnClicked(false)}
              >
                <FontAwesomeIcon className="text-white" icon={faPlus} />
                <span className="ms-1 text-white">Add Account</span>
              </button>
            </div>
            {listedAccounts.length > 0 || net !== Net.Localhost ? (
              <AccountListView attemptAccountAdd={attemptAccountAdd} />
            ) : (
              initView
            )}
          </div>
        </div>
        <div className="col">
          <div>
            <ul className="nav">
              <li
                className={`${
                  selectedAccount
                    ? 'border-bottom active'
                    : 'opacity-25 cursor-not-allowed'
                } ms-3 me-3 pt-1 pb-1 border-3 nav-item text-secondary nav-link-tab`}
              >
                <small>Account</small>
              </li>
              <li
                className={`${
                  !selectedAccountInfo && selectedLiveTab === LIVE_TAB_TXN_LOGS
                    ? 'border-bottom active'
                    : ''
                } ms-3 me-3 pt-1 pb-1 border-3 cursor-pointer nav-item text-secondary nav-link-tab`}
                onClick={() => {
                  dispatch(accountsActions.setSelected(''));
                  setSelectedLiveTab(LIVE_TAB_TXN_LOGS);
                }}
              >
                <small>Logs</small>
              </li>
              <li
                className={`${
                  !selectedAccountInfo && selectedLiveTab === LIVE_TAB_CHANGES
                    ? 'border-bottom active'
                    : ''
                } ms-3 me-3 pt-1 pb-1 border-3 cursor-pointer nav-item text-secondary nav-link-tab`}
                onClick={() => {
                  dispatch(accountsActions.setSelected(''));
                  setSelectedLiveTab(LIVE_TAB_CHANGES);
                }}
              >
                <small>Program Changes</small>
              </li>
            </ul>
          </div>
          <div className="m-2">
            {selectedAccountInfo ? (
              <AccountView account={selectedAccountInfo} />
            ) : (
              selectedLiveComponent
            )}
          </div>
        </div>
      </>
    );
  } else {
    display = (
      <p>
        No validator is running on this network. Use{' '}
        <NavLink to="/validator">Validator</NavLink> or run your own local test
        validator.
      </p>
    );
  }

  return <>{display}</>;
}

export default Accounts;
