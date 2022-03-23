import {
  MemoryRouter as Router,
  Switch,
  Route,
  NavLink
} from 'react-router-dom';
import PropTypes from 'prop-types'

import './App.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';

import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { SizeProp } from '@fortawesome/fontawesome-svg-core'

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
import { configActions, RootState, validatorActions } from './slices/mainSlice';
import { ConfigAction, ConfigKey, Net, NetStatus } from '../types/types';
import analytics from 'common/analytics';
import Toast from './components/Toast';
import Accounts from './nav/Accounts';
import Anchor from './nav/Anchor';
import Validator from './nav/Validator';
import { Button, Form, Row } from 'react-bootstrap';
import ValidatorNetworkInfo from './nav/ValidatorNetworkInfo';

declare global {
  interface Window {
    electron?: any;
  }
}

const NetworkSelector = () => {
  const validator = useSelector((state: RootState) => state.validator);
  const { net } = validator;
  const dispatch = useDispatch();

  const netDropdownSelect = (eventKey: string | null) => {
    analytics('selectNet', { prevNet: net, newNet: eventKey });
    if (eventKey) dispatch(validatorActions.setNet(eventKey as Net));
  };

  let statusText = validator.status as string
  let statusClass = 'text-danger'
  if (validator.status === NetStatus.Running) {
      statusText = 'Available'
      statusClass = 'sol-green'
  }
  const statusDisplay = (
      <span className="badge p-2">
          <FontAwesomeIcon className={statusClass} icon={faCircle} />
          {statusText}
      </span>
  )

  const netDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faNetworkWired} />{' '}
      <span>{net}</span>
      {statusDisplay}
    </>
  );

  return (
    <DropdownButton
    size="sm"
    id="dropdown-basic-button"
    title={netDropdownTitle}
    onSelect={netDropdownSelect}
    className="ms-2 float-end"
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
  );
}

function TooltipNavItem({
  to = '/',
  title = 'nav',
  tooltipMessage = 'nav tooltip',
  eventKey = 'default',
  icon = faBook,
  iconsize = '1x',
}) {
  return (
      <OverlayTrigger
          key={`${eventKey}-right`}
          placement="right"
          overlay={<Tooltip id="tooltip-right">{tooltipMessage}</Tooltip>}
      >
          <NavLink /*eventKey={eventKey}*/ to={to} className="nav-link">
              <FontAwesomeIcon size={iconsize as SizeProp} icon={icon} /> {title}
          </NavLink>
      </OverlayTrigger>
  )
} // TODO: work out how propTypes work with fontAwesome
TooltipNavItem.propTypes = {
  to: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  tooltipMessage: PropTypes.string.isRequired,
  eventKey: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  iconsize: PropTypes.string.isRequired,
}
// TODO: work out TooltipNavItem.defaults

function Sidebar() {
  return (
      <Navbar className="l-navbar" bg="light" expand="sm">
          <nav className="nav">
              <TooltipNavItem
                  to="/"
                  title=""
                  tooltipMessage="Changes"
                  eventKey="changes"
                  icon={faTh}
                  iconsize="2x"
              />
              <TooltipNavItem
                  to="/validator"
                  title=""
                  tooltipMessage="Validator"
                  eventKey="validator"
                  icon={faBook}
                  iconsize="2x"
              />
              <TooltipNavItem
                  to="/anchor"
                  title=""
                  tooltipMessage="Anchor"
                  eventKey="anchor"
                  icon={faAnchor}
                  iconsize="2x"
              />
              <TooltipNavItem
                  to="/validatornetworkinfo"
                  title=""
                  tooltipMessage="Network Info"
                  eventKey="validatornetworkinfo"
                  icon={faNetworkWired}
                  iconsize="2x"
              />
          </nav>
      </Navbar>
  )
}

function Topbar() {
  return (
      <Navbar sticky="top" bg="primary" variant="dark" expand="sm">
          <Container fluid>
              <Navbar.Brand href="#">Solana Workbench</Navbar.Brand>
              <Navbar.Toggle aria-controls="navbarScroll" />
              <Navbar.Collapse id="navbarScroll">
                  <Nav
                      className="me-auto my-2 my-lg-0"
                      style={{ maxHeight: '100px' }}
                      navbarScroll
                  >
                      {/* <TooltipNavItem
                          to="/"
                          title="Changes"
                          tooltipMessage="Changes"
                          eventKey="changes"
                          icon={faTh}
                          iconsize="xl"
                      />
                      <TooltipNavItem
                          to="/validator"
                          title="Validator"
                          tooltipMessage="Validator"
                          eventKey="validator"
                          icon={faBook}
                          iconsize="xl"
                      />
                      <TooltipNavItem
                          to="/anchor"
                          title="Anchor"
                          tooltipMessage="Anchor"
                          eventKey="anchor"
                          icon={faAnchor}
                          iconsize="xl"
                      />
                      <TooltipNavItem
                          to="/validatornetworkinfo"
                          title="Network Info"
                          tooltipMessage="Network Info"
                          eventKey="validatornetworkinfo"
                          icon={faNetworkWired}
                          iconsize="xl"
                      /> */}
                  </Nav>
                  <Form className="d-flex">
                      <NetworkSelector />
                  </Form>
              </Navbar.Collapse>
          </Container>
      </Navbar>
  )
}


export default function App() {
  const dispatch = useDispatch();
  const { toasts } = useSelector((state: RootState) => state.toast);
  const validator = useSelector((state: RootState) => state.validator);
  const config = useSelector((state: RootState) => state.config);

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



  let mainDisplay = <></>;

  if (!config.loading && !(`${ConfigKey.AnalyticsEnabled}` in config.values)) {
    mainDisplay = (
      <AnalyticsBanner />
    );
  } else {
    mainDisplay = (
      <div className="vh-100">
          <Topbar />
          <Sidebar />
          {toasts.map((t) => (
            <Toast {...t} />
          ))}
        <Container >
        <Row className="mt-3">
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
        </Row>
        </Container>
        </div>
    );
  }

  return (
    <Router>
      <Switch>{mainDisplay}</Switch>
    </Router>
  );
}

const AnalyticsBanner = () => {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  return (
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
}