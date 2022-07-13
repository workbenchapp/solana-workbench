import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import { Accordion, Button, Card } from 'react-bootstrap';
import {
  useConnection,
  useWallet,
  useAnchorWallet,
} from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider } from '@project-serum/anchor';
import * as sol from '@solana/web3.js';
import { logger } from '../common/globals';
import { useInterval, useAppDispatch, useAppSelector } from '../hooks';

import { AccountInfo } from '../data/accounts/accountInfo';
import {
  setAccountValues,
  useAccountMeta,
} from '../data/accounts/accountState';
import {
  truncateSolAmount,
  getHumanName,
  getParsedAccount,
  getTokenAccounts,
  TokenAccountArray,
  forceRequestAccount,
  renderRawData,
  truncateLamportAmount,
} from '../data/accounts/getAccount';
import {
  NetStatus,
  netToURL,
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
import MintTokenToButton from './tokens/MintTokenToButton';
import TransferTokenButton from './tokens/TransferTokenButton';

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

  // create dummy keypair wallet if none is selected by user
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wallet = useAnchorWallet() || {
    signAllTransactions: async (
      transactions: sol.Transaction[]
    ): Promise<sol.Transaction[]> => Promise.resolve(transactions),
    signTransaction: async (
      transaction: sol.Transaction
    ): Promise<sol.Transaction> => Promise.resolve(transaction),
    publicKey: new sol.Keypair().publicKey,
  };

  const [decodedAccountData, setDecodedAccountData] = useState<string>();

  useEffect(() => {
    setDecodedAccountData('');
    const decodeAnchor = async () => {
      try {
        if (
          account?.accountInfo &&
          !account.accountInfo.owner.equals(sol.SystemProgram.programId) &&
          wallet
        ) {
          // TODO: Why do I have to set this every time
          setProvider(
            new AnchorProvider(
              new sol.Connection(netToURL(net)),
              wallet,
              AnchorProvider.defaultOptions()
            )
          );
          const info = account.accountInfo;
          const program = await Program.at(info.owner);

          program?.idl?.accounts?.forEach((accountType) => {
            try {
              const decodedAccount = program.coder.accounts.decode(
                accountType.name,
                info.data
              );
              setDecodedAccountData(JSON.stringify(decodedAccount, null, 2));
            } catch (e) {
              const err = e as Error;
              // TODO: only log when error != invalid discriminator
              if (err.message !== 'Invalid account discriminator') {
                logger.silly(
                  `Account decode failed err="${e}"  attempted_type=${accountType.name}`
                );
              }
            }
          });
        }
      } catch (e) {
        logger.error(e);
        setDecodedAccountData(renderRawData(account));
      }
    };
    decodeAnchor();
  }, [account, net, wallet]);

  useInterval(() => {
    // TODO: really would like to subscribe to a list of accounts - even if its via the getAccounts cache
    if (status !== NetStatus.Running) {
      return;
    }
    if (pubKey) {
      getParsedAccount(net, pubKey)
        .then((info) => {
          if (info) {
            setSelectedAccountInfo(info);
          }
          return info;
        })
        .catch(logger.error);
      getTokenAccounts(net, pubKey)
        .then((b) => setTokenAccounts(b?.value))
        .catch(logger.info);
    } else {
      setSelectedAccountInfo(undefined);
    }
  }, 6666);

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
          <TransferSolButton
            pubKey={pubKey}
            label="Send SOL"
            targetInputDisabled
          />
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
                      {pubKey ? <InlinePK pk={pubKey} /> : 'None selected'}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Assigned Program Id</small>
                    </td>
                    <td>
                      {account ? (
                        <InlinePK
                          pk={account?.accountInfo?.owner?.toString()}
                        />
                      ) : (
                        'Not on chain'
                      )}
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
                <code>{renderRawData(account)}</code>
              </pre>
            </div>
          </div>
          <div className="ms-1">
            <div>
              <small className="text-muted">
                Token Accounts ({tokenAccounts?.length})
              </small>
              {/* this button should only be enabled for accounts that you can create a new mint for... */}
              <CreateNewMintButton
                disabled={
                  fromKey.publicKey?.toString() !== accountPubKey?.toString()
                }
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
                  {tokenAccounts?.map(
                    (tAccount: {
                      pubkey: sol.PublicKey;
                      account: sol.AccountInfo<sol.ParsedAccountData>;
                    }) => {
                      // TODO: extract to its own component
                      return (
                        <Card>
                          <Card.Body>
                            <Card.Title />
                            <Card.Text>
                              <Accordion flush>
                                <Accordion.Item eventKey="1">
                                  <Accordion.Header>
                                    <div>
                                      <b>ATA</b>
                                      <InlinePK
                                        pk={tAccount.pubkey.toString()}
                                        formatLength={9}
                                      />{' '}
                                    </div>
                                    <div>
                                      holds{' '}
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
                                      <MintTokenToButton
                                        disabled={
                                          // TODO: ONLY IF the wallet user has mint-auth (and should mint to this user...)
                                          fromKey.publicKey?.toString() !==
                                          accountPubKey?.toString()
                                        }
                                        connection={connection}
                                        fromKey={fromKey}
                                        mintKey={
                                          new sol.PublicKey(
                                            tAccount.account.data.parsed.info.mint.toString()
                                          )
                                        }
                                        mintTo={accountPubKey}
                                        andThen={(): void => {}}
                                      />
                                      <TransferTokenButton
                                        disabled={
                                          // TODO: ONLY IF the wallet user has permission to mutate this ATA's tokens...
                                          fromKey.publicKey?.toString() !==
                                          accountPubKey?.toString()
                                        }
                                        connection={connection}
                                        fromKey={fromKey}
                                        mintKey={tAccount.account.data.parsed.info.mint.toString()}
                                        transferFrom={pubKey}
                                      />
                                    </div>
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
      {!accountMeta?.privatekey && (
        <div className="ms-1">
          <div>
            <small className="text-muted">Data</small>
          </div>
          <div className="p-2">
            <code className="whitespace-pre-wrap w-full block">
              {decodedAccountData}
            </code>
          </div>
        </div>
      )}
    </Container>
  );
}

export default AccountView;
