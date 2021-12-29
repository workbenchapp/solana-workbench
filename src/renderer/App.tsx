/* eslint-disable no-console */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MemoryRouter as Router,
  Switch,
  Route,
  NavLink,
  useLocation,
} from 'react-router-dom';
import './App.scss';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import Tooltip from 'react-bootstrap/Tooltip';
import {
  faRunning,
  faTh,
  faCircle,
  faSpinner,
  faAnchor,
  faKey,
  faCopy,
  faTerminal,
  faPlus,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  cloneElement,
} from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import amplitude from 'amplitude-js';
import { debounce } from 'underscore';
import { v4 as uuidv4 } from 'uuid';

import {
  WBAccount,
  SolState,
  AccountsResponse,
  Net,
  GetAccountResponse,
} from '../types/types';

// dummy var value, could be undefined,
// but need to refactor for that
const NONE_KEY = 'none';
const RANDOMART_W_CH = 17;
const RANDOMART_H_CH = 10;
const TOAST_HEIGHT = 270;
const TOAST_WIDTH = TOAST_HEIGHT * (1.61 * 0.61);
const TOAST_BOTTOM_OFFSET = TOAST_HEIGHT / 3.8; // kinda random but looks good
const TOAST_HIDE_MS = 1200;
const TOAST_PAUSE_MS = 1000;
const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
const AMPLITUDE_KEY = 'f1cde3642f7e0f483afbb7ac15ae8277';
const AMPLITUDE_HEARTBEAT_INTERVAL = 3600000;

amplitude.getInstance().init(AMPLITUDE_KEY);
amplitude.getInstance().logEvent('open-app', {});
setInterval(() => {
  amplitude.getInstance().logEvent('heartbeat', {});
}, AMPLITUDE_HEARTBEAT_INTERVAL);

declare global {
  interface Window {
    electron?: any;
  }
}

const useInterval = (callback: any, delay: number) => {
  const savedCallback = useRef(() => {});

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    const tick = () => {
      savedCallback.current();
    };
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    return () => {};
  }, [delay]);
};

