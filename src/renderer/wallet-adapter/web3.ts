import * as sol from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import {
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
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
    splToken.createInitializeMintInstruction(
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

// https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/actions/getOrCreateAssociatedTokenAccount.ts
/**
 * Retrieve the associated token account, or create it if it doesn't exist
 *
 * @param connection               Connection to use
 * @param payer                    Payer of the transaction and initialization fees
 * @param mint                     Mint associated with the account to set or verify
 * @param owner                    Owner of the account to set or verify
 * @param allowOwnerOffCurve       Allow the owner account to be a PDA (Program Derived Address)
 * @param commitment               Desired level of commitment for querying the state
 * @param confirmOptions           Options for confirming the transaction
 * @param programId                SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 *
 * @return Address of the new associated token account
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: sol.Connection,
  payer: sol.Signer | WalletContextState,
  mint: sol.PublicKey,
  owner: sol.PublicKey,
  allowOwnerOffCurve = false,
  commitment?: sol.Commitment,
  confirmOptions?: sol.ConfirmOptions,
  programId = splToken.TOKEN_PROGRAM_ID,
  associatedTokenProgramId = splToken.ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<splToken.Account> {
  const associatedToken = await splToken.getAssociatedTokenAddress(
    mint,
    owner,
    allowOwnerOffCurve,
    programId,
    associatedTokenProgramId
  );

  // This is the optimal logic, considering TX fee, client-side computation, RPC roundtrips and guaranteed idempotent.
  // Sadly we can't do this atomically.
  let account: splToken.Account;
  try {
    account = await splToken.getAccount(
      connection,
      associatedToken,
      commitment,
      programId
    );
  } catch (error: unknown) {
    // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
    // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
    // TokenInvalidAccountOwnerError in this code path.
    if (
      error instanceof splToken.TokenAccountNotFoundError ||
      error instanceof splToken.TokenInvalidAccountOwnerError
    ) {
      // As this isn't atomic, it's possible others can create associated accounts meanwhile.
      try {
        const transaction = new sol.Transaction().add(
          splToken.createAssociatedTokenAccountInstruction(
            payer.publicKey,
            associatedToken,
            owner,
            mint,
            programId,
            associatedTokenProgramId
          )
        );

        // await sendAndConfirmTransaction(
        //   connection,
        //   transaction,
        //   [payer],
        //   confirmOptions
        // );
        if ('privateKey' in payer) {
          // payer is a sol.Signer
          await sol.sendAndConfirmTransaction(
            connection,
            transaction,
            [payer],
            confirmOptions
          );
        } else if ('sendTransaction' in payer) {
          // payer is a WalletContextState
          const options: SendTransactionOptions = {};
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
      } catch (error2: unknown) {
        // Ignore all errors; for now there is no API-compatible way to selectively ignore the expected
        // instruction error if the associated account exists already.
      }

      // Now this should always succeed
      account = await splToken.getAccount(
        connection,
        associatedToken,
        commitment,
        programId
      );
    } else {
      throw error;
    }
  }

  if (!account.mint.equals(mint)) throw new splToken.TokenInvalidMintError();
  if (!account.owner.equals(owner)) throw new splToken.TokenInvalidOwnerError();

  return account;
}

// ARGH!
// https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/actions/internal.ts
export function getSigners(
  signerOrMultisig: sol.Signer | sol.PublicKey,
  multiSigners: sol.Signer[]
): [sol.PublicKey, sol.Signer[]] {
  return signerOrMultisig instanceof sol.PublicKey
    ? [signerOrMultisig, multiSigners]
    : [signerOrMultisig.publicKey, [signerOrMultisig]];
}

// https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/actions/mintTo.ts
/**
 * Mint tokens to an account
 *
 * @param connection     Connection to use
 * @param payer          Payer of the transaction fees
 * @param mint           Mint for the account
 * @param destination    Address of the account to mint to
 * @param authority      Minting authority
 * @param amount         Amount to mint
 * @param multiSigners   Signing accounts if `authority` is a multisig
 * @param confirmOptions Options for confirming the transaction
 * @param programId      SPL Token program account
 *
 * @return Signature of the confirmed transaction
 */
export async function mintTo(
  connection: sol.Connection,
  payer: sol.Signer | WalletContextState,
  mint: sol.PublicKey,
  destination: sol.PublicKey,
  authority: sol.Signer | sol.PublicKey,
  amount: number | bigint,
  multiSigners: sol.Signer[] = [],
  confirmOptions?: sol.ConfirmOptions,
  programId = splToken.TOKEN_PROGRAM_ID
): Promise<sol.TransactionSignature> {
  const [authorityPublicKey, signers] = getSigners(authority, multiSigners);

  const transaction = new sol.Transaction().add(
    splToken.createMintToInstruction(
      mint,
      destination,
      authorityPublicKey,
      amount,
      multiSigners,
      programId
    )
  );

  if ('privateKey' in payer) {
    // payer is a sol.Signer
    return sol.sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, ...signers],
      confirmOptions
    );
  }
  if ('sendTransaction' in payer) {
    // payer is a WalletContextState
    const options: SendTransactionOptions = { signers: [...signers] };
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
    return signature;
  }
  throw Error('payer not a Keypair or Wallet.');
}

