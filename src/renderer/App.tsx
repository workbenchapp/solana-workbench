import PropTypes from 'prop-types';
import isElectron from 'is-electron';
import './App.scss';
import * as sol from '@solana/web3.js';

import { Routes, Route, NavLink, Outlet } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { Form, Button } from 'react-bootstrap';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  faBook,
  faCoins,
  faTh,
  faAnchor,
  faNetworkWired,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { SizeProp } from '@fortawesome/fontawesome-svg-core';

import { FC, useMemo, useState } from 'react';

import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
// import { LedgerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { ElectronAppStorageWalletAdapter } from './wallet-adapter/electronAppStorage';

import Account from './nav/Account';
import Anchor from './nav/Anchor';
import Validator from './nav/Validator';
import ValidatorNetworkInfo from './nav/ValidatorNetworkInfo';
import TokenView from './nav/TokenView';

import { useAppDispatch, useAppSelector } from './hooks';
import {
  useConfigState,
  setConfigValue,
  ConfigKey,
} from './data/Config/configState';
import { useAccountsState } from './data/accounts/accountState';
import ValidatorNetwork from './data/ValidatorNetwork/ValidatorNetwork';
import {
  netToURL,
  selectValidatorNetworkState,
} from './data/ValidatorNetwork/validatorNetworkState';
import { getElectronStorageWallet } from './data/accounts/account';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

const logger = window.electron.log;

// So we can electron
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    electron?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promiseIpc?: any;
  }
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
      <NavLink /* eventKey={eventKey} */ to={to} className="nav-link">
        <FontAwesomeIcon size={iconsize as SizeProp} icon={icon} /> {title}
      </NavLink>
    </OverlayTrigger>
  );
} // TODO: work out how propTypes work with fontAwesome
TooltipNavItem.propTypes = {
  to: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  tooltipMessage: PropTypes.string.isRequired,
  eventKey: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired, // instanceOf(IconDefinition).isRequired,
  iconsize: PropTypes.string.isRequired,
};
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
          to="/tokens"
          title=""
          tooltipMessage="Tokens"
          eventKey="tokens"
          icon={faCoins}
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
  );
}

function TopbarNavItems() {
  if (isElectron()) {
    return <></>;
  }
  return (
    <>
      <TooltipNavItem
        to="/"
        title="Changes"
        tooltipMessage="Changes"
        eventKey="changes"
        icon={faTh}
        iconsize="xl"
      />
      <TooltipNavItem
        to="/tokens"
        title="Tokens"
        tooltipMessage="Tokens"
        eventKey="tokens"
        icon={faCoins}
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
      />
    </>
  );
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
            <TopbarNavItems />
          </Nav>
          <WalletMultiButton />
          <Form className="d-flex">
            <ValidatorNetwork />
          </Form>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

function AnalyticsBanner() {
  const dispatch = useAppDispatch();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  return (
    <Container>
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
          type="button"
          onClick={() => {
            dispatch(
              setConfigValue({
                key: ConfigKey.AnalyticsEnabled,
                value: analyticsEnabled,
              })
            );
          }}
        >
          <span className="ms-1 text-white">OK</span>
        </Button>
      </Form>
    </Container>
  );
}

export const GlobalContainer: FC = () => {
  const dispatch = useAppDispatch();
  const config = useConfigState();
  const accounts = useAccountsState();
  const { net } = useAppSelector(selectValidatorNetworkState);

  const wallets = useMemo(() => {
    const electronStorageWallet = new ElectronAppStorageWalletAdapter({
      accountFn: (): Promise<sol.Keypair> => {
        if (!config) {
          throw Error(
            "Config not loaded, can't get ElectronWallet keypair yet"
          );
        }

        return getElectronStorageWallet(dispatch, config, accounts);
      },
    });
    return [
      // Sadly, electron apps don't run browser plugins, so these won't work without lots of pain
      // new PhantomWalletAdapter(),
      // new SlopeWalletAdapter(),
      // new SolflareWalletAdapter({ network }),
      // new TorusWalletAdapter(),
      // new LedgerWalletAdapter(),
      // new SolletWalletAdapter({ network }),
      // new SolletExtensionWalletAdapter({ network }),
      electronStorageWallet,
      // new LocalStorageWalletAdapter({ endpoint }),
    ];
  }, [accounts, config, dispatch]);

  if (config.loading || accounts.loading) {
    return <>Config Loading ...${accounts.loading}</>;
  }
  return (
    <div className="vh-100">
      <ConnectionProvider endpoint={netToURL(net)}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Topbar />
            <Sidebar />
            <Container fluid className="page-content mt-3">
              <Outlet />
            </Container>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
};

function App() {
  const config = useConfigState();
  const accounts = useAccountsState();

  Object.assign(console, logger.functions);

  if (config.loading) {
    return <>Config Loading ...${accounts.loading}</>;
  }
  if (!config.values || !(`${ConfigKey.AnalyticsEnabled}` in config.values)) {
    return <AnalyticsBanner />;
  }
  return (
    <div className="vh-100">
      <Routes>
        <Route path="/" element={<GlobalContainer />}>
          <Route index element={<Account />} />
          <Route path="account" element={<Account />} />
          <Route path="tokens" element={<TokenView />} />
          <Route path="validator" element={<Validator />} />
          <Route path="anchor" element={<Anchor />} />
          <Route
            path="validatornetworkinfo"
            element={<ValidatorNetworkInfo />}
          />
        </Route>
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;
