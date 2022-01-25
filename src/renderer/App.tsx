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
  faBook,
  faTh,
  faCircle,
  faSpinner,
  faAnchor,
  faKey,
  faCopy,
  faTerminal,
  faPlus,
  faTimes,
  faArrowLeft,
  faEllipsisH,
  faTrash,
  faNetworkWired,
  faSortAmountDown,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  cloneElement,
  MutableRefObject,
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
  netToURL,
  ProgramAccountChange,
  ImportedAccountMap,
  ProgramChangeResponse,
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
const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const AMPLITUDE_KEY = 'f1cde3642f7e0f483afbb7ac15ae8277';
const AMPLITUDE_HEARTBEAT_INTERVAL = 3600000;
const MAX_PROGRAM_CHANGES_DISPLAYED = 20;

amplitude.getInstance().init(AMPLITUDE_KEY);

const analytics = (event: string, metadata: any) => {
  if (process.env.NODE_ENV !== 'development' /* and user has not opted out */) {
    amplitude.getInstance().logEvent(event, metadata);
  }
};
analytics('openApp', {});
setInterval(() => {
  analytics('heartbeat', {});
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
  msg: string | JSX.Element;
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
    <div className="sticky-top sticky-nav">
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('accounts', 'Accounts')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          exact
          to="/"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon size="2x" icon={faTh} />
          </div>
        </NavLink>
      </OverlayTrigger>
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('logs', 'Validator Logs')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          exact
          to="/validator"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon size="2x" icon={faBook} />
          </div>
        </NavLink>
      </OverlayTrigger>
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('anchor', 'Anchor')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          to="/anchor"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon size="2x" icon={faAnchor} />
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
    window.electron.ipcRenderer.solState({
      net: Net.Localhost,
    });
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
  value: string;
  editingStarted: (ref: MutableRefObject<HTMLInputElement>) => void;
  setSelected?: (s: string) => void;
  setHoveredItem?: (s: string) => void;
  editingStopped?: () => void;
  handleOutsideClick?: (ref: MutableRefObject<HTMLInputElement>) => void;
  outerHovered?: boolean;
  outerSelected?: boolean;
  className?: string;
  inputClassName?: string;
  clearAllOnSelect?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  onPaste?: (e: any, ref: any) => void;
  onKeyDown?: (e: any, ref: any) => void;
  onBlur?: (e: any, ref: any) => void;
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
    onPaste,
    onKeyDown,
    onBlur,
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
      if (editingStopped) editingStopped();
      if (handleOutsideClick) handleOutsideClick(valRef);
    }
  };

  return (
    <OutsideClickHandler onOutsideClick={completeEdit}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (setSelected) setSelected('');
          setEditing(true);
          if (setHoveredItem) setHoveredItem('');
          if (editingStarted) editingStarted(valRef);
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
            onKeyDown={(e) => {
              if (onKeyDown) onKeyDown(e, valRef);
            }}
            onPaste={(e) => {
              if (onPaste) onPaste(e, valRef);
            }}
            onBlur={(e) => {
              if (onBlur) onBlur(e, valRef);
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
  outerHovered: false,
  outerSelected: false,
  setSelected: () => {},
  setHoveredItem: () => {},
  editingStopped: () => {},
  handleOutsideClick: () => {},
  onPaste: () => {},
  onKeyDown: () => {},
  onBlur: () => {},
};

const CopyIcon = (props: { writeValue: string }) => {
  const { writeValue } = props;
  const [copyTooltipText, setCopyTooltipText] = useState<string | undefined>(
    'Copy'
  );

  const renderCopyTooltip = (id: string) => {
    return (ttProps: any) => {
      return (
        <Tooltip id={id} {...ttProps}>
          <div>{copyTooltipText}</div>
        </Tooltip>
      );
    };
  };

  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 250, hide: 0 }}
      overlay={renderCopyTooltip('rootKey')}
    >
      <span className="p-1 icon rounded">
        <FontAwesomeIcon
          className="cursor-pointer"
          icon={faCopy}
          onClick={(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            e: React.MouseEvent<SVGSVGElement, MouseEvent>
          ) => {
            e.stopPropagation();
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

const InlinePK = (props: { pk: string; className?: string }) => {
  const { pk, className } = props;
  return (
    <span className={className}>
      <code>{prettifyPubkey(pk)}</code>
      <CopyIcon writeValue={pk} />
    </span>
  );
};

InlinePK.defaultProps = {
  className: '',
};

const RandomArt = (props: { art: string; className?: string }) => {
  let { art } = props;
  const { className } = props;
  if (art === '') {
    art = `${' '.repeat(RANDOMART_W_CH)}\n`.repeat(RANDOMART_H_CH);
  }
  return (
    <pre className={`border text-secondary inline-key mb-0 ${className}`}>
      <code>{art}</code>
    </pre>
  );
};

RandomArt.defaultProps = {
  className: '',
};

const AccountListItem = (props: {
  net: Net;
  account: WBAccount;
  hovered: boolean;
  selected: boolean;
  edited: boolean;
  initializing: boolean;
  setHoveredItem: (s: string) => void;
  setSelected: (s: string) => void;
  setEdited: (s: string) => void;
  rmAccount: (s: string) => void;
  attemptAccountAdd: (pubKey: string, initializing: boolean) => void;
  queriedAccount?: GetAccountResponse;
}) => {
  const {
    net,
    account,
    hovered,
    edited,
    selected,
    setHoveredItem,
    setSelected,
    setEdited,
    rmAccount,
    initializing,
    attemptAccountAdd,
    queriedAccount,
  } = props;

  type EllipsisToggleProps = {
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  };

  const EllipsisToggle = React.forwardRef<HTMLDivElement>(
    // eslint-disable-next-line react/prop-types
    (toggleProps: EllipsisToggleProps, ref) => {
      const { onClick, children } = toggleProps;
      return (
        <div
          ref={ref}
          onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClick) onClick(e);
          }}
        >
          <div className="ps-2 pe-2 icon rounded">{children}</div>
        </div>
      );
    }
  );

  type EllipsisMenuProps = {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    labeledBy?: string;
  };

  const EllipsisMenu = React.forwardRef<HTMLDivElement>(
    // eslint-disable-next-line react/prop-types
    (toggleProps: EllipsisMenuProps, ref) => {
      const { children, style, className } = toggleProps;
      return (
        <div style={style} className={className} ref={ref}>
          {children}
        </div>
      );
    }
  );

  return (
    <div
      onClick={() => {
        analytics('selectAccount', { net });
        setSelected(account.pubKey);
      }}
      className={`p-1 account-list-item ${
        selected
          ? 'account-list-item-selected border-top border-bottom border-primary'
          : 'border-top border-bottom'
      } ${hovered && !selected && 'bg-xlight'} ${
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
              handleOutsideClick={(ref) => {
                let pubKey = ref.current.value;
                if (pubKey === '') {
                  pubKey = NONE_KEY;
                }
                attemptAccountAdd(pubKey, initializing);
              }}
              autoFocus={edited}
              clearAllOnSelect={initializing}
              placeholder="Paste in an account ID"
            />
          ) : (
            <span>
              <RandomArt className="float-start me-1" art={account.art || ''} />
              <InlinePK pk={account.pubKey} />
            </span>
          )}
        </div>
        {!initializing && (
          <>
            <div className="col-auto">
              <small>
                <Editable
                  outerSelected={selected}
                  outerHovered={hovered}
                  setSelected={setSelected}
                  setHoveredItem={setHoveredItem}
                  value={account.humanName || ''}
                  editingStarted={() => setEdited(account.pubKey)}
                  editingStopped={() => setEdited('')}
                  handleOutsideClick={(ref) => {
                    analytics('updateAccountName', {});
                    window.electron.ipcRenderer.updateAccountName({
                      net,
                      pubKey: account.pubKey,
                      humanName: ref.current.value,
                    });
                  }}
                  placeholder="Write a description"
                />
              </small>
            </div>
            <div className="col-auto">
              <Dropdown>
                <Dropdown.Toggle as={EllipsisToggle}>
                  <FontAwesomeIcon size="sm" icon={faEllipsisH} />
                </Dropdown.Toggle>
                <Dropdown.Menu as={EllipsisMenu}>
                  <Dropdown.Item
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.electron.ipcRenderer.deleteAccount({
                        pubKey: account.pubKey,
                      });
                      rmAccount(account.pubKey);
                    }}
                  >
                    <small className="text-danger">
                      <FontAwesomeIcon
                        className="text-danger me-1"
                        icon={faTrash}
                      />
                      Delete
                    </small>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

AccountListItem.defaultProps = {
  queriedAccount: undefined,
};

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

const ProgramChange = (props: {
  pubKey: string;
  count: number;
  solAmount: number;
  maxDelta: number;
  attemptAccountAdd: (pk: string, b: boolean) => void;
  importedAccounts: ImportedAccountMap;
}) => {
  const {
    count,
    pubKey,
    attemptAccountAdd,
    importedAccounts,
    solAmount,
    maxDelta,
  } = props;
  const imported = pubKey in importedAccounts;
  const [importing, setImporting] = useState(false);
  const formatSolAmount = (amt: number): string => {
    if (Math.abs(amt) < 0.01) {
      return '<0.01';
    }
    return Math.abs(amt).toFixed(2);
  };
  return (
    <>
      <td>
        <span
          className={`${
            imported ? 'cursor-not-allowed' : 'cursor-pointer'
          } pt-1 pb-1 ps-2 pe-2 icon rounded`}
        >
          <FontAwesomeIcon
            onClick={() => {
              if (!imported && !importing) {
                setImporting(true);
                attemptAccountAdd(pubKey, false);
              }
            }}
            icon={faArrowLeft}
            size="1x"
          />
        </span>
        <InlinePK pk={pubKey} />
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">Max Δ</small>
          <small className="ms-2">{formatSolAmount(maxDelta)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">SOL</small>
          <small className="ms-2">{formatSolAmount(solAmount)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 badge bg-secondary rounded-pill">{count}</span>
      </td>
      <td>
        {importing && (
          <FontAwesomeIcon className="ms-2 fa-spin" icon={faSpinner} />
        )}
      </td>
    </>
  );
};

const ProgramChangeView = (props: {
  net: Net;
  accounts: WBAccount[];
  attemptAccountAdd: (pubKey: string, initializing: boolean) => void;
  pushToast: (toast: JSX.Element) => void;
}) => {
  const { net, accounts, attemptAccountAdd, pushToast } = props;
  const [changes, setChangesRef] = useState<ProgramAccountChange[]>([]);
  const changesRef = useRef<ProgramAccountChange[]>([]);
  const setChanges = (c: ProgramAccountChange[]) => {
    changesRef.current = c;
    setChangesRef(c);
  };
  const [uniqueAccounts, setUniqueAccountsRef] = useState(0);
  const uniqueAccountsRef = useRef(0);
  const setUniqueAccounts = (ua: number) => {
    uniqueAccountsRef.current = ua;
    setUniqueAccountsRef(ua);
  };
  const netRef = useRef<Net | undefined>();
  const [paused, setPausedRef] = useState(false);
  const pausedRef = useRef(false);
  const setPaused = (p: boolean) => {
    pausedRef.current = p;
    setPausedRef(p);
  };
  const pausedTimeoutRef = useRef(0);

  const [programID, setProgramIDRef] = useState('System Program');
  const programIDRef = useRef('');
  const setProgramID = (pid: string) => {
    programIDRef.current = pid;
    setProgramIDRef(pid);
  };

  const importedAccounts: ImportedAccountMap = {};
  accounts.forEach((a) => {
    importedAccounts[a.pubKey] = true;
  });

  const [filterDropdownShow, setFilterDropdownShow] = useState(false);

  useEffect(() => {
    const changeListener = (resp: ProgramChangeResponse) => {
      if (resp.net === net && !pausedRef.current) {
        setChanges(resp.changes);
        setUniqueAccounts(resp.uniqueAccounts);
      }
    };

    const unsubscribe = () => {
      window.electron.ipcRenderer.unsubscribeProgramChanges({
        net: netRef.current,
      });

      window.electron.ipcRenderer.removeAllListeners('program-changes');
    };

    const unsubscribeListener = () => {
      setChanges([]);
    };

    if (netRef.current !== net) {
      if (netRef.current) unsubscribe();
      window.addEventListener('beforeunload', unsubscribe);
      window.electron.ipcRenderer.on('program-changes', changeListener);
      window.electron.ipcRenderer.on(
        'unsubscribe-program-changes',
        unsubscribeListener
      );
      window.electron.ipcRenderer.subscribeProgramChanges({
        net,
        programID: programIDRef.current,
      });
      netRef.current = net;
    }

    return () => {
      if (netRef.current !== net) {
        window.electron.ipcRenderer.removeListener(
          'program-changes',
          changeListener
        );
        window.electron.ipcRenderer.removeListener(
          'unsubscribe-program-changes',
          unsubscribeListener
        );
      }
    };
  }, [net]);

  const changeSortDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faSortAmountDown} />
      <span>Sort</span>
    </>
  );
  const changeSortDropdownSelect = () => {};

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  const pause = () => {
    if (pausedTimeoutRef.current === 0) {
      pausedTimeoutRef.current = window.setTimeout(() => {
        setPaused(true);
        pausedTimeoutRef.current = 0;
      }, 250);
    }
  };
  const unpause = () => {
    if (pausedTimeoutRef.current !== 0) {
      window.clearTimeout(pausedTimeoutRef.current);
      pausedTimeoutRef.current = 0;
    }
    setPaused(false);
  };

  return (
    <div>
      <div className="mb-2">
        <Dropdown>
          <DropdownButton
            size="sm"
            id="dropdown-basic-button"
            title={changeSortDropdownTitle}
            onSelect={changeSortDropdownSelect}
            className="d-inline"
            variant="light"
          >
            <Dropdown.Item eventKey="amountDelta" href="#">
              <small>Max SOL Change</small>
            </Dropdown.Item>
          </DropdownButton>
          <OutsideClickHandler
            onOutsideClick={() => setFilterDropdownShow(false)}
            display="inline"
          >
            <DropdownButton
              size="sm"
              id="dropdown-basic-button"
              title={changeFilterDropdownTitle}
              onSelect={(s: string | null) => {
                console.log(s);
                setFilterDropdownShow(false);
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
              <Dropdown.Item eventKey="program-id-system">
                <small>System Program</small>
              </Dropdown.Item>
              <Dropdown.Item eventKey="program-id-token">
                <small>Token Program</small>
              </Dropdown.Item>
              <Dropdown.Item eventKey="program-id-serum">
                <small>Serum DEX</small>
              </Dropdown.Item>
              <div className="p-2">
                <Editable
                  value="Custom"
                  editingStarted={(ref) => {
                    ref.current.value = '';
                  }}
                  placeholder="Paste Program ID"
                  onKeyDown={(e, ref) => {
                    if (!(e.code === 'MetaRight' || e.code === 'KeyV')) {
                      pushToast(
                        <Toast
                          msg="Must paste in valid program ID"
                          variant="warning"
                        />
                      );
                      ref.current.value = 'Custom';
                      ref.current.blur();
                      setFilterDropdownShow(false);
                    }
                  }}
                  onPaste={(e, ref) => {
                    const pastedID = e.clipboardData.getData('Text');
                    if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                      setProgramID(pastedID);
                    } else {
                      pushToast(
                        <Toast
                          msg={
                            <div className="ms-3">
                              Invalid program ID: <code>{pastedID}</code>
                            </div>
                          }
                          variant="warning"
                        />
                      );
                    }
                    ref.current.value = 'Custom';
                    ref.current.blur();
                    setFilterDropdownShow(false);
                  }}
                  onBlur={(_e, ref) => {
                    ref.current.value = 'Custom';
                  }}
                />
              </div>
            </DropdownButton>
          </OutsideClickHandler>
        </Dropdown>
        <span>
          <small className="ms-2 text-secondary">
            {paused ? (
              'Paused'
            ) : (
              <span>
                <code className="me-2">{programID}</code>
                {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
              </span>
            )}
          </small>
        </span>
      </div>
      <div
        onMouseOver={pause}
        onMouseLeave={unpause}
        onFocus={pause}
        onBlur={unpause}
      >
        {changes.length > 0 ? (
          <table className="table table-sm">
            <tbody>
              {changes
                .slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
                .map((change: ProgramAccountChange) => {
                  const { pubKey } = change;
                  return (
                    <tr
                      className={`${
                        pubKey in importedAccounts ? 'opacity-25' : ''
                      }`}
                      key={pubKey}
                    >
                      <ProgramChange
                        key={pubKey}
                        attemptAccountAdd={attemptAccountAdd}
                        importedAccounts={importedAccounts}
                        {...change}
                      />
                    </tr>
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
};

const AccountView = (props: { net: Net; account: WBAccount }) => {
  const { net, account } = props;
  return (
    <>
      <div className="row">
        <div className="col-auto">
          <div>
            <h6 className="ms-1">
              {account.humanName !== '' ? account.humanName : <div>&nbsp;</div>}
            </h6>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="row">
            <div className="col-auto">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td>
                      <small className="text-muted">Pubkey</small>
                    </td>
                    <td>
                      <small>
                        <InlinePK pk={account.pubKey} />
                      </small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">SOL</small>
                    </td>
                    <td>
                      <small>{account.solAmount?.toFixed(2)}</small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Executable</small>
                    </td>
                    <td>
                      {account.solAccount?.executable ? (
                        <div>
                          <FontAwesomeIcon
                            className="border-success rounded p-1 exe-icon"
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
                  <tr>
                    <td>
                      <small className="text-muted">Explorer</small>
                    </td>
                    <td>
                      <small>
                        <a
                          onClick={() =>
                            analytics('clickExplorerLink', { net })
                          }
                          href={explorerURL(net, account.pubKey)}
                          target="_blank"
                          className="sol-link"
                          rel="noreferrer"
                        >
                          Link
                        </a>
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-auto">
              <RandomArt
                className="randomart-lg text-secondary"
                art={account.art || ''}
              />
            </div>
          </div>
          <div className="ms-1">
            <div>
              <small className="text-muted">Data</small>
            </div>
            <div>
              <pre className="exe-hexdump p-2 rounded">
                <code>{account.hexDump}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const AccountListView = (props: {
  net: Net;
  accounts: WBAccount[];
  hoveredItem: string;
  selected: string;
  edited: string;
  setEdited: (s: string) => void;
  setSelected: (s: string) => void;
  setHoveredItem: (s: string) => void;
  rmAccount: (s: string) => void;
  attemptAccountAdd: (pubKey: string, initializing: boolean) => void;
}) => {
  const {
    net,
    accounts,
    hoveredItem,
    selected,
    edited,
    setEdited,
    setSelected,
    setHoveredItem,
    attemptAccountAdd,
    rmAccount,
  } = props;
  return (
    <>
      {accounts.map((account: WBAccount) => {
        const initializing = account.pubKey === NONE_KEY;
        return (
          <AccountListItem
            net={net}
            key={`pubKey=${account.pubKey},initializing=${initializing}`}
            account={account}
            hovered={account.pubKey === hoveredItem}
            selected={account.pubKey === selected}
            edited={account.pubKey === edited}
            initializing={initializing}
            setHoveredItem={setHoveredItem}
            setEdited={setEdited}
            setSelected={setSelected}
            rmAccount={rmAccount}
            attemptAccountAdd={(pubKey: string) =>
              attemptAccountAdd(pubKey, initializing)
            }
          />
        );
      })}
    </>
  );
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

  const effectSetup = useRef<boolean>();
  const accountsRef = useRef<WBAccount[]>([]);
  const netRef = useRef<Net>(Net.Localhost);

  const setAccounts = (accs: WBAccount[]) => {
    accountsRef.current = accs;
    setAccountsRef(accs);
  };

  const addAccount = (pubKey: string = NONE_KEY) => {
    const accs = [...accounts];
    accs.splice(0, 0, {
      pubKey,
      humanName: '',
    });
    setAccounts(accs);
    setSelected('');
    setHoveredItem('');
    setEdited(NONE_KEY);
  };

  const shiftAccount = () => {
    const accs = [...accounts];
    accs.shift();
    setAccounts(accs);
  };

  const rmAccount = (pubKey: string) => {
    const accs = [...accounts];
    setAccounts(accs.filter((a) => a.pubKey !== pubKey));
  };

  useEffect(() => {
    const unshiftAccount = (account: WBAccount) => {
      const accs = [...accountsRef.current];
      if (accs[0].pubKey === NONE_KEY) {
        accs[0] = account;
      } else {
        accs.unshift(account);
      }
      setAccounts(accs);
    };

    const accountsListener = (data: AccountsResponse) => {
      setRootKey(data.rootKey);
      setAccounts(data.accounts);
    };

    const getAccountListener = (resp: GetAccountResponse) => {
      if (resp.account?.solAccount) {
        unshiftAccount(resp.account);
        setSelected(resp.account.pubKey);
        analytics('accountAddSuccess', { net: netRef.current });
        window.electron.ipcRenderer.importAccount({
          net: netRef.current,
          pubKey: resp.account.pubKey,
        });
        pushToast(<Toast msg="Account imported" variant="sol-green" />);
      } else {
        if (resp.account?.pubKey) rmAccount(resp.account?.pubKey);
        pushToast(
          <Toast msg={`Account not found in ${net}`} variant="warning" />
        );
      }
    };

    if (netRef.current !== net || !effectSetup.current) {
      netRef.current = net;
      window.electron.ipcRenderer.accounts({ net });
    }

    if (!effectSetup.current) {
      window.electron.ipcRenderer.on('accounts', accountsListener);
      window.electron.ipcRenderer.on('get-account', getAccountListener);
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

  const attemptAccountAdd = (pubKey: string, initializing: boolean) => {
    analytics('accountAddAttempt', {
      nAccounts: accounts.length,
      net: netRef.current,
    });

    if (initializing && pubKey === NONE_KEY) {
      shiftAccount();
    } else {
      // todo: excludes first (same) element, not generic to anywhere
      // in array but it'll do
      if (
        // accounts has an entry for the new (attempted) account ID already,
        // so we sum up the instances of that key, and it'll be 2 if it's
        // a duplicate of an existing one
        accounts
          .map((a): number => (a.pubKey === pubKey ? 1 : 0))
          .reduce((a, b) => a + b, 0) === 2
      ) {
        pushToast(<Toast msg="Account already imported" variant="warning" />);
        shiftAccount();
        return;
      }
      if (pubKey.match(BASE58_PUBKEY_REGEX)) {
        window.electron.ipcRenderer.getAccount({
          net,
          pk: pubKey,
        });
      } else {
        pushToast(<Toast msg="Invalid account ID" variant="warning" />);
        shiftAccount();
      }
    }
  };

  let initView = (
    <>
      <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
      <small className="me-2">Generating seed wallets...</small>
    </>
  );
  if (net !== Net.Localhost) {
    initView = (
      <small className="me-2">
        No accounts found. Add some with &quot;Add Account&quot;.
      </small>
    );
  }

  return (
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
                  addAccount();
                }
              }}
              onMouseUp={() => setAddBtnClicked(false)}
            >
              <FontAwesomeIcon className="text-white" icon={faPlus} />
              <span className="ms-1 text-white">Add Account</span>
            </button>
          </div>
          {accounts.length > 0 || net !== Net.Localhost ? (
            <AccountListView
              net={net}
              accounts={accounts}
              hoveredItem={hoveredItem}
              selected={selected}
              edited={edited}
              setEdited={setEdited}
              setSelected={setSelected}
              setHoveredItem={setHoveredItem}
              attemptAccountAdd={attemptAccountAdd}
              rmAccount={rmAccount}
            />
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
                selectedAccount ? '' : 'border-bottom active'
              } ms-3 me-3 pt-1 pb-1 border-3 cursor-pointer nav-item text-secondary nav-link-tab`}
            >
              <small
                onClick={() => {
                  setSelected('');
                }}
              >
                Live
              </small>
            </li>
          </ul>
        </div>
        <div className="m-2">
          {selectedAccount ? (
            <AccountView net={net} account={selectedAccount} />
          ) : (
            <ProgramChangeView
              net={net}
              accounts={accounts}
              attemptAccountAdd={attemptAccountAdd}
              pushToast={pushToast}
            />
          )}
        </div>
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
    '/': 'Accounts',
    '/validator': 'Validator Logs',
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

  const netDropdownSelect = (eventKey: string | null) => {
    analytics('selectNet', { prevNet: net, newNet: eventKey });
    if (eventKey) setNet(eventKey as Net);
  };

  const netDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faNetworkWired} />{' '}
      <span>{net}</span>
    </>
  );

  return (
    <Router>
      <Switch>
        <div className="row flex-nowrap g-0">
          <div className="col-auto">
            <Nav />
            {toasts}
          </div>
          <div className="col-10 bg-white ms-4">
            <div className="row sticky-top sticky-nav bg-white-translucent">
              <div>
                <Header />
                <DropdownButton
                  size="sm"
                  id="dropdown-basic-button"
                  title={netDropdownTitle}
                  onSelect={netDropdownSelect}
                  className="float-end"
                  variant="light"
                  align="end"
                >
                  <Dropdown.Item eventKey={Net.Localhost} href="#">
                    {Net.Localhost}
                  </Dropdown.Item>
                  <Dropdown.Item eventKey={Net.Dev} href="#">
                    {Net.Dev}
                  </Dropdown.Item>
                  <Dropdown.Item eventKey={Net.Test} href="#">
                    {Net.Test}
                  </Dropdown.Item>
                  <Dropdown.Item eventKey={Net.MainnetBeta} href="#">
                    {Net.MainnetBeta}
                  </Dropdown.Item>
                </DropdownButton>
              </div>
            </div>
            <div className="row flex-nowrap">
              <Route exact path="/">
                <Accounts net={net} pushToast={pushToast} />
              </Route>
              <Route path="/validator">
                <Run />
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
