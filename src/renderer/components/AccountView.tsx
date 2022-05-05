import { useState } from 'react';
import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from 'react-bootstrap/Container';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import { useInterval, useAppSelector } from '../hooks';

import analytics from '../common/analytics';
import { AccountInfo } from '../data/accounts/accountInfo';
import {
  truncateLamportAmount,
  getHumanName,
  renderData,
  getAccount,
} from '../data/accounts/getAccount';
import {
  Net,
  NetStatus,
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import InlinePK from './InlinePK';

import TransferSolButton from './TransferSolButton';
import AirDropSolButton from './AirDropSolButton';

const logger = window.electron.log;

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

function AccountView(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  const [account, setSelectedAccountInfo] = useState<AccountInfo | undefined>(
    undefined
  );

  useInterval(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    if (pubKey) {
      getAccount(net, pubKey)
        .then((a) => setSelectedAccountInfo(a))
        .catch(logger.info);
    } else {
      setSelectedAccountInfo(undefined);
    }
  }, 666);

  const humanName = account
    ? getHumanName(account)
    : 'No on-chain account selected';
  return (
    <Container>
      <ButtonToolbar aria-label="Toolbar with button groups">
        <ButtonGroup size="sm" className="me-2" aria-label="First group">
          <AirDropSolButton pubKey={pubKey} />
          <TransferSolButton pubKey={pubKey} />
        </ButtonGroup>
      </ButtonToolbar>
      <div className="row">
        <div className="col-auto">
          <div>
            <h6 className="ms-1">
              {humanName !== '' ? humanName : <div>&nbsp;</div>}
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
                        {pubKey ? <InlinePK pk={pubKey} /> : 'None selected'}
                      </small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">SOL</small>
                    </td>
                    <td>
                      <small>
                        {account ? truncateLamportAmount(account) : 0}
                      </small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Executable</small>
                    </td>
                    <td>
                      {account?.accountInfo.executable ? (
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
                        {account ? (
                          <a
                            onClick={() =>
                              analytics('clickExplorerLink', { net })
                            }
                            href={explorerURL(
                              net,
                              account.accountId.toString()
                            )}
                            target="_blank"
                            className="sol-link"
                            rel="noreferrer"
                          >
                            Link
                          </a>
                        ) : (
                          'No onchain account'
                        )}
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="ms-1">
            <div>
              <small className="text-muted">Data</small>
            </div>
            <div>
              <pre className="exe-hexdump p-2 rounded">
                <code>{renderData(account)}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default AccountView;
