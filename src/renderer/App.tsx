/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MemoryRouter as Router,
  Switch,
  Route,
  NavLink,
} from 'react-router-dom';
import './App.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import {
  faRunning,
  faCoins,
  faCircle,
  faSpinner,
  faPlus,
  faAnchor,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
// import * as web3 from '@solana/web3.js';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import amplitude from 'amplitude-js';
import _ from 'underscore';
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
    <div>
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
        overlay={renderTooltip('airdrop', 'Airdrop')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          to="/airdrop"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon className="nav-icon" size="3x" icon={faCoins} />
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
    window.electron.ipcRenderer.validatorLogs({
      filter: filterRef.current.value,
    });
  }, []);

  const triggerFetchLogs = _.debounce(fetchLogs, 800);

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
            <Button onClick={runValidator} className="mt-2" variant="primary">
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
          <code className={`${!solStatus.running ?"text-muted" : ""}`}>{validatorLogs}</code>
        </pre>
      </div>
    </div>
  );
};

const Airdrop = () => {
  const [keypairs, setKeyPairs] = useState<string[]>([]);

  const addKeypair = () => {
    window.electron.ipcRenderer.on('add-keypair', (pairs: string[]) => {
      setKeyPairs(pairs);
    });

    window.electron.ipcRenderer.addKeypair();
  };

  useEffect(() => {
    window.electron.ipcRenderer.once('keypairs', (pairs: string[]) => {
      setKeyPairs(pairs);
    });

    window.electron.ipcRenderer.keypairs();
  }, []);

  return (
    <div className="row">
      <div className="row mb-2">
        <div className="col-2">
          <Button onClick={addKeypair} variant="primary">
            <FontAwesomeIcon icon={faPlus} /> Keypair
          </Button>
        </div>
      </div>
      <div className="row">
        {keypairs.length > 0 ? (
          keypairs.map((e: string) => {
            return (
              <div className="card col-5 m-1">
                <div key={e} className="card-body">
                  <div>
                    <h6 className="card-title">{e}</h6>
                    <div className="row">
                      <div className="col-sm-8">
                        <InputGroup size="sm" className="mt-1">
                          <InputGroup.Text>Amount</InputGroup.Text>
                          <FormControl aria-label="Amount" />
                        </InputGroup>
                      </div>
                      <div className="col-sm-2">
                        <Button
                          onClick={() =>
                            window.electron.ipcRenderer.airdropTokens({
                              pubKey: e,
                              solAmount: 1,
                            })
                          }
                          className="mt-1 btn-sm float-right"
                          variant="primary"
                        >
                          Airdrop
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div>
            No keypairs. How are you supposed to SOL without any keypairs?
          </div>
        )}
      </div>
    </div>
  );
};

const Anchor = () => {
  const programIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const [idl, setIDL] = useState<any>({});

  const fetchIDL = () => {
    window.electron.ipcRenderer.once('fetch-anchor-idl', (fetchedIDL: any) => {
      setIDL(fetchedIDL);
      console.log(fetchedIDL);
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

export default function App() {
  return (
    <Router>
      <div className="row flex-nowrap g-0">
        <div className="col-auto mt-2">
          <Nav />
        </div>
        <div className="col-sm-10 mt-2 ms-4">
          <Switch>
            <Route exact path="/">
              <Run />
            </Route>
            <Route path="/airdrop">
              <Airdrop />
            </Route>
            <Route path="/anchor">
              <Anchor />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}
