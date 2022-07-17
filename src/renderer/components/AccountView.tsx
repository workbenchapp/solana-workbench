import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Container from 'react-bootstrap/Container';
import { Button } from 'react-bootstrap';
import {
  useConnection,
  useWallet,
  useAnchorWallet,
} from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider } from '@project-serum/anchor';
import * as sol from '@solana/web3.js';
import { useQueryClient } from 'react-query';
import { logger } from '../common/globals';
import { useAppDispatch, useAppSelector } from '../hooks';

import {
  setAccountValues,
  useAccountMeta,
} from '../data/accounts/accountState';
import {
  getHumanName,
  forceRequestAccount,
  renderRawData,
  truncateLamportAmount,
  useParsedAccount,
} from '../data/accounts/getAccount';
import {
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import AirDropSolButton from './AirDropSolButton';
import EditableText from './base/EditableText';
import InlinePK from './InlinePK';
import TransferSolButton from './TransferSolButton';

import CreateNewMintButton, {
  ensureAtaFor,
} from './tokens/CreateNewMintButton';

import { TokensListView } from './tokens/TokensListView';

function AccountView(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);
  const dispatch = useAppDispatch();
  const accountMeta = useAccountMeta(pubKey);
  const [humanName, setHumanName] = useState<string>('');
  const accountPubKey = pubKey ? new sol.PublicKey(pubKey) : undefined;
  const fromKey = useWallet(); // pay from wallet adapter
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  const { /* loadStatus, */ account /* , error */ } = useParsedAccount(
    net,
    pubKey,
    {}
  );

  // ("idle" or "error" or "loading" or "success").
  // TODO: this can't be here before the query
  // TODO: there's a better way in query v4 - https://tkdodo.eu/blog/offline-react-query

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

  useEffect(() => {
    const alias = getHumanName(accountMeta);
    setHumanName(alias);
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
            targetPlaceholder="Select an Address"
            targetInputDisabled
          />
          <Button
            onClick={() => {
              if (pubKey) {
                forceRequestAccount(net, pubKey);
                // force refresh for ATA's, PDA's etc?
                queryClient.invalidateQueries(); // TODO: this is too broad
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
              <small className="text-muted">Data :</small>
            </div>
            <div>
              <pre className="exe-hexdump p-2 rounded">
                <code>{decodedAccountData}</code>
              </pre>
            </div>
          </div>

          <div className="ms-1">
            <div>
              <small className="text-muted">Token Accounts</small>
              {/* this button should only be enabled for accounts that you can create a new mint for... */}
              <CreateNewMintButton
                disabled={
                  !account?.accountInfo ||
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
              <TokensListView pubKey={pubKey} />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default AccountView;
