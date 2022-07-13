import React, { useEffect, useState } from 'react';
import * as sol from '@solana/web3.js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  useConnection,
  useWallet,
  WalletContextState,
} from '@solana/wallet-adapter-react';
import * as walletWeb3 from '../wallet-adapter/web3';
import { useAppSelector } from '../hooks';

import {
  getParsedAccount,
  truncateSolAmount,
} from '../data/accounts/getAccount';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

import { logger } from '../common/globals';
import InlinePK from './InlinePK';

// TODO: need to trigger an update of a component like this automatically when the cetAccount cache notices a change...
export async function closeMint(
  connection: sol.Connection,
  fromKey: WalletContextState,
  mintKey: sol.PublicKey,
  myWallet: sol.PublicKey
) {
  if (!myWallet) {
    logger.info('no myWallet', myWallet);
    return;
  }
  if (!mintKey) {
    logger.info('no mintKey', mintKey);
    return;
  }

  await walletWeb3.setAuthority(
    connection,
    fromKey, // Payer of the transaction fees
    mintKey, // Account
    myWallet, // Current authority
    'MintTokens', // Authority type: "0" represents Mint Tokens
    null // Setting the new Authority to null
  );
}

export function MintInfoView(props: { mintKey: string }) {
  const { mintKey } = props;
  const fromKey = useWallet();
  const { connection } = useConnection();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: need to figure out why we're not displaying the parsed data
  const [mintInfo, updateMintInfo] =
    useState<sol.AccountInfo<sol.ParsedAccountData> | null>();
  const [mintedTokens, setMintedTokens] = useState<number>(0);
  const [hasAuthority, setHasAuthority] = useState(false);
  const [mintAuthorityIsNull, setMintAuthorityIsNull] = useState(false);

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    try {
      // TODO: extract this as its needed for all mint buttons :/
      getParsedAccount(net, mintKey)
        .then((account) => {
          logger.info('got it', account);
          if (account) {
            updateMintInfo(account);
            if (account.accountInfo) {
              setMintedTokens(account.accountInfo.data?.parsed.info.supply);
              setHasAuthority(
                account.accountInfo.data?.parsed.info.mintAuthority ===
                  fromKey.publicKey?.toString()
              );
              if (!account.accountInfo.data?.parsed.info.mintAuthority) {
                setMintAuthorityIsNull(true);
              } else {
                setMintAuthorityIsNull(false);
              }
            }
          }
          return account;
        })
        .catch((err) => {
          logger.error('WHAT', err);
        });
    } catch (e) {
      // moreInfo = JSON.stringify(e);
      logger.error('getParsedAccount what', e);
    }
  }, [fromKey.publicKey, mintKey, net, status]);

  logger.info('mintInto:', JSON.stringify(mintInfo));

  if (!mintInfo || mintInfo?.data) {
    return (
      <Accordion.Item eventKey={`${mintKey}_info`}>
        <Accordion.Header>Loading info</Accordion.Header>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  return (
    <Accordion.Item eventKey={`${mintKey}_info`}>
      <Accordion.Header>
        <div className="col">
          <b>Mint</b>
          <InlinePK pk={mintKey} formatLength={9} />
        </div>
        <div>
          holds{' '}
          {mintedTokens /* mintInto?.accountInfo.data?.parsed.info.supply */}{' '}
          tokens (
          {truncateSolAmount(
            mintInfo?.accountInfo?.lamports / sol.LAMPORTS_PER_SOL
          )}{' '}
          SOL)
        </div>
        <div>
          <Button
            size="sm"
            disabled={!hasAuthority || mintKey === undefined}
            onClick={() => {
              if (!fromKey.publicKey) {
                return;
              }
              toast.promise(
                closeMint(
                  connection,
                  fromKey,
                  new sol.PublicKey(mintKey),
                  fromKey.publicKey
                ),
                {
                  pending: `Close mint account submitted`,
                  success: `Close mint account  succeeded 👌`,
                  error: `Close mint account   failed 🤯`,
                }
              );
            }}
          >
            {mintAuthorityIsNull ? 'Mint closed' : 'Close Mint'}
          </Button>
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <pre className="exe-hexdump p-2 rounded">
          <code>Mint info: {JSON.stringify(mintInfo, null, 2)}</code>
        </pre>
      </Accordion.Body>
    </Accordion.Item>
  );
}

export default MintInfoView;