const Toast = (props: {
  msg: string;
  variant?: string;
  bottom?: number;

  // TODO: This is not a good solution
  // as it can interrupt animations in flight
  // by forcing a re-render
  rmToast?: () => void;
  hideAfter?: number;
}) => {
  const { msg, variant, bottom, rmToast, hideAfter } = props;
  const [left, setRefLeft] = useState(-300);
  const leftRef = useRef<number>(0);
  const beginTimeout = useRef<number>();
  const rmInterval = useRef<number>();
  const slideInterval = useRef<number>();
  const effectSetup = useRef<boolean>(false);

  const setLeft = (l: number) => {
    leftRef.current = l;
    setRefLeft(l);
  };

  useEffect(() => {
    if (!effectSetup.current) {
      beginTimeout.current = window.setTimeout(() => {
        setLeft(0);
      }, 100);
      if (hideAfter) {
        rmInterval.current = window.setTimeout(() => {
          window.clearTimeout(beginTimeout.current);
          window.clearTimeout(rmInterval.current);
          window.clearTimeout(slideInterval.current);
          if (rmToast) rmToast();
        }, hideAfter * 2 + TOAST_PAUSE_MS);
        slideInterval.current = window.setTimeout(() => {
          setLeft(-300);
        }, hideAfter + TOAST_PAUSE_MS);
      }
      effectSetup.current = true;
    }
  });
  return (
    <div style={{ minHeight: `${TOAST_HEIGHT}px` }}>
      <div
        style={{
          bottom: `${bottom}px`,
          transition: `${hideAfter}ms`,
          transitionTimingFunction: 'ease',
          left: `${left}px`,
          width: `${TOAST_WIDTH}px`,
        }}
        className="mb-3 pb-3 bg-white rounded shadow-sm fixed-bottom"
      >
        <div className={`toaster-header rounded-top-end bg-${variant}`}>
          &nbsp;
        </div>
        <div className="p-1 rounded-bottom-end">
          <small className="ms-3 text-muted">{msg}</small>
          <div className="rounded p-1 toaster-close float-end">
            <FontAwesomeIcon
              onClick={(e: React.MouseEvent<SVGSVGElement>) => {
                e.preventDefault();
                window.clearTimeout(beginTimeout.current);
                window.clearTimeout(rmInterval.current);
                window.clearTimeout(slideInterval.current);
                if (rmToast) rmToast();
              }}
              className="text-muted"
              size="lg"
              icon={faTimes}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Toast.defaultProps = {
  variant: 'success-lighter',
  bottom: 0,
  rmToast: () => {},
  hideAfter: TOAST_HIDE_MS,
};

const Nav = () => {
  const renderTooltip = (id: string, title: string) => {
    return (props: any) => {
      return (
        <Tooltip id={id} {...props}>
          {title}
        </Tooltip>
      );
    };
  };
  return (
    <div className="sticky-top">
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('run', 'Run')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          exact
          to="/"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon size="2x" icon={faRunning} />
          </div>
        </NavLink>
      </OverlayTrigger>
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('accounts', 'Accounts')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          to="/accounts"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon className="nav-icon" size="2x" icon={faTh} />
          </div>
        </NavLink>
      </OverlayTrigger>
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('anchor', 'Anchor IDL')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          to="/anchor"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon className="nav-icon" size="2x" icon={faAnchor} />
          </div>
        </NavLink>
      </OverlayTrigger>
    </div>
  );
};

const Run = () => {
  const [solStatus, setSolStatus] = useState({} as SolState);
  const [loading, setLoading] = useState(true);
  const [waitingForRun, setWaitingForRun] = useState(false);
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const fetchLogs = useCallback(() => {
    if (solStatus.running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: filterRef.current.value,
      });
    }
  }, [solStatus.running]);

  const triggerFetchLogs = debounce(fetchLogs, 800);

  const runValidator = () => {
    setWaitingForRun(true);
    window.electron.ipcRenderer.runValidator();
  };

  useInterval(window.electron.ipcRenderer.solState, 5000);
  useInterval(fetchLogs, 5000);
  useEffect(() => {
    const solStateListener = (arg: SolState) => {
      setSolStatus(arg);
      setLoading(false);
      if (arg.running) {
        setWaitingForRun(false);
      }
    };

    const validatorLogsListener = (logs: string) => {
      setValidatorLogs(logs);
    };
    window.electron.ipcRenderer.on('sol-state', solStateListener);
    window.electron.ipcRenderer.on('validator-logs', validatorLogsListener);
    window.electron.ipcRenderer.solState();
    fetchLogs();

    return () => {
      window.electron.ipcRenderer.removeListener('sol-state', solStateListener);
      window.electron.ipcRenderer.removeListener(
        'validator-logs',
        validatorLogsListener
      );
    };
  }, [fetchLogs]);

  let statusDisplay = (
    <div>
      <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
      {waitingForRun && (
        <small className="text-muted">
          Starting validator. This can take about a minute...
        </small>
      )}
    </div>
  );

  if (!loading && !waitingForRun) {
    if (solStatus.running) {
      statusDisplay = (
        <span className="badge bg-light text-dark">
          <FontAwesomeIcon className="sol-green me-1" icon={faCircle} />
          Validator Available
        </span>
      );
    } else {
      statusDisplay = (
        <div>
          <div>
            <span className="badge bg-light text-dark">
              <FontAwesomeIcon className="text-danger me-1" icon={faCircle} />
              Validator Not Running
            </span>
          </div>
          <div>
            <Button onClick={runValidator} className="mt-2" variant="dark">
              Run
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="row">
      <div className="col-sm-3">
        <div className="col">
          <div>{statusDisplay}</div>
        </div>
      </div>
      <div className="col-sm-9">
        <InputGroup size="sm">
          <FormControl
            ref={filterRef}
            placeholder="Filter logs"
            aria-label="Amount"
            onKeyDown={triggerFetchLogs}
          />
        </InputGroup>
        <pre className="mt-2 pre-scrollable">
          <code className={`${!solStatus.running ? 'text-muted' : ''}`}>
            {validatorLogs}
          </code>
        </pre>
      </div>
    </div>
  );
};

const prettifyPubkey = (pk = '') =>
  pk !== NONE_KEY
    ? `${pk.slice(0, 4)}…${pk.slice(pk.length - 4, pk.length)}`
    : '';

const Editable = (props: {
  outerHovered: boolean;
  outerSelected: boolean;
  value: string;
  setSelected: (s: string) => void;
  setHoveredItem: (s: string) => void;
  editingStarted: () => void;
  editingStopped: () => void;
  handleOutsideClick: (ref: any) => void;
  className?: string;
  inputClassName?: string;
  clearAllOnSelect?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) => {
  const {
    value,
    outerHovered,
    outerSelected,
    setSelected,
    setHoveredItem,
    editingStarted,
    editingStopped,
    className,
    inputClassName,
    handleOutsideClick,
    clearAllOnSelect,
    autoFocus,
    placeholder,
  } = props;
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(autoFocus);
  const valRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  useEffect(() => {
    if (autoFocus) {
      valRef.current.focus();
    }
  });

  let formValue = value;
  if (clearAllOnSelect) {
    formValue = '';
  }

  let classes = `${className} border rounded`;
  if (outerHovered) {
    classes = `${classes} bg-white`;
  } else if (!outerSelected) {
    classes = `${classes} border-white`;
  }
  if (hovered && !editing) {
    classes = `${classes} border-soft-dark`;
  }
  if (editing) {
    classes = `${classes} border-white`;
  }
  if (outerSelected && !outerHovered) {
    classes = `${classes} border-selected`;
  }

  const completeEdit = () => {
    if (editing) {
      setHovered(false);
      setEditing(false);
      editingStopped();
      handleOutsideClick(valRef);
    }
  };

  return (
    <OutsideClickHandler onOutsideClick={completeEdit}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setSelected('');
          setEditing(true);
          setHoveredItem('');
          editingStarted();
        }}
      >
        <InputGroup
          size="sm"
          className={`${inputClassName} ${
            outerSelected && !hovered && !outerHovered && 'input-selected'
          }`}
        >
          <FormControl
            className={classes}
            ref={valRef}
            defaultValue={formValue}
            placeholder={editing ? placeholder : ''}
            onKeyPress={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                completeEdit();
              }
            }}
          />
        </InputGroup>
      </div>
    </OutsideClickHandler>
  );
};

