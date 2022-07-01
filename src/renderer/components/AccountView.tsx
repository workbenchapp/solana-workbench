import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import * as sol from '@solana/web3.js';
import { Accordion, Button, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { logger } from '@/common/globals';
import { useInterval, useAppDispatch, useAppSelector } from '../hooks';

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
  forceRequestAccount,
} from '../data/accounts/getAccount';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import AirDropSolButton from './AirDropSolButton';
import EditableText from './base/EditableText';
import InlinePK from './InlinePK';
import TransferSolButton from './TransferSolButton';
import { MintInfoView } from './MintInfoView';
import { MetaplexMintMetaDataView } from './tokens/MetaplexMintMetaDataView';
import CreateNewMintButton, {
  ensureAtaFor,
} from './tokens/CreateNewMintButton';

function AccountView(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { net, status } = useAppSelector(selectValidatorNetworkState);
  const dispatch = useAppDispatch();
  const accountMeta = useAccountMeta(pubKey);
  const [humanName, setHumanName] = useState<string>('');
  const accountPubKey = pubKey ? new sol.PublicKey(pubKey) : undefined;
  const fromKey = useWallet(); // pay from wallet adapter
  const { connection } = useConnection();

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
        <div className="flex gap-2 mb-2">
          <AirDropSolButton pubKey={pubKey} />
          <TransferSolButton pubKey={pubKey} />
          <Button
            onClick={() => {
              if (pubKey) {
                forceRequestAccount(net, pubKey);
                // force refresh for ATA's, PDA's etc?
              }
            }}
          >
            Refresh
          </Button>
        </div>
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
                        <EditableText
                          value={humanName}
                          onSave={handleHumanNameSave}
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
              <CreateNewMintButton
                connection={connection}
                fromKey={fromKey}
                myWallet={accountPubKey}
                andThen={(newMint: sol.PublicKey) => {
                  if (!accountPubKey) {
                    return newMint;
                  }
                  ensureAtaFor(connection, fromKey, newMint, accountPubKey); // needed as we create the Mintlist using the ATA's the user wallet has ATA's for...
                  return newMint;
                }}
              />
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
                              ATA: <InlinePK pk={tAccount.pubkey.toString()} />
                              To Mint:{' '}
                              <InlinePK
                                pk={tAccount.account.data.parsed.info.mint.toString()}
                              />
                            </Card.Title>
                            <Card.Text>
                              <Accordion>
                                <Accordion.Item eventKey="1">
                                  <Accordion.Header>
                                    ATA holds{' '}
                                    {
                                      tAccount.account.data.parsed.info
                                        .tokenAmount.amount
                                    }{' '}
                                    tokens (
                                    {truncateSolAmount(
                                      tAccount.account.lamports /
                                        sol.LAMPORTS_PER_SOL
                                    )}{' '}
                                    SOL)
                                    <Button
                                      // extract to mintTokenButton and default to this account, but have a way to select a random pubkey..
                                      size="sm"
                                      disabled={
                                        tAccount.account.data.parsed.info
                                          .mint === undefined
                                      }
                                      onClick={() => {
                                        toast.promise(mintToken(), {
                                          pending: `Mint To ${accountPubKey?.toString()} submitted`,
                                          success: `Mint To ${accountPubKey?.toString()} succeeded 👌`,
                                          error: `Mint To ${accountPubKey?.toString()}  failed 🤯`,
                                        });
                                      }}
                                    >
                                      create
                                    </Button>
                                    <Button
                                      // extract to sendTokenButton with popup to list of pubkeys, and editbox
                                      size="sm"
                                      disabled={
                                        tAccount.account.data.parsed.info
                                          .mint === undefined
                                      }
                                      onClick={() => {
                                        toast.promise(mintToken(), {
                                          pending: `Mint To ${accountPubKey?.toString()} submitted`,
                                          success: `Mint To ${accountPubKey?.toString()} succeeded 👌`,
                                          error: `Mint To ${accountPubKey?.toString()}  failed 🤯`,
                                        });
                                      }}
                                    >
                                      send
                                    </Button>
                                  </Accordion.Header>
                                  <Accordion.Body>
                                    <pre className="exe-hexdump p-2 rounded">
                                      <code>
                                        {JSON.stringify(
                                          tAccount.account,
                                          null,
                                          2
                                        )}
                                      </code>
                                    </pre>
                                  </Accordion.Body>
                                </Accordion.Item>
                                <MintInfoView
                                  mintKey={
                                    tAccount.account.data.parsed.info.mint
                                  }
                                />
                                <MetaplexMintMetaDataView
                                  mintKey={
                                    tAccount.account.data.parsed.info.mint
                                  }
                                />
                              </Accordion>
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
