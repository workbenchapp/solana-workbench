import { toast } from 'react-toastify';
import * as sol from '@solana/web3.js';

import * as walletAdapter from '@solana/wallet-adapter-react';
import { Button } from 'react-bootstrap';
import React from 'react';
import * as walletWeb3 from '../../wallet-adapter/web3';

import { logger } from '@/common/globals';
import { useAppSelector } from '@/hooks';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '@/data/ValidatorNetwork/validatorNetworkState';

async function createNewMint(
  connection: sol.Connection,
  payer: walletAdapter.WalletContextState,
  mintOwner: sol.PublicKey
): Promise<sol.PublicKey> {
  // TODO: extract to createMintButton

  logger.info('createMint', mintOwner.toString());
  // https://github.com/solana-labs/solana-program-library/blob/f487f520bf10ca29bf8d491192b6ff2b4bf89710/token/js/src/actions/createMint.ts
  // const mint = await createMint(
  //   connection,
  //   myWallet, // Payer of the transaction
  //   myWallet.publicKey, // Account that will control the minting
  //   null, // Account that will control the freezing of the token
  //   0 // Location of the decimal place
  // );
  const confirmOptions: sol.ConfirmOptions = {
    commitment: 'finalized',
  };
  // eslint-disable-next-line promise/no-nesting
  return walletWeb3
    .createMint(
      connection,
      payer, // Payer of the transaction
      mintOwner, // Account that will control the minting
      null, // Account that will control the freezing of the token
      0, // Location of the decimal place
      undefined, // mint keypair - will be generated if not specified
      confirmOptions
    )
    .then((newMint) => {
      logger.info('Minted ', newMint.toString());

      return newMint;
    })
    .catch((e) => {
      logger.error(e);
      throw e;
    });
}

export async function ensureAtaFor(
  connection: sol.Connection,
  payer: walletAdapter.WalletContextState,
  newMint: sol.PublicKey,
  ATAFor: sol.PublicKey
): Promise<sol.PublicKey | undefined> {
  // Get the token account of the fromWallet Solana address. If it does not exist, create it.
  logger.info('getOrCreateAssociatedTokenAccount', newMint.toString());

  try {
    const fromTokenAccount = await walletWeb3.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      newMint,
      ATAFor
    );
    // updateFunderATA(fromTokenAccount.address);
    return fromTokenAccount.address;
  } catch (e) {
    logger.error(
      e,
      'getOrCreateAssociatedTokenAccount ensuremyAta',
      newMint.toString()
    );
  }
  return undefined;
}

function CreateNewMintButton(props: {
  connection: sol.Connection;
  fromKey: walletAdapter.WalletContextState;
  myWallet: sol.PublicKey | undefined;
  disabled: boolean;
  andThen: (newMint: sol.PublicKey) => sol.PublicKey;
}) {
  const { connection, fromKey, myWallet, andThen, disabled } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <Button
      size="sm"
      // TODO: this button should be disabled if the selected mint (or account) exists
      disabled={
        disabled || status !== NetStatus.Running || myWallet === undefined
      }
      onClick={(e) => {
        e.stopPropagation();
        if (!myWallet) {
          return;
        }

        toast.promise(
          createNewMint(connection, fromKey, myWallet).then((newMint) => {
            return andThen(newMint);
          }),
          {
            pending: `Create mint account submitted`,
            success: `Create mint account succeeded 👌`,
            error: `Create mint account failed 🤯`,
          }
        );
      }}
    >
      New token mint
    </Button>
  );
}

export default CreateNewMintButton;
