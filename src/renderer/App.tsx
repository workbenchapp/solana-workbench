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
  faBook,
  faTh,
  faAnchor,
  faNetworkWired,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import useInterval from 'common/hooks';
import { useSelector, useDispatch } from 'react-redux';
import analytics from 'common/analytics';
import { Button, Form } from 'react-bootstrap';
import { configActions, RootState, validatorActions } from './slices/mainSlice';
import { ConfigAction, ConfigKey, Net, NetStatus } from '../types/types';
import Toast from './components/Toast';
import Accounts from './nav/Accounts';
import Anchor from './nav/Anchor';
import Validator from './nav/Validator';
import ValidatorNetworkInfo from './nav/ValidatorNetworkInfo';

declare global {
  interface Window {
    electron?: any;
  }
}

function Nav() {
  const renderTooltip = (id: string, title: string) => {
    return function (props: any) {
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
        overlay={renderTooltip('logs', 'Validator')}
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
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 0 }}
        overlay={renderTooltip('version', 'Version')}
      >
        <NavLink
          className="nav-link nav-icon"
          activeClassName="selected-nav-icon"
          to="/validatornetworkinfo"
        >
          <div style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon size="2x" icon={faNetworkWired} />
          </div>
        </NavLink>
      </OverlayTrigger>
    </div>
  );
}

function Header() {
  const location = useLocation();
  const routes: Record<string, string> = {
    '/': 'Accounts',
    '/validator': 'Validator',
    '/anchor': 'Anchor',
    '/validatornetworkinfo': 'ValidatorNetworkInfo',
  };
  return <strong>{routes[location.pathname]}</strong>;
}

export default function App() {
  const dispatch = useDispatch();
  const { toasts } = useSelector((state: RootState) => state.toast);
  const validator = useSelector((state: RootState) => state.validator);
  const config = useSelector((state: RootState) => state.config);

  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const { net } = validator;

  useEffect(() => {
    window.electron.ipcRenderer.validatorState({ net });
  }, [validator]);

  useInterval(() => {
    window.electron.ipcRenderer.validatorState({ net });
  }, 5000);

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      if (method != 'program-changes') {
        console.log(resp);
      }
      switch (method) {
        case 'validator-state':
          dispatch(validatorActions.setState(res.status));
          break;
        case 'config':
          dispatch(
            configActions.set({
              loading: false,
              values: res.values,
            })
          );
          break;
        case 'get-validator-network-info':
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);
    window.electron.ipcRenderer.config({
      action: ConfigAction.Get,
    });

    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  const netDropdownSelect = (eventKey: string | null) => {
    analytics('selectNet', { prevNet: net, newNet: eventKey });
    if (eventKey) dispatch(validatorActions.setNet(eventKey as Net));
  };

  let statusDisplay = <></>;

  if (validator.status === NetStatus.Running) {
    statusDisplay = (
      <span className="badge bg-light text-dark p-2">
        <FontAwesomeIcon className="sol-green me-1" icon={faCircle} />
        Available
      </span>
    );
  } else {
    statusDisplay = (
      <span className="badge bg-light text-dark p-2">
        <FontAwesomeIcon className="text-danger me-1" icon={faCircle} />
        {validator.status}
      </span>
    );
  }

  const netDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faNetworkWired} />{' '}
      <span>{net}</span>
      {statusDisplay}
    </>
  );

  let mainDisplay = <></>;

  if (!config.loading && !(`${ConfigKey.AnalyticsEnabled}` in config.values)) {
    mainDisplay = (
      <div className="container">
        <div className="mt-2">
          <h3>Will you help us out?</h3>
          Workbench collects telemetry data to improve your experience. You can
          audit this code on{' '}
          <a
            href="https://github.com/workbenchapp/solana-workbench"
            target="_blank"
            rel="noreferrer"
          >
            Github
          </a>
          . You can opt out below.
        </div>
        <div className="mt-2 mb-2">
          <h5>What We Collect</h5>
          <ul>
            <li>Which features are popular</li>
            <li>System properties like OS version</li>
            <li>How often people are using Workbench</li>
          </ul>
          We do not collect addresses or private keys.
        </div>
        <Form>
          <Form.Check
            type="switch"
            className="d-inline-block"
            id="analytics-ok-switch"
            label="Yes, enable telemetry"
            checked={analyticsEnabled}
            onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
          />
          <Button
            className="ms-2"
            variant="primary"
            onClick={() => {
              window.electron.ipcRenderer.config({
                action: ConfigAction.Set,
                key: ConfigKey.AnalyticsEnabled,
                val: analyticsEnabled ? 'true' : 'false',
              });
            }}
          >
            <span className="ms-1 text-white">OK</span>
          </Button>
        </Form>
      </div>
    );
  } else {
    mainDisplay = (
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
              <span className="float-end">
                <DropdownButton
                  size="sm"
                  id="dropdown-basic-button"
                  title={netDropdownTitle}
                  onSelect={netDropdownSelect}
                  className="ms-2 float-end"
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
              </span>
            </div>
          </div>
          <div className="row flex-nowrap">
            <Route exact path="/">
              <Accounts />
            </Route>
            <Route path="/validator">
              <Validator />
            </Route>
            <Route path="/anchor">
              <Anchor />
            </Route>
            <Route path="/validatornetworkinfo">
              <ValidatorNetworkInfo />
            </Route>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Switch>{mainDisplay}</Switch>
    </Router>
  );
}
