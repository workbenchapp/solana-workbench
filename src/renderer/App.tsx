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
  faGripHorizontal,
  faCircle,
  faSpinner,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
// import * as web3 from '@solana/web3.js';
import { Button } from 'react-bootstrap';
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
        overlay={renderTooltip('run', 'Run Deps')}
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
        overlay={renderTooltip('accounts', 'Inspect Accounts')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          to="/accounts"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon
              className="nav-icon"
              size="3x"
              icon={faGripHorizontal}
            />
          </div>
        </NavLink>
      </OverlayTrigger>
    </div>
  );
};

const Run = () => {
  const [solStatus, setSolStatus] = useState({} as SolState);
  const [loading, setLoading] = useState(true);

  const runValidator = () => {
    window.electron.ipcRenderer.once('run-validator', (arg: any) => {
      // eslint-disable-next-line no-console
      console.log(arg);
    });

    window.electron.ipcRenderer.runValidator();
  };

  useEffect(() => {
    window.electron.ipcRenderer.once('init', (arg: SolState) => {
      // eslint-disable-next-line no-console
      console.log(arg);
      setSolStatus(arg);
      setLoading(false);
    });

    window.electron.ipcRenderer.solState();
  }, []);

  let statusDisplay = (
    <span className="badge bg-light text-dark">
      <FontAwesomeIcon className="me-1 spinner" icon={faSpinner} />
    </span>
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
    <div>
      <h2>Run Deps</h2>
      <div className="row">
        <div className="col">
          <div className="mt-2 col">
            <div>{statusDisplay}</div>
          </div>
        </div>
        <div className="col">
          <pre className="mt-2">
            <code>logs</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

const Airdrop = () => {
  const [keypairs, setKeyPairs] = useState<string[]>([]);
  // eslint-disable-next-line no-console
  console.log(keypairs);

  useEffect(() => {
    window.electron.ipcRenderer.once('keypairs', (pairs: string[]) => {
      setKeyPairs(pairs);
    });

    window.electron.ipcRenderer.keypairs();
  }, []);

  const addKeypair = () => {
    window.electron.ipcRenderer.on('add-keypair', (pairs: string[]) => {
      // eslint-disable-next-line no-console
      console.log('returned from add-keypair', pairs);
      setKeyPairs(pairs);
    });

    window.electron.ipcRenderer.addKeypair();
  };

  return (
    <div className="row">
      <h2>Keys</h2>
      <div className="row">
        {keypairs.length > 0 ? (
          keypairs.map((e: string) => {
            return (
              <div className="card col-6">
                <div key={e} className="card-body">
                  <h5 className="card-title">{e}</h5>
                  <p className="card-text">SOL: 0</p>
                  <Button variant="primary">Airdrop</Button>
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
      <div className="row">
        <div className="col-2">
          <Button onClick={addKeypair} variant="primary">
            <FontAwesomeIcon icon={faPlus} /> Keypair
          </Button>
        </div>
      </div>
    </div>
  );
};

const Accounts = () => {
  return (
    <div className="row">
      <h2>Inspect Accounts</h2>
      <p>Inspect accounts here</p>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="row">
        <div className="col-1">
          <Nav />
        </div>
        <div className="col">
          <Switch>
            <Route exact path="/">
              <Run />
            </Route>
            <Route path="/airdrop">
              <Airdrop />
            </Route>
            <Route path="/accounts">
              <Accounts />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}
