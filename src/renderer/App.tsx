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
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { debounce } from 'underscore';
import { useSelector, useDispatch } from 'react-redux';

import {
  RootState,
  setValidatorRunning,
  setValidatorWaitingForRun,
  setValidatorLoading,
  setListedAccounts,
  setAccountsRootKey,
  rmAccount,
  unshiftAccount,
  addAccount,
  setSelected,
  setEdited,
  setHovered,
  rmToast,
  shiftAccount,
  pushToast,
  setNet,
} from './slices/mainSlice';

import {
  ACCOUNTS_NONE_KEY,
  RANDOMART_W_CH,
  RANDOMART_H_CH,
  TOAST_HEIGHT,
  TOAST_WIDTH,
  TOAST_HIDE_MS,
  TOAST_PAUSE_MS,
  BASE58_PUBKEY_REGEX,
  MAX_PROGRAM_CHANGES_DISPLAYED,
  WBAccount,
  ValidatorState,
  Net,
  netToURL,
  ProgramAccountChange,
  ImportedAccountMap,
  ProgramID,
  AccountsState,
  ProgramChangesState,
} from '../types/types';
import analytics from 'common/analytics';

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
  hideAfter?: number;
  toastKey?: string | undefined;
}) => {
  const dispatch = useDispatch();
  const { toastKey, msg, variant, bottom, hideAfter } = props;
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
          dispatch(rmToast(toastKey));
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
                dispatch(rmToast(toastKey));
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
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const validator: ValidatorState = useSelector(
    (state: RootState) => state.validator
  );

  const dispatch = useDispatch();

  const fetchLogs = useCallback(() => {
    if (validator.running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: filterRef.current.value,
      });
    }
  }, [validator.running]);

  const triggerFetchLogs = debounce(fetchLogs, 800);

  const runValidator = () => {
    dispatch(setValidatorWaitingForRun(true));
    window.electron.ipcRenderer.runValidator();
  };

  useEffect(() => {
    window.electron.ipcRenderer.validatorState({
      net: Net.Localhost,
    });
  }, []);

  useInterval(
    () => window.electron.ipcRenderer.validatorState({ net: Net.Localhost }),
    5000
  );
  useInterval(fetchLogs, 5000);
  useEffect(() => {
    const validatorLogsListener = (logs: string) => {
      setValidatorLogs(logs);
    };
    window.electron.ipcRenderer.on('validator-logs', validatorLogsListener);
    fetchLogs();

    return () => {
      window.electron.ipcRenderer.removeListener(
        'validator-logs',
        validatorLogsListener
      );
    };
  }, [fetchLogs]);

  let statusDisplay = (
    <div>
      <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
      {validator.waitingForRun && (
        <small className="text-muted">
          Starting validator. This can take about a minute...
        </small>
      )}
    </div>
  );

  if (!validator.loading && !validator.waitingForRun) {
    if (validator.running) {
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
          <code className={`${!validator.running ? 'text-muted' : ''}`}>
            {validatorLogs}
          </code>
        </pre>
      </div>
    </div>
  );
};

const prettifyPubkey = (pk = '') =>
  pk !== ACCOUNTS_NONE_KEY
    ? `${pk.slice(0, 4)}…${pk.slice(pk.length - 4, pk.length)}`
    : '';

type EditableProps = {
  value: string;
  outerHovered?: boolean;
  outerSelected?: boolean;
  className?: string;
  inputClassName?: string;
  clearAllOnSelect?: boolean;
  placeholder?: string;

  // TODO: factor these out into forwardRefs?
  onClick?: () => void;
  handleOutsideClick?: () => void;
  editingStopped?: () => void;
  onPaste?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onBlur?: (e: any) => void;
  effect?: React.EffectCallback;
};

