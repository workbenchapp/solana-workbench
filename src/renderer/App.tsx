/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MemoryRouter as Router,
  Switch,
  Route,
  NavLink,
} from 'react-router-dom';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
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
import { useEffect, useRef, useState } from 'react';
// import * as web3 from '@solana/web3.js';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import SolState from '../types/types';

declare global {
  interface Window {
    electron?: any;
  }
}

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
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const runValidator = () => {
    window.electron.ipcRenderer.once('run-validator', () => {
      setLoading(true);
      setTimeout(async () => {
        window.electron.ipcRenderer.solState();
      }, 5000);
    });

    window.electron.ipcRenderer.runValidator();
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('init', (arg: SolState) => {
      setSolStatus(arg);
      setLoading(false);
    });

    window.electron.ipcRenderer.on('validator-logs', (logs: string) => {
      setValidatorLogs(logs);
    });

    const logsInterval = setInterval(() => {
      if (solStatus.running) {
        window.electron.ipcRenderer.validatorLogs({
          filter: filterRef.current.value,
        });
      }
    }, 1000);

    window.electron.ipcRenderer.solState();

    return () => clearInterval(logsInterval);
  }, [solStatus.running]);

  let statusDisplay = (
    <div>
      <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
      <span>Starting validator...</span>
    </div>
  );

  if (!loading) {
    if (solStatus.running) {
      statusDisplay = (
        <span className="badge bg-light text-dark">
          <FontAwesomeIcon className="sol-green me-1" icon={faCircle} />
          Validator Running
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
      <h2>Run Deps</h2>
      <div className="col-sm-2">
        <div className="mt-2 col">
          <div>{statusDisplay}</div>
        </div>
      </div>
      <div className="col-sm-9">
        <InputGroup size="sm">
          <FormControl
            ref={filterRef}
            placeholder="Filter logs"
            aria-label="Amount"
          />
        </InputGroup>
        <pre className="mt-2 pre-scrollable">
          <code>{validatorLogs}</code>
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
      <h2>Keys</h2>
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
      <h2>Anchor IDL</h2>
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
      <div className="row">
        <div className="col-auto">
          <Nav />
        </div>
        <div className="col-sm-10">
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