Editable.defaultProps = {
  className: '',
  inputClassName: 'input-clean',
  clearAllOnSelect: false,
  autoFocus: false,
  placeholder: '',
};

const CopyIcon = (props: { writeValue: string }) => {
  const { writeValue } = props;
  const [copyTooltipText, setCopyTooltipText] = useState<string | undefined>(
    'Copy'
  );

  const renderCopyTooltip = (id: string) => {
    return (ttProps: any) => {
      return (
        <Tooltip className="tooltip-secondary" id={id} {...ttProps}>
          <div>{copyTooltipText}</div>
        </Tooltip>
      );
    };
  };

  return (
    <OverlayTrigger
      placement="top"
      delay={{ show: 250, hide: 0 }}
      overlay={renderCopyTooltip('rootKey')}
    >
      <span>
        <FontAwesomeIcon
          className="ms-2 text-secondary cursor-pointer"
          icon={faCopy}
          onClick={(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _: React.MouseEvent<SVGSVGElement, MouseEvent> | undefined
          ) => {
            setCopyTooltipText('Copied!');
            navigator.clipboard.writeText(writeValue);
          }}
          onMouseLeave={(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _: React.MouseEvent<SVGSVGElement, MouseEvent> | undefined
          ) => window.setTimeout(() => setCopyTooltipText('Copy'), 500)}
        />
      </span>
    </OverlayTrigger>
  );
};

const InlinePK = (props: { pk: string }) => {
  const { pk } = props;
  return (
    <span className="align-middle ms-2">
      <code className="p-1">{prettifyPubkey(pk)}</code>
      <CopyIcon writeValue={pk} />
    </span>
  );
};

const RandomArt = (props: { art: string }) => {
  let { art } = props;
  if (art === '') {
    art = `${' '.repeat(RANDOMART_W_CH)}\n`.repeat(RANDOMART_H_CH);
  }
  return (
    <pre className="border inline-key mb-0 align-middle">
      <code>
        <strong>{art}</strong>
      </code>
    </pre>
  );
};