const Editable = React.forwardRef<HTMLInputElement, EditableProps>(
  (props, ref) => {
    const dispatch = useDispatch();
    const {
      value,
      outerHovered,
      outerSelected,
      onClick,
      editingStopped,
      className,
      inputClassName,
      handleOutsideClick,
      clearAllOnSelect,
      placeholder,
      onPaste,
      onKeyDown,
      onBlur,
      effect,
    } = props;
    const [hovering, setHovering] = useState(false);
    const [editing, setEditing] = useState(false);

    if (effect) useEffect(effect);

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
    if (hovering && !editing) {
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
        setHovering(false);
        setEditing(false);
        if (editingStopped) editingStopped();
        if (handleOutsideClick) handleOutsideClick();
      }
    };

    return (
      <OutsideClickHandler onOutsideClick={completeEdit}>
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={(e) => {
            e.stopPropagation();
            dispatch(setSelected(''));
            setEditing(true);
            dispatch(setHovered(''));
            if (onClick) onClick();
          }}
        >
          <InputGroup
            size="sm"
            className={`${inputClassName} ${
              outerSelected && !hovering && !outerHovered && 'input-selected'
            }`}
          >
            <FormControl
              className={classes}
              ref={ref}
              defaultValue={formValue}
              placeholder={editing ? placeholder : ''}
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  completeEdit();
                }
              }}
              onFocus={() => {
                setEditing(true);
              }}
              onKeyDown={(e) => {
                if (onKeyDown) onKeyDown(e);
              }}
              onPaste={(e) => {
                if (onPaste) onPaste(e);
              }}
              onBlur={(e) => {
                if (onBlur) onBlur(e);
              }}
            />
          </InputGroup>
        </div>
      </OutsideClickHandler>
    );
  }
);

