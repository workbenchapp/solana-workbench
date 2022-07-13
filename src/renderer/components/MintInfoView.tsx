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
import { useQuery } from 'react-query';
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

type Params = {
  queryKey: [string, { net: Net; pubKey: string }];
};
async function queryParsedAccount(params: Params) {
  const [, { net, pubKey }] = params.queryKey;
  // const response = await fetch(`https://swapi.dev/api/people/${id}/`);
  // if (!response.ok) {
  //   throw new Error("Problem fetching data");
  // }
  // const character = await response.json();
  // assertIsCharacter(character);

  const accountInfo = await getParsedAccount(net, pubKey);
  if (!accountInfo) {
    throw Error(`${pubKey} Not found`);
  }

  return accountInfo;
}

export function MintInfoView(props: { mintKey: string }) {
  const { mintKey } = props;
  const fromKey = useWallet();
  const { connection } = useConnection();
  const { net, status: netStatus } = useAppSelector(
    selectValidatorNetworkState
  );

  const {
    status: loadStatus,
    error,
    data: mintInfo,
  } = useQuery<sol.AccountInfo<sol.ParsedAccountData>, Error>(
    ['parsed-account', { net, pubKey: mintKey }],
    queryParsedAccount
  );
  logger.info(`useQuery: ${loadStatus} - error: ${error}`);

  // ("idle" or "error" or "loading" or "success").
  if (loadStatus !== 'success') {
    return (
      <Accordion.Item eventKey={`${mintKey}_info`}>
        <Accordion.Header>Loading info</Accordion.Header>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  logger.info('mintInfo:', JSON.stringify(mintInfo));
  const hasAuthority =
    mintInfo.accountInfo.data?.parsed.info.mintAuthority ===
    fromKey.publicKey?.toString();
  const mintAuthorityIsNull =
    !mintInfo?.accountInfo.data?.parsed.info.mintAuthority;

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
