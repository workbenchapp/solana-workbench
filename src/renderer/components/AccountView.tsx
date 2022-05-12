import { useState, useEffect } from 'react';
import {
  faTerminal,
  faEdit,
  faSave,
  faCancel,
  faKey,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from 'react-bootstrap/Container';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import EdiText from 'react-editext';
import Table from 'react-bootstrap/Table';
import * as sol from '@solana/web3.js';
import * as spltoken from '@solana/spl-token';
import { useInterval, useAppSelector, useAppDispatch } from '../hooks';

import analytics from '../common/analytics';
import { AccountInfo } from '../data/accounts/accountInfo';
import {
  setAccountValues,
  useAccountMeta,
} from '../data/accounts/accountState';
import {
  truncateLamportAmount,
  truncateSolAmount,
  getHumanName,
  renderData,
  getAccount,
  getTokenAccounts,
  TokenAccountArray,
  getTokenMetadata,
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
function tryExpandingTokenMeta(net: Net, mintKey: sol.PublicKey) {
  let moreInfo = 'NONE';
  try {
    const meta = getTokenMetadata(net, mintKey.toString());
    meta
      .then((m) => {
        logger.info('getTokenMetadata', m.data.data.symbol);
        moreInfo = JSON.stringify(m.data);
        return m;
      })
      .catch(logger.error);
    // moreInfo = JSON.stringify(meta);
    // moreInfo = 'what';
  } catch (e) {
    moreInfo = JSON.stringify(e);
    logger.error('getTokenMetadata', e);
  }

  return (
    <div>
      <div>
        mint: <InlinePK pk={mintKey.toString()} />
      </div>
      <div>{moreInfo}</div>{' '}
    </div>
  );
}
function tryExpandingTokenState(
  net: Net,
  tAccount: {
    pubkey: sol.PublicKey;
    account: sol.AccountInfo<sol.ParsedAccountData>;
  }
) {
  const accountState = tAccount.account.data.parsed.info as spltoken.Account;

  return (
    <div>
      <div>
        Mint: <InlinePK pk={accountState.mint} />:{' '}
        {accountState.tokenAmount.amount} tokens
      </div>
      <div>
        token metaplex:
        {tryExpandingTokenMeta(net, accountState.mint)}
      </div>
    </div>
  );
}

function AccountView(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { net, status } = useAppSelector(selectValidatorNetworkState);
  const dispatch = useAppDispatch();
  const accountMeta = useAccountMeta(pubKey);
  const [humanName, setHumanName] = useState<string>('');

  const [account, setSelectedAccountInfo] = useState<AccountInfo | undefined>(
    undefined
  );
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccountArray>([]);

  useInterval(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    if (pubKey) {
      getAccount(net, pubKey)
        .then((a) => setSelectedAccountInfo(a))
        .catch(logger.info);
      getTokenAccounts(net, pubKey)
        .then((b) => setTokenAccounts(b?.value))
        .catch(logger.info);
    } else {
      setSelectedAccountInfo(undefined);
    }
  }, 666);

  useEffect(() => {
    const alias = getHumanName(accountMeta);
    setHumanName(alias);
    logger.info(`get human name for pubKey ${pubKey} == ${alias}`);
  }, [pubKey, accountMeta]);

  const handleHumanNameSave = (val: string) => {
    if (!pubKey) {
      return;
    }
    dispatch(
      setAccountValues({
        key: pubKey,
        value: {
          ...accountMeta,
          humanname: val,
        },
      })
    );
  };

  // const humanName = getHumanName(accountMeta);
  return (
    <Container>
      <ButtonToolbar aria-label="Toolbar with button groups">
        <ButtonGroup size="sm" className="me-2" aria-label="First group">
          <AirDropSolButton pubKey={pubKey} />
          <TransferSolButton pubKey={pubKey} />
        </ButtonGroup>
      </ButtonToolbar>

      <div className="row">
        <div className="col">
          <div className="row">
            <div className="col col-md-12  ">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="col-md-4">
                      <div className="align-center">
                        <div>
                          <small className="text-muted">Editable Alias</small>
                        </div>
                      </div>
                    </td>
                    <td className="col-md-8">
                      <small>
                        <EdiText
                          submitOnEnter
                          cancelOnEscape
                          buttonsAlign="after"
                          type="text"
                          value={humanName}
                          onSave={handleHumanNameSave}
                          hideIcons
                          editButtonContent={<FontAwesomeIcon icon={faEdit} />}
                          saveButtonContent={<FontAwesomeIcon icon={faSave} />}
                          cancelButtonContent={
                            <FontAwesomeIcon icon={faCancel} />
                          }
                        />
                      </small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Address</small>
                    </td>
                    <td>
                      <small>
                        {pubKey ? <InlinePK pk={pubKey} /> : 'None selected'}
                      </small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Assigned Program Id</small>
                    </td>
                    <td>
                      <small>
                        --{account?.programID}--
                        {account ? (
                          <InlinePK pk={account.programID} />
                        ) : (
                          'Not on chain'
                        )}
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
                      {account?.accountInfo?.executable ? (
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
                      <small className="text-muted">Private key known</small>
                    </td>
                    <td>
                      {accountMeta?.privatekey ? (
                        <div>
                          <FontAwesomeIcon
                            className="border-success rounded p-1 exe-icon"
                            icon={faKey}
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
          <div className="ms-1">
            <div>
              <small className="text-muted">
                Token Accounts ({tokenAccounts.length})
              </small>
            </div>
            <div>
              <Table hover size="sm">
                <tbody>
                  {tokenAccounts.map(
                    (tAccount: {
                      pubkey: sol.PublicKey;
                      account: sol.AccountInfo<sol.ParsedAccountData>;
                    }) => {
                      // TODO: extract to its own component
                      return (
                        <div>
                          <div>
                            ATA: <InlinePK pk={tAccount.pubkey.toString()} />:{' '}
                            {tAccount.account.data.program.toString()}:
                          </div>
                          <div>
                            <div>
                              {truncateSolAmount(
                                tAccount.account.lamports / sol.LAMPORTS_PER_SOL
                              )}{' '}
                              SOL
                            </div>
                            <div>
                              state: {tAccount.account.data.parsed.info.state}
                            </div>
                            <pre className="exe-hexdump p-2 rounded">
                              <code>
                                {JSON.stringify(tAccount.account.data.parsed)}
                              </code>
                            </pre>
                            <div>
                              token state:
                              {tryExpandingTokenState(net, tAccount)}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default AccountView;