// https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/actions/transfer.ts
/**
 * Transfer tokens from one account to another
 *
 * @param connection     Connection to use
 * @param payer          Payer of the transaction fees
 * @param source         Source account
 * @param destination    Destination account
 * @param owner          Owner of the source account
 * @param amount         Number of tokens to transfer
 * @param multiSigners   Signing accounts if `owner` is a multisig
 * @param confirmOptions Options for confirming the transaction
 * @param programId      SPL Token program account
 *
 * @return Signature of the confirmed transaction
 */
export async function transfer(
  connection: sol.Connection,
  payer: sol.Signer | WalletContextState,
  source: sol.PublicKey,
  destination: sol.PublicKey,
  owner: sol.Signer | sol.PublicKey,
  amount: number | bigint,
  multiSigners: sol.Signer[] = [],
  confirmOptions?: sol.ConfirmOptions,
  programId = splToken.TOKEN_PROGRAM_ID
): Promise<sol.TransactionSignature> {
  const [ownerPublicKey, signers] = getSigners(owner, multiSigners);

  const transaction = new sol.Transaction().add(
    splToken.createTransferInstruction(
      source,
      destination,
      ownerPublicKey,
      amount,
      multiSigners,
      programId
    )
  );

  if ('privateKey' in payer) {
    // payer is a sol.Signer
    return sol.sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, ...signers],
      confirmOptions
    );
  }
  if ('sendTransaction' in payer) {
    // payer is a WalletContextState
    const options: SendTransactionOptions = { signers: [...signers] };
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
    return signature;
  }
  throw Error('payer not a Keypair or Wallet.');
}

// https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/actions/setAuthority.ts
/**
 * Assign a new authority to the account
 *
 * @param connection       Connection to use
 * @param payer            Payer of the transaction fees
 * @param account          Address of the account
 * @param currentAuthority Current authority of the specified type
 * @param authorityType    Type of authority to set
 * @param newAuthority     New authority of the account
 * @param multiSigners     Signing accounts if `currentAuthority` is a multisig
 * @param confirmOptions   Options for confirming the transaction
 * @param programId        SPL Token program account
 *
 * @return Signature of the confirmed transaction
 */
export async function setAuthority(
  connection: sol.Connection,
  payer: sol.Signer | WalletContextState,
  account: sol.PublicKey,
  currentAuthority: sol.Signer | sol.PublicKey,
  authorityType: splToken.AuthorityType,
  newAuthority: sol.PublicKey | null,
  multiSigners: sol.Signer[] = [],
  confirmOptions?: sol.ConfirmOptions,
  programId = splToken.TOKEN_PROGRAM_ID
): Promise<sol.TransactionSignature> {
  const [currentAuthorityPublicKey, signers] = getSigners(
    currentAuthority,
    multiSigners
  );

  const transaction = new sol.Transaction().add(
    splToken.createSetAuthorityInstruction(
      account,
      currentAuthorityPublicKey,
      authorityType,
      newAuthority,
      multiSigners,
      programId
    )
  );

  if ('privateKey' in payer) {
    // payer is a sol.Signer
    return sol.sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, ...signers],
      confirmOptions
    );
  }
  if ('sendTransaction' in payer) {
    // payer is a WalletContextState
    const options: SendTransactionOptions = { signers: [...signers] };
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
    return signature;
  }
  throw Error('payer not a Keypair or Wallet.');
}

export default {};
