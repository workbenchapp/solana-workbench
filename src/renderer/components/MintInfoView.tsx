import React from 'react';
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
  truncateSolAmount,
  useParsedAccount,
} from '../data/accounts/getAccount';
import { selectValidatorNetworkState } from '../data/ValidatorNetwork/validatorNetworkState';

import { logger } from '../common/globals';
import InlinePK from './InlinePK';
import ActiveAccordionHeader from './tokens/ActiveAccordionHeader';

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
  const { net } = useAppSelector(selectValidatorNetworkState);

  const {
    loadStatus,
    account: mintInfo,
    // error,
  } = useParsedAccount(net, mintKey, {
    retry: 2, // TODO: this is here because sometimes, we get given an accountInfo with no parsed data.
  });
  // logger.silly(
  //   `MintInfoView(${mintKey}): ${loadStatus} - ${error}: ${JSON.stringify(
  //     mintInfo
  //   )}`
  const mintEventKey = `${mintKey}_mint_info`;

  // ("idle" or "error" or "loading" or "success").
  if (
    loadStatus !== 'success' ||
    !mintInfo ||
    !mintInfo.accountInfo ||
    !mintInfo.accountInfo.data?.parsed
  ) {
    // logger.error(`something not ready: ${loadStatus}`);

    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          Loading info
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  // logger.info('mintInfo:', JSON.stringify(mintInfo));
  const hasAuthority =
    mintInfo.accountInfo.data?.parsed.info.mintAuthority ===
    fromKey.publicKey?.toString();
  const mintAuthorityIsNull =
    !mintInfo?.accountInfo.data?.parsed.info.mintAuthority;

  if (!mintInfo || mintInfo?.data) {
    // logger.error(`something undefined`);
    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          Loading info
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  return (
    <Accordion.Item eventKey={mintEventKey}>
      <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
        <div className="col">
          <b>Mint</b>
          <InlinePK pk={mintKey} formatLength={9} />
        </div>
        <div>
          holds {mintInfo?.accountInfo.data?.parsed.info.supply} tokens (
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
      </ActiveAccordionHeader>
      <Accordion.Body>
        <pre className="exe-hexdump p-2 rounded">
          <code>Mint info: {JSON.stringify(mintInfo, null, 2)}</code>
        </pre>
      </Accordion.Body>
    </Accordion.Item>
  );
}

export default MintInfoView;