const AccountListItem = (props: {
  account: WBAccount;
  hovered: boolean;
  selected: boolean;
  edited: boolean;
  initializing?: boolean;
  setHoveredItem: (s: string) => void;
  setSelected: (s: string) => void;
  setEdited: (s: string) => void;
  attemptAccountAdd: (ref: any) => void;
  queriedAccount?: GetAccountResponse;
}) => {
  const {
    account,
    hovered,
    edited,
    selected,
    setHoveredItem,
    setSelected,
    setEdited,
    initializing,
    attemptAccountAdd,
    queriedAccount,
  } = props;
  return (
    <div
      onClick={() => setSelected(account.pubKey)}
      className={`p-1 account-list-item ${
        selected
          ? 'account-list-item-selected border-top border-bottom border-primary'
          : 'border-top border-bottom'
      } ${hovered && !selected && 'bg-light'} ${
        edited && 'border-top border-bottom border-primary'
      } ${queriedAccount && 'border-solgreen-shadow'}`}
      key={account.pubKey}
      onMouseEnter={() => setHoveredItem(account.pubKey)}
      onMouseLeave={() => setHoveredItem('')}
    >
      <div className="row flex-nowrap">
        <div className="col">
          {account.pubKey === NONE_KEY ? (
            <Editable
              outerSelected={selected}
              outerHovered={hovered}
              setSelected={setSelected}
              setHoveredItem={setHoveredItem}
              value={account.pubKey}
              editingStarted={() => setEdited(account.pubKey)}
              editingStopped={() => setEdited('')}
              inputClassName={`input-clean-code ${
                initializing && 'input-no-max'
              }`}
              handleOutsideClick={(ref) => attemptAccountAdd(ref)}
              autoFocus={edited}
              clearAllOnSelect={initializing}
              placeholder="Paste in an account ID"
            />
          ) : (
            <InlinePK pk={account.pubKey} />
          )}
        </div>
        {!initializing && (
          <div className="col-auto">
            <small className="align-middle">
              <Editable
                outerSelected={selected}
                outerHovered={hovered}
                setSelected={setSelected}
                setHoveredItem={setHoveredItem}
                value={account.humanName || ''}
                editingStarted={() => setEdited(account.pubKey)}
                editingStopped={() => setEdited('')}
                handleOutsideClick={(ref) => {
                  window.electron.ipcRenderer.updateAccountName({
                    pubKey: account.pubKey,
                    humanName: ref.current.value,
                  });
                }}
                placeholder="Write a description"
              />
            </small>
          </div>
        )}
        {!initializing && (
          <div className="col-auto">
            <RandomArt art={account.art || ''} />
          </div>
        )}
      </div>
    </div>
  );
};

AccountListItem.defaultProps = {
  initializing: false,
  queriedAccount: undefined,
};

