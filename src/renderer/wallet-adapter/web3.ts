import * as sol from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import {
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { SendTransactionOptions } from '@solana/wallet-adapter-base';

/**
 * Create and initialize a new mint
 *
 * @param connection      Connection to use
 * @param payer           Payer of the transaction and initialization fees (can be a wallet-adapter context state for offloading signing and sending)
 * @param mintAuthority   Account or multisig that will control minting
 * @param freezeAuthority Optional account or multisig that can freeze token accounts
 * @param decimals        Location of the decimal place
 * @param keypair         Optional keypair, defaulting to a new random one
 * @param confirmOptions  Options for confirming the transaction
 * @param programId       SPL Token program account
 *
 * @return Address of the new mint
 */
// https://github.com/solana-labs/solana-program-library/blob/f487f520bf10ca29bf8d491192b6ff2b4bf89710/token/js/src/actions/createMint.ts
export async function createMint(
  connection: sol.Connection,
  payer: sol.Signer | WalletContextState,
  mintAuthority: sol.PublicKey,
  freezeAuthority: sol.PublicKey | null,
  decimals: number,
  keypair = sol.Keypair.generate(),
  confirmOptions?: sol.ConfirmOptions,
  programId = splToken.TOKEN_PROGRAM_ID
): Promise<sol.PublicKey> {
  if (!payer || !payer.publicKey) {
    throw Error("Can't create a Mint without a payer Keypair or Wallet");
  }

  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const transaction = new sol.Transaction().add(
    sol.SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: keypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId,
    }),
    createInitializeMintInstruction(
      keypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      programId
    )
  );

  if ('privateKey' in payer) {
    // payer is a sol.Signer
    await sol.sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, keypair],
      confirmOptions
    );
  } else if ('sendTransaction' in payer) {
    // payer is a WalletContextState
    const options: SendTransactionOptions = { signers: [keypair] };
    const signature = await payer.sendTransaction(
      transaction,
      connection,
      options
    );

    // await connection.confirmTransaction(signature, confirmOptions?.commitment);
    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      },
      confirmOptions?.commitment
    );
  } else {
    throw Error('payer not a Keypair or Wallet.');
  }

  return keypair.publicKey;
}

export default {};
