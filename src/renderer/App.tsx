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
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, validatorActions } from './slices/mainSlice';
import { Net } from '../types/types';
import analytics from 'common/analytics';
import Toast from './components/Toast';
import Accounts from './nav/Accounts';
import Anchor from './nav/Anchor';
import Validator from './nav/Validator';

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
    </div>
  );
};

const Header = () => {
  const location = useLocation();
  const routes: Record<string, string> = {
    '/': 'Accounts',
    '/validator': 'Validator',
    '/anchor': 'Anchor',
  };
  return <strong>{routes[location.pathname]}</strong>;
};

export default function App() {
  const dispatch = useDispatch();
  const { toasts } = useSelector((state: RootState) => state.toast);
  const validator = useSelector((state: RootState) => state.validator);
  const { net } = validator;

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      if (method != 'program-changes') {
        console.log(resp);
      }
      switch (method) {
        case 'validator-state':
          dispatch(validatorActions.setRunning(res.running));
          if (res.running) {
            dispatch(validatorActions.setWaitingForRun(false));
          }
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
    if (eventKey) dispatch(validatorActions.setNet(eventKey as Net));
  };

  const netDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faNetworkWired} />{' '}
      <span>{net}</span>
    </>
  );

  let statusDisplay = <></>;

  if (validator.running) {
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
        Unavailable
      </span>
    );
  }

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
                <span className="float-end">
                  {statusDisplay}
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
            </div>
          </div>
        </div>
      </Switch>
    </Router>
  );
}
