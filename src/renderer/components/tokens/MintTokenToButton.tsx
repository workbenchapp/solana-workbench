import { toast } from 'react-toastify';
import * as sol from '@solana/web3.js';

import * as walletAdapter from '@solana/wallet-adapter-react';
import { Button } from 'react-bootstrap';
import React from 'react';
import * as walletWeb3 from '../../wallet-adapter/web3';

import { logger } from '../../common/globals';
import { useAppSelector } from '../../hooks';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../../data/ValidatorNetwork/validatorNetworkState';
import { ensureAtaFor } from './CreateNewMintButton';

async function mintToken(
  connection: sol.Connection,
  payer: walletAdapter.WalletContextState,
  mintKey: sol.PublicKey,
  mintTo: sol.PublicKey
) {
  if (!mintTo) {
    logger.info('no mintTo', mintTo);
    return;
  }
  if (!mintKey) {
    logger.info('no mintKey', mintKey);
    return;
  }
  if (!payer.publicKey) {
    logger.info('no payer.publicKey', payer.publicKey);
    return;
  }
  const tokenAta = await ensureAtaFor(connection, payer, mintKey, mintTo);
  if (!tokenAta) {
    logger.info('no tokenAta', tokenAta);
    return;
  }

  // Minting 1 new token to the "fromTokenAccount" account we just returned/created.
  const signature = await walletWeb3.mintTo(
    connection,
    payer, // Payer of the transaction fees
    mintKey, // Mint for the account
    tokenAta, // Address of the account to mint to
    payer.publicKey, // Minting authority
    1 // Amount to mint
  );
  logger.info('SIGNATURE', signature);
}

function MintTokenToButton(props: {
  connection: sol.Connection;
  fromKey: walletAdapter.WalletContextState;
  mintKey: sol.PublicKey | undefined;
  mintTo: sol.PublicKey | undefined;
  disabled: boolean;
  andThen: () => void;
}) {
  const { connection, fromKey, mintKey, mintTo, andThen, disabled } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <Button
      size="sm"
      // TODO: this button should be disabled if the selected mint (or account) exists
      disabled={
        disabled || status !== NetStatus.Running || mintTo === undefined
      }
      onClick={(e) => {
        e.stopPropagation();
        if (!mintTo) {
          return;
        }
        if (!mintKey) {
          return;
        }

        toast.promise(
          mintToken(connection, fromKey, mintKey, mintTo).then(() => {
            return andThen();
          }),
          {
            pending: `Mint To ${mintTo.toString()} submitted`,
            success: `Mint To ${mintTo.toString()} succeeded 👌`,
            error: `Mint To ${mintTo.toString()} failed 🤯`,
          }
        );
      }}
    >
      mint token
    </Button>
  );
}

export default MintTokenToButton;
