import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Container from 'react-bootstrap/Container';
import { Program, AnchorProvider, setProvider } from '@project-serum/anchor';
import * as sol from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { logger } from '@/common/globals';
import analytics from '../common/analytics';
import { AccountInfo } from '../data/accounts/accountInfo';
import {
  setAccountValues,
  useAccountMeta,
} from '../data/accounts/accountState';
import {
  getAccount,
  getHumanName,
  renderRawData,
  truncateLamportAmount,
} from '../data/accounts/getAccount';
import {
  Net,
  NetStatus,
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAppDispatch, useAppSelector, useInterval } from '../hooks';
import AirDropSolButton from './AirDropSolButton';
import EditableText from './base/EditableText';
import InlinePK from './InlinePK';
import TransferSolButton from './TransferSolButton';

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
  const dispatch = useAppDispatch();
  const accountMeta = useAccountMeta(pubKey);
  const [humanName, setHumanName] = useState<string>('');

  const [account, setSelectedAccountInfo] = useState<AccountInfo | undefined>(
    undefined
  );

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
    if (status !== NetStatus.Running) {
      return;
    }
    if (pubKey) {
      setSelectedAccountInfo(getAccount(net, pubKey));
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
        </div>
      </ButtonToolbar>
      <div>
        <table>
          <tbody>
            <tr>
              <td className="col-md-4">
                <div className="align-center">
                  <div>
                    <small className="text-gray-400">Editable Alias</small>
                  </div>
                </div>
              </td>
              <td className="col-md-8">
                <small>
                  <EditableText
                    value={humanName}
                    onSave={handleHumanNameSave}
                    type="text"
                  />
                </small>
              </td>
            </tr>
            <tr>
              <td>
                <small className="text-muted">Pubkey</small>
              </td>
              <td>
                <small>
                  {pubKey ? (
                    <InlinePK format pk={pubKey} formatLength={6} />
                  ) : (
                    'None selected'
                  )}
                </small>
              </td>
            </tr>
            <tr>
              <td>
                <small className="text-muted">SOL</small>
              </td>
              <td>
                <small>{account ? truncateLamportAmount(account) : 0}</small>
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
                  <small className="fst-italic fw-light text-muted">No</small>
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
                    <IconMdiKey className="inline-block" />
                    <small className="ml-2">Yes</small>
                  </div>
                ) : (
                  <small className="fst-italic fw-light text-muted">No</small>
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
                      onClick={() => analytics('clickExplorerLink', { net })}
                      href={explorerURL(net, account.accountId.toString())}
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