Editable.defaultProps = {
  className: '',
  inputClassName: 'input-clean',
  clearAllOnSelect: false,
  placeholder: '',
  outerHovered: false,
  outerSelected: false,
  editingStopped: () => {},
  handleOutsideClick: () => {},
  onPaste: () => {},
  onKeyDown: () => {},
  onClick: () => {},
  onBlur: () => {},
  effect: () => {},
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

const AccountNameEditable = (props: {
  account: WBAccount;
  innerProps: {
    placeholder: string;
    outerSelected: boolean | undefined;
    outerHovered: boolean | undefined;
  };
}) => {
  const { account, innerProps } = props;
  const { net } = useSelector((state: RootState) => state.validator);
  const dispatch = useDispatch();
  const { pubKey, humanName } = account;
  const ref = useRef<HTMLInputElement>({} as HTMLInputElement);
  return (
    <Editable
      ref={ref}
      value={humanName || ''}
      onClick={() => dispatch(setEdited(pubKey))}
      editingStopped={() => dispatch(setEdited(''))}
      handleOutsideClick={() => {
        analytics('updateAccountName', {});
        window.electron.ipcRenderer.updateAccountName({
          net,
          pubKey,
          humanName: ref.current.value,
        });
      }}
      {...innerProps}
    />
  );
};

const AccountListItem = (props: {
  initializing: boolean;
  account: WBAccount;
  attemptAccountAdd: (pk: string, b: boolean) => void;
}) => {
  const { initializing, account, attemptAccountAdd } = props;
  const dispatch = useDispatch();
  const { selectedAccount, hoveredAccount, editedAccount } = useSelector(
    (state: RootState) => state.accounts
  );
  const { net } = useSelector((state: RootState) => state.validator);
  const { pubKey } = account;
  const selected = selectedAccount === pubKey;
  const hovered = hoveredAccount === pubKey;
  const edited = editedAccount === pubKey;
  const addAcctRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  type EllipsisToggleProps = {
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  };

  const EllipsisToggle = React.forwardRef<HTMLDivElement>(
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
        dispatch(setSelected(account.pubKey));
      }}
      className={`p-1 account-list-item ${
        selected
          ? 'account-list-item-selected border-top border-bottom border-primary'
          : 'border-top border-bottom'
      } ${hovered && !selected && 'bg-xlight'} ${
        edited && 'border-top border-bottom border-primary'
      }`}
      key={account.pubKey}
      onMouseEnter={() => dispatch(setHovered(account.pubKey))}
      onMouseLeave={() => dispatch(setHovered(''))}
    >
      <div className="row flex-nowrap">
        <div className="col">
          {account.pubKey === ACCOUNTS_NONE_KEY ? (
            <Editable
              ref={addAcctRef}
              value={account.pubKey}
              effect={() => {
                dispatch(setEdited(account.pubKey));
                addAcctRef.current.focus();
              }}
              editingStopped={() => dispatch(setEdited(''))}
              inputClassName={`input-clean-code ${
                initializing && 'input-no-max'
              }`}
              handleOutsideClick={() => {
                let pubKey = addAcctRef.current.value;
                if (pubKey === '') {
                  pubKey = ACCOUNTS_NONE_KEY;
                }
                attemptAccountAdd(pubKey, initializing);
              }}
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
                <AccountNameEditable
                  account={account}
                  innerProps={{
                    placeholder: 'Write a description',
                    outerSelected: selected,
                    outerHovered: hovered,
                  }}
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
                      dispatch(rmAccount(account.pubKey));
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
  accounts: WBAccount[];
  attemptAccountAdd: (pubKey: string, initializing: boolean) => void;
}) => {
  const dispatch = useDispatch();
  const { accounts, attemptAccountAdd } = props;
  const { net } = useSelector((state: RootState) => state.validator);

  // want to check paused before updating changes later,
  // so we include these together
  const [changesState, setChangesState] = useState<ProgramChangesState>({
    changes: [],
    paused: false,
  });
  const { changes, paused } = changesState;

  const [uniqueAccounts, setUniqueAccounts] = useState(0);
  const [filterDropdownShow, setFilterDropdownShow] = useState(false);
  const filterProgramIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const [programID, setProgramID] = useState(ProgramID.SystemProgram);

  const pausedTimeoutRef = useRef(0);

  const importedAccounts: ImportedAccountMap = {};
  accounts.forEach((a) => {
    importedAccounts[a.pubKey] = true;
  });

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      switch (method) {
        case 'subscribe-program-changes':
          break;
        case 'unsubscribe-program-changes':
          window.electron.ipcRenderer.removeAllListeners('program-changes');
          break;
        case 'program-changes':
          setChangesState((prevState) => {
            if (!prevState.paused) {
              setUniqueAccounts(res.uniqueAccounts);
              return { ...prevState, changes: res.changes };
            }
            return prevState;
          });
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
    window.electron.ipcRenderer.subscribeProgramChanges({
      net,
      programID,
    });

    return () => {
      window.electron.ipcRenderer.unsubscribeProgramChanges({
        net,
        programID,
      });
    };
  }, [net]);

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  const setPaused = (p: boolean) => {
    setChangesState((prevState) => ({
      ...prevState,
      paused: p,
    }));
  };
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
        <div className="mb-2">
          <small>
            <strong>Program Account Changes</strong>
          </small>
        </div>
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
                if (s) setProgramID(s as ProgramID);
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
              <Dropdown.Item eventKey={ProgramID.TokenProgram}>
                <small>Token Program</small>
              </Dropdown.Item>
              <Dropdown.Item eventKey={ProgramID.SerumDEXV3}>
                <small>Serum DEX V3</small>
              </Dropdown.Item>
              <div className="p-2">
                <Editable
                  value="Custom"
                  ref={filterProgramIDRef}
                  onClick={() => {
                    filterProgramIDRef.current.value = '';
                  }}
                  placeholder="Paste Program ID"
                  onKeyDown={(e) => {
                    if (!(e.code === 'MetaRight' || e.code === 'KeyV')) {
                      dispatch(
                        pushToast({
                          msg: 'Must paste in valid program ID',
                          variant: 'warning',
                        })
                      );
                      filterProgramIDRef.current.value = 'Custom';
                      filterProgramIDRef.current.blur();
                      setFilterDropdownShow(false);
                    }
                  }}
                  onPaste={(e) => {
                    const pastedID = e.clipboardData.getData('Text');
                    if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                      window.electron.ipcRenderer.unsubscribeProgramChanges({
                        net,
                        programID,
                      });
                      window.electron.ipcRenderer.subscribeProgramChanges({
                        net,
                        programID: pastedID,
                      });
                      setProgramID(pastedID);
                    } else {
                      dispatch(
                        pushToast({
                          // todo: full jsx access would be better (code)
                          msg: `Invalid program ID: ${pastedID}`,
                          variant: 'warning',
                        })
                      );
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

const AccountView = (props: { account: WBAccount }) => {
  const { account } = props;
  const { net } = useSelector((state: RootState) => state.validator);
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
                      {account.executable ? (
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
  attemptAccountAdd: (pk: string, b: boolean) => void;
}) => {
  const { attemptAccountAdd } = props;
  const accounts: AccountsState = useSelector(
    (state: RootState) => state.accounts
  );
  const { listedAccounts } = accounts;
  return (
    <>
      {listedAccounts.map((account: WBAccount) => {
        const initializing = account.pubKey === ACCOUNTS_NONE_KEY;
        return (
          <AccountListItem
            account={account}
            initializing={initializing}
            key={`pubKey=${account.pubKey},initializing=${initializing}`}
            attemptAccountAdd={attemptAccountAdd}
          />
        );
      })}
    </>
  );
};

const Accounts = () => {
  const dispatch = useDispatch();
  const accounts: AccountsState = useSelector(
    (state: RootState) => state.accounts
  );
  const { net } = useSelector((state: RootState) => state.validator);
  const { rootKey, selectedAccount, listedAccounts } = accounts;
  const [addBtnClicked, setAddBtnClicked] = useState<boolean>(false);

  const attemptAccountAdd = (pubKey: string, initializing: boolean) => {
    console.log('attemptAccountAdd', { pubKey, initializing });
    if (initializing && pubKey === ACCOUNTS_NONE_KEY) {
      dispatch(shiftAccount());
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
          pushToast({ msg: 'Account already imported', variant: 'warning' })
        );
        dispatch(shiftAccount());
        return;
      }
      if (pubKey.match(BASE58_PUBKEY_REGEX)) {
        console.log('getting!');
        window.electron.ipcRenderer.getAccount({
          net,
          pubKey,
        });
      } else {
        dispatch(pushToast({ msg: 'Invalid account ID', variant: 'warning' }));
        dispatch(shiftAccount());
      }
    }
  };

  useEffect(() => {
    console.log('useEffect');
    const listener = (resp: any) => {
      const { method, res } = resp;
      if (method != 'program-changes') {
        console.log(resp);
      }
      switch (method) {
        case 'accounts':
          dispatch(setListedAccounts(res.accounts));
          dispatch(setAccountsRootKey(res.rootKey));
          break;
        case 'update-account-name':
          break;
        case 'import-account':
          break;
        case 'get-account':
          const { exists, pubKey } = res.account;
          if (exists) {
            console.log('get account was called and account exists', res);
            dispatch(unshiftAccount(res.account));
            dispatch(setSelected(pubKey));

            // TODO: wrong
            analytics('accountAddSuccess', { net: res.account.net });

            window.electron.ipcRenderer.importAccount({
              net,
              pubKey,
            });

            dispatch(
              pushToast({
                msg: 'Account imported',
                variant: 'sol-green',
              })
            );
          } else {
            console.log('no exist', resp);
            if (pubKey) {
              dispatch(rmAccount(pubKey));
            }
            dispatch(
              pushToast({
                msg: `Account not found in ${net}`,
                variant: 'warning',
              })
            );
          }
          break;
        case 'delete-account':
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);

    return () => {
      console.log('removing listener');
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
                  dispatch(addAccount(undefined));
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
                selectedAccountInfo ? '' : 'border-bottom active'
              } ms-3 me-3 pt-1 pb-1 border-3 cursor-pointer nav-item text-secondary nav-link-tab`}
            >
              <small
                onClick={() => {
                  dispatch(setSelected(''));
                }}
              >
                Live
              </small>
            </li>
          </ul>
        </div>
        <div className="m-2">
          {selectedAccountInfo ? (
            <AccountView account={selectedAccountInfo} />
          ) : (
            <ProgramChangeView
              accounts={listedAccounts}
              attemptAccountAdd={attemptAccountAdd}
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
  const dispatch = useDispatch();
  const { toasts } = useSelector((state: RootState) => state.toast);
  const { net } = useSelector((state: RootState) => state.validator);

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      // too spammy
      switch (method) {
        case 'validator-state':
          dispatch(setValidatorRunning(res.running));
          dispatch(setValidatorLoading(false));
          break;
        case 'run-validator':
          break;
        case 'validator-logs':
          break;
        case 'fetch-anchor-idl':
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);
    window.electron.ipcRenderer.validatorState({
      net: Net.Localhost,
    });

    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  const netDropdownSelect = (eventKey: string | null) => {
    analytics('selectNet', { prevNet: net, newNet: eventKey });
    if (eventKey) dispatch(setNet(eventKey as Net));
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
            {toasts.map((t) => (
              <Toast {...t} />
            ))}
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
                <Accounts />
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
