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
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
// import * as web3 from '@solana/web3.js';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import amplitude from 'amplitude-js';
import { debounce } from 'underscore';
import SolState from '../types/types';

amplitude.getInstance().init('f1cde3642f7e0f483afbb7ac15ae8277');
amplitude.getInstance().logEvent('open-app', {});
setInterval(() => {
  amplitude.getInstance().logEvent('heartbeat', {});
}, 3600000);

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
            <FontAwesomeIcon size="3x" icon={faRunning} />
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
            <FontAwesomeIcon className="nav-icon" size="3x" icon={faTh} />
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
            <FontAwesomeIcon className="nav-icon" size="3x" icon={faAnchor} />
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
    window.electron.ipcRenderer.on('sol-state', (arg: SolState) => {
      setSolStatus(arg);
      // eslint-disable-next-line no-console
      console.log('sol-state', arg);
      setLoading(false);
      if (arg.running) {
        setWaitingForRun(false);
      }
    });
    window.electron.ipcRenderer.on('validator-logs', (logs: string) => {
      setValidatorLogs(logs);
    });
    window.electron.ipcRenderer.solState();
    fetchLogs();
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

const prettifyPubkey = (pk: string) =>
  `${pk.slice(0, 4)}..${pk.slice(pk.length - 4, pk.length)}`;

const CopyIcon = ({ writeValue = '' }) => {
  const [copyTooltipText, setCopyTooltipText] = useState<string>('Copy');

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

CopyIcon.propTypes = {
  writeValue: PropTypes.string.isRequired,
};

const Accounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [hoveredItem, setHoveredItem] = useState<string>('');
  const [rootKey, setRootKey] = useState<string>('');

  useEffect(() => {
    window.electron.ipcRenderer.once('accounts', (data: any) => {
      // eslint-disable-next-line no-console
      console.log(data);
      setRootKey(data.rootKey);
      setAccounts(data.accounts);
    });

    window.electron.ipcRenderer.accounts();
  }, []);

  return (
    <>
      <div className="col-auto">
        <div className="mb-3">
          <FontAwesomeIcon icon={faKey} />
          <span className="ms-2">
            <code className="p-1">{prettifyPubkey(rootKey)}</code>
            <CopyIcon writeValue={rootKey} />
          </span>
        </div>
        {accounts.length > 0 ? (
          accounts.map((e: any) => {
            return (
              <div
                onClick={() => setSelected(e.pubKey)}
                className={`border-bottom p-2 account-list-item ${
                  selected === e.pubKey ? 'account-list-item-selected' : ''
                } ${hoveredItem === e.pubKey ? 'bg-light' : ''}`}
                key={e.pubKey}
                onMouseEnter={() => setHoveredItem(e.pubKey)}
                onMouseLeave={() => setHoveredItem('')}
              >
                <div className="row flex-nowrap">
                  <div className="col-auto">
                    <pre className="border inline-key mb-0">
                      <code>
                        <strong>{e.art}</strong>
                      </code>
                    </pre>
                  </div>
                  <div className="col-auto">
                    <code>{prettifyPubkey(e.pubKey)}</code>
                    <CopyIcon writeValue={e.pubKey} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
        )}
      </div>
      <div className="col-auto">
        <InputGroup size="sm">
          <FormControl placeholder="Account ID" aria-label="Account ID" />
        </InputGroup>
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
  const [net, setNet] = useState('localhost');
  const netDropdownClick = (e: any) => {
    e.preventDefault();
    setNet(e.target.innerText);
    // eslint-disable-next-line no-console
    console.log(e);
  };

  return (
    <Router>
      <Switch>
        <div className="row flex-nowrap g-0">
          <div className="col-auto mt-2">
            <Nav />
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
                  <Dropdown.Item href="#">localhost</Dropdown.Item>
                  <Dropdown.Item href="#">devnet</Dropdown.Item>
                  <Dropdown.Item href="#">testnet</Dropdown.Item>
                </DropdownButton>
              </div>
            </div>
            <div className="row">
              <Route exact path="/">
                <Run />
              </Route>
              <Route path="/accounts">
                <Accounts />
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
