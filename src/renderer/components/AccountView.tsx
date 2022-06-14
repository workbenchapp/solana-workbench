import { useState, useEffect } from 'react';
import {
  faTerminal,
  faEdit,
  faSave,
  faCancel,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from 'react-bootstrap/Container';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import EdiText from 'react-editext';
import Table from 'react-bootstrap/Table';
import * as sol from '@solana/web3.js';
import * as spltoken from '@solana/spl-token';
import { Card } from 'react-bootstrap';
import { useInterval, useAppSelector, useAppDispatch } from '../hooks';

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
} from '../data/accounts/getAccount';
import {
  Net,
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import InlinePK from './InlinePK';

import TransferSolButton from './TransferSolButton';
import AirDropSolButton from './AirDropSolButton';
import { TokenMetaView } from './TokenView';

const logger = window.electron.log;

function tryExpandingTokenState(
  _net: Net,
  tAccount: {
    pubkey: sol.PublicKey;
    account: sol.AccountInfo<sol.ParsedAccountData>;
  }
) {
  const accountState = tAccount.account.data.parsed.info as spltoken.Account;

  return (
    <div>
      <div>
        {tAccount.account.data.parsed.type}:{' '}
        <InlinePK pk={accountState.mint.toString()} />:{' '}
        {accountState.tokenAmount.amount} tokens
      </div>
      <div>
        <TokenMetaView mintKey={accountState.mint} />
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
                      <div>
                        {account ? (
                          <InlinePK
                            pk={account?.accountInfo?.owner?.toString()}
                          />
                        ) : (
                          'Not on chain'
                        )}
                      </div>
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
                        <Card>
                          <Card.Body>
                            <Card.Title>
                              ATA: <InlinePK pk={tAccount.pubkey.toString()} />:{' '}
                              Program:{' '}
                              {tAccount.account.data.program.toString()}
                            </Card.Title>
                            <Card.Text>
                              <div>
                                {truncateSolAmount(
                                  tAccount.account.lamports /
                                    sol.LAMPORTS_PER_SOL
                                )}{' '}
                                SOL
                              </div>
                              <div>
                                state: {tAccount.account.data.parsed.info.state}
                              </div>
                              <pre className="exe-hexdump p-2 rounded">
                                <code>
                                  {JSON.stringify(tAccount.account, null, 2)}
                                </code>
                              </pre>
                              <div>
                                token state:
                                {tryExpandingTokenState(net, tAccount)}
                              </div>
                            </Card.Text>
                          </Card.Body>
                        </Card>
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