const Accounts = (props: {
  net: Net;
  pushToast: (toast: JSX.Element) => void;
}) => {
  const { net, pushToast } = props;
  const [accounts, setAccountsRef] = useState<WBAccount[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [hoveredItem, setHoveredItem] = useState<string>('');
  const [rootKey, setRootKey] = useState<string>('');
  const [edited, setEdited] = useState<string>('');
  const [addBtnClicked, setAddBtnClicked] = useState<boolean>(false);
  const [queriedAccount, setQueriedAccount] = useState<GetAccountResponse>();
  const effectSetup = useRef<boolean>();
  const accountsRef = useRef<WBAccount[]>([]);

  const setAccounts = (accs: WBAccount[]) => {
    accountsRef.current = accs;
    setAccountsRef(accs);
  };

  const addAccount = () => {
    const accs = [...accounts];
    if (accs.some((a) => a.pubKey === NONE_KEY)) {
      return;
    }
    accs.splice(0, 0, {
      pubKey: NONE_KEY,
      humanName: '',
    });
    setAccounts(accs);
    setSelected('');
    setHoveredItem('');
    setEdited(NONE_KEY);
  };

  const rmAccount = (account: WBAccount) => {
    let accs = [...accounts];
    accs = accs.filter((a) => a.pubKey !== account.pubKey);
    setAccounts(accs);
  };

  const shiftAccount = () => {
    const accs = [...accounts];
    accs.shift();
    setAccounts(accs);
  };

  useEffect(() => {
    const updateAccount = (account: WBAccount) => {
      const accs = [...accountsRef.current];
      const idx = accs.findIndex((a) => {
        return a.pubKey === account.pubKey;
      });
      accs[idx] = account;
      setAccounts(accs);
    };

    const accountsListener = (data: AccountsResponse) => {
      setRootKey(data.rootKey);
      setAccounts(data.accounts);
    };

    const getAccountListener = (resp: GetAccountResponse) => {
      // todo: this doesn't actually work, need more ref trick?
      setQueriedAccount(resp);

      if (resp.account?.solAccount) {
        updateAccount(resp.account);
        setSelected(resp.account.pubKey);
        pushToast(<Toast msg="Account imported" variant="sol-green" />);
      } else {
        setAccounts(
          accountsRef.current.filter(
            (a: WBAccount) => a.pubKey !== resp.account?.pubKey
          )
        );
        pushToast(
          <Toast msg={`Account not found in ${net}`} variant="warning" />
        );
      }
    };

    if (!effectSetup.current) {
      window.electron.ipcRenderer.once('accounts', accountsListener);
      window.electron.ipcRenderer.on('get-account', getAccountListener);
      window.electron.ipcRenderer.accounts({ net });
      effectSetup.current = true;
    }
    return () => {
      window.electron.ipcRenderer.removeListener('accounts', accountsListener);
      window.electron.ipcRenderer.removeListener(
        'get-account',
        getAccountListener
      );
    };
  }, [accounts, net, pushToast]);

  const selectedAccount: WBAccount | undefined = accounts.find(
    (a) => selected === a.pubKey
  );

  const initializingAccount: boolean =
    accounts.filter((a) => NONE_KEY === a.pubKey).length > 0;

  const attemptAccountAdd = (
    ref: any,
    account: WBAccount,
    initializing: boolean
  ) => {
    if (initializing && ref.current.value === '') {
      rmAccount(account);
    } else {
      account.pubKey = ref.current.value;
      console.log({ dupe: account.pubKey, dupeAccts: accounts });

      // todo: excludes first (same) element, not generic to anywhere
      // in array but it'll do
      if (
        // accounts has an entry for the new (attempted) account ID already,
        // so we sum up the instances of that key, and it'll be 2 if it's
        // a duplicate of an existing one
        accounts
          .map((a): number => (a.pubKey === account.pubKey ? 1 : 0))
          .reduce((a, b) => a + b, 0) === 2
      ) {
        pushToast(<Toast msg="Account already imported" variant="warning" />);
        shiftAccount();
        return;
      }
      if (account.pubKey.match(BASE58_PUBKEY_REGEX)) {
        window.electron.ipcRenderer.getAccount({
          net,
          pk: account.pubKey,
        });
      } else {
        pushToast(<Toast msg="Invalid account ID" variant="warning" />);
        rmAccount({ pubKey: account.pubKey });
      }
    }
  };

  return (
    <>
      <div className="col-auto">
        <div className="mb-3">
          <FontAwesomeIcon icon={faKey} />
          <InlinePK pk={rootKey} />
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
                addAccount();
              }
            }}
            onMouseUp={() => setAddBtnClicked(false)}
          >
            <FontAwesomeIcon className="text-white" icon={faPlus} />
            <span className="ms-1 text-white">Add Account</span>
          </button>
        </div>
        {accounts.length > 0 ? (
          accounts.map((account: WBAccount) => {
            const initializing = account.pubKey === NONE_KEY;
            return (
              <AccountListItem
                key={`pubKey=${account.pubKey},initializing=${initializing}`}
                account={account}
                hovered={account.pubKey === hoveredItem}
                selected={account.pubKey === selected}
                edited={account.pubKey === edited}
                initializing={initializing}
                setHoveredItem={setHoveredItem}
                setEdited={setEdited}
                setSelected={setSelected}
                queriedAccount={queriedAccount}
                attemptAccountAdd={(ref) =>
                  attemptAccountAdd(ref, account, initializing)
                }
              />
            );
          })
        ) : (
          <>
            <span className="me-2">Generating seed wallets...</span>
            <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
          </>
        )}
      </div>
      <div className="col">
        {selectedAccount && (
          <>
            <div className="row">
              <div className="col-auto">
                <div>
                  <h6 className="ms-1">{selectedAccount.humanName}</h6>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <div className="row">
                  <div className="col-auto">
                    <table className="table table-borderless table-sm">
                      <tbody>
                        <tr>
                          <td>
                            <small className="text-muted">Pubkey</small>
                          </td>
                          <td>
                            <small>
                              <InlinePK pk={selectedAccount.pubKey} />
                            </small>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <small className="text-muted">SOL</small>
                          </td>
                          <td>
                            <small>{selectedAccount.solAmount}</small>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <small className="text-muted">Executable</small>
                          </td>
                          <td>
                            {selectedAccount.solAccount?.executable ? (
                              <div>
                                <FontAwesomeIcon
                                  className="border-success rounded p-1 executable-icon"
                                  icon={faTerminal}
                                />
                                <small className="ms-1 mb-1">Yes</small>
                              </div>
                            ) : (
                              <small className="fst-italic fw-light text-muted">
                                No
                              </small>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-auto">
                    <RandomArt art={selectedAccount.art || ''} />
                  </div>
                </div>
                <div>
                  <small className="text-muted">Data</small>
                </div>
                <div>
                  <pre>
                    <code>{selectedAccount.hexDump}</code>
                  </pre>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const Anchor = () => {
  const programIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const [idl, setIDL] = useState<any>({});

  const fetchIDL = () => {
    window.electron.ipcRenderer.once('fetch-anchor-idl', (fetchedIDL: any) => {
      setIDL(fetchedIDL);
    });

    window.electron.ipcRenderer.fetchAnchorIDL({
      programID: programIDRef.current.value,
    });
  };

  return (
    <div className="row">
      <div className="row">
        <div className="col-sm-5">
          <InputGroup size="sm" className="mb-2 mt-1">
            <InputGroup.Text>Program ID</InputGroup.Text>
            <FormControl
              style={{ fontFamily: 'Consolas, monospace', fontWeight: 500 }}
              aria-label="Program ID"
              ref={programIDRef}
              onKeyUp={fetchIDL}
            />
          </InputGroup>
        </div>
      </div>
      <div className="row">
        {idl.instructions ? (
          idl.instructions.map((instruction: any) => {
            return (
              <div className="card col-5 m-1">
                <h6 className="card-title p-1">
                  <code>{instruction.name}</code>
                </h6>
                <div className="row">
                  <div className="col">
                    <ul className="list-group list-group-flush">
                      <li className="bg-light list-group-item">Args</li>
                      {instruction.args.map((arg: any) => {
                        return (
                          <li className="list-group-item">
                            {arg.name}
                            <span className="ms-2 badge bg-secondary">
                              {arg.type.toString()}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="col">
                    <ul className="list-group list-group-flush">
                      <li className="bg-light list-group-item">Accounts</li>
                      {instruction.accounts.map((account: any) => {
                        return (
                          <li className="list-group-item">{account.name}</li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <small className="text-muted">
            e.g.: <code>GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv</code>
          </small>
        )}
      </div>
    </div>
  );
};

const Header = () => {
  const location = useLocation();
  const routes: Record<string, string> = {
    '/': 'Validator',
    '/accounts': 'Accounts',
    '/anchor': 'Anchor',
  };
  return <strong>{routes[location.pathname]}</strong>;
};

export default function App() {
  const [net, setNet] = useState(Net.Localhost);
  const [toasts, setActiveToasts] = useState<JSX.Element[]>([]);

  const rmToast = (key: React.Key | null) => {
    const newToasts = [...toasts];
    newToasts.filter((t) => t.key !== key);
    setActiveToasts(newToasts);
  };

  const pushToast = (toast: JSX.Element) => {
    const newToasts = [...toasts];
    let newToast = toast;

    // normally bad but we'll allow it
    // b/c short lived
    const key = uuidv4();
    newToast = cloneElement(toast, {
      key,
      rmToast: () => rmToast(key),
      bottom: TOAST_BOTTOM_OFFSET * newToasts.length + 1,
    });
    newToasts.push(newToast);
    setActiveToasts(newToasts);
  };

  const netDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    setNet(Net[target.innerText as keyof typeof Net]);
  };

  return (
    <Router>
      <Switch>
        <div className="row flex-nowrap g-0">
          <div className="col-auto mt-2">
            <Nav />
            {toasts}
          </div>
          <div className="col-sm-10 mt-2 ms-4">
            <div className="row bg-white sticky-top mb-2">
              <div>
                <Header />
                <DropdownButton
                  size="sm"
                  id="dropdown-basic-button"
                  title={net}
                  onClick={netDropdownClick}
                  className="float-end"
                  variant="light"
                >
                  <Dropdown.Item href="#">{Net.Localhost}</Dropdown.Item>
                  <Dropdown.Item href="#">{Net.Dev}</Dropdown.Item>
                  <Dropdown.Item href="#">{Net.Test}</Dropdown.Item>
                  <Dropdown.Item href="#">{Net.MainnetBeta}</Dropdown.Item>
                </DropdownButton>
              </div>
            </div>
            <div className="row flex-nowrap">
              <Route exact path="/">
                <Run />
              </Route>
              <Route path="/accounts">
                <Accounts net={net} pushToast={pushToast} />
              </Route>
              <Route path="/anchor">
                <Anchor />
              </Route>
            </div>
          </div>
        </div>
      </Switch>
    </Router>
  );
}
