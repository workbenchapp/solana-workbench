import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
// import { LedgerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import * as sol from '@solana/web3.js';
import isElectron from 'is-electron';
import { FC, useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { logger } from './common/globals';
import 'react-toastify/dist/ReactToastify.css';
import './App.scss';
import { getElectronStorageWallet } from './data/accounts/account';
import { useAccountsState } from './data/accounts/accountState';
import { ElectronAppStorageWalletAdapter } from './wallet-adapter/electronAppStorage';

import Account from './nav/Account';
import Anchor from './nav/Anchor';
import Validator from './nav/Validator';
import ValidatorNetworkInfo from './nav/ValidatorNetworkInfo';
import TokenPage from './nav/TokenPage';

import { useAppDispatch, useAppSelector } from './hooks';
import {
  ConfigKey,
  setConfigValue,
  useConfigState,
} from './data/Config/configState';
import ValidatorNetwork from './data/ValidatorNetwork/ValidatorNetwork';
import {
  netToURL,
  selectValidatorNetworkState,
} from './data/ValidatorNetwork/validatorNetworkState';

// So we can electron
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    electron?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promiseIpc?: any;
  }
}

const TooltipNavItem: React.FC<{
  to: string;
  tooltipMessage: string;
  eventKey: string;
  children?: React.ReactNode;
}> = ({ to, tooltipMessage, eventKey, children }) => {
  return (
    <OverlayTrigger
      key={`${eventKey}-right`}
      placement="right"
      overlay={<Tooltip id="tooltip-right">{tooltipMessage}</Tooltip>}
    >
      <NavLink /* eventKey={eventKey} */ to={to} className="block p-3">
        {children}
      </NavLink>
    </OverlayTrigger>
  );
};

TooltipNavItem.defaultProps = {
  tooltipMessage: 'placeholder',
  to: '/',
  children: <IconMdiClose />,
  eventKey: 'placeholder',
};

function NavigationIcons() {
  return (
    <>
      <TooltipNavItem to="/" tooltipMessage="Changes" eventKey="changes">
        <IconMdiTable className="block" />
      </TooltipNavItem>
      <TooltipNavItem to="/tokens" tooltipMessage="Tokens" eventKey="tokens">
        <IconMdiCoins />
      </TooltipNavItem>
      <TooltipNavItem
        to="/validator"
        tooltipMessage="Validator"
        eventKey="validator"
      >
        <IconMdiBookOpenOutline className="block" />
      </TooltipNavItem>
      <TooltipNavItem to="/anchor" tooltipMessage="Anchor" eventKey="anchor">
        <IconMdiAnchor className="block" />
      </TooltipNavItem>
      <TooltipNavItem
        to="/validatornetworkinfo"
        tooltipMessage="Network Info"
        eventKey="validatornetworkinfo"
      >
        <IconMdiVectorTriangle className="block" />
      </TooltipNavItem>
    </>
  );
}

function Sidebar() {
  return (
    <nav className="bg-surface-400">
      <NavigationIcons />
    </nav>
  );
}

function Topbar() {
  return (
    <div className="flex items-center p-1 px-2 bg-surface-400">
      <span>Solana Workbench</span>
      <div className="flex-1" />
      {isElectron() ? null : <NavigationIcons />}
      <WalletMultiButton className="h-min" />
      <ValidatorNetwork />
    </div>
  );
}

function AnalyticsBanner() {
  const dispatch = useAppDispatch();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  return (
    <Container className="mt-2 ml-2">
      <div className="mb-2">
        <h3 className="text-xl font-bold">Will you help us out?</h3>
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
      <div className="mb-2">
        <h5>What We Collect</h5>
        <ul>
          <li className="list-disc list-inside">Which features are popular</li>
          <li className="list-disc list-inside">
            System properties like OS version
          </li>
          <li className="list-disc list-inside">
            How often people are using Workbench
          </li>
        </ul>
      </div>
      <div className="mb-2">We do not collect addresses or private keys.</div>
      <Form>
        <Form.Check
          type="switch"
          className="d-inline-block font-medium"
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
    <div className="w-full h-full">
      <ConnectionProvider endpoint={netToURL(net)}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div className="flex flex-col h-full">
              <Topbar />
              <div className="flex flex-1 min-h-0">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                  <Outlet />
                </div>
              </div>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
};

function App() {
  const config = useConfigState();
  const accounts = useAccountsState();

  Object.assign(console, logger?.functions);

  if (config.loading) {
    return <>Config Loading ...${accounts.loading}</>;
  }
  if (!config.values || !(`${ConfigKey.AnalyticsEnabled}` in config.values)) {
    return <AnalyticsBanner />;
  }
  return (
    <>
      <Routes>
        <Route path="/" element={<GlobalContainer />}>
          <Route index element={<Account />} />
          <Route path="account" element={<Account />} />
          <Route path="tokens" element={<TokenPage />} />
          <Route path="validator" element={<Validator />} />
          <Route path="anchor" element={<Anchor />} />
          <Route
            path="validatornetworkinfo"
            element={<ValidatorNetworkInfo />}
          />
        </Route>
      </Routes>
      <ToastContainer position="bottom-right" theme="dark" />
    </>
  );
}

export default App;
