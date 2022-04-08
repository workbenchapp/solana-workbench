import * as web3 from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';

export async function airdropSol(
  connection: web3.Connection,
  toKey: web3.PublicKey,
  solAmount: string
) {
  const lamports = web3.LAMPORTS_PER_SOL * parseFloat(solAmount);

  let signature: web3.TransactionSignature = '';
  signature = await connection.requestAirdrop(toKey, lamports);
  await connection.confirmTransaction(signature, 'finalized');
}

export async function sendSolFromSelectedWallet(
  connection: web3.Connection,
  fromKey: WalletContextState,
  toKey: web3.PublicKey,
  solAmount: string
) {
  const { publicKey, sendTransaction } = fromKey;
  if (!publicKey) {
    throw Error('no wallet selected');
  }

  const lamports = web3.LAMPORTS_PER_SOL * parseFloat(solAmount);

  let signature: web3.TransactionSignature = '';

  const transaction = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: toKey,
      lamports,
    })
  );

  signature = await sendTransaction(transaction, connection);

  await connection.confirmTransaction(signature, 'finalized');
}

async function createNewAccount(net: Net) {
  const keypair = web3.Keypair.generate();
  const payer = web3.Keypair.generate();

  // web3.clusterApiUrl(net)
  const connection = new web3.Connection(netToURL(net));

  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    web3.LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(airdropSignature);

  // const allocateTransaction = new web3.Transaction({
  //     feePayer: payer.publicKey,
  // })
  // const keys = [
  //     { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
  // ]
  // const params = { space: 100 }

  // const allocateStruct = {
  //     index: 8,
  //     layout: struct([u32('instruction'), ns64('space')]),
  // }

  // const data = Buffer.alloc(allocateStruct.layout.span)
  // const layoutFields = { instruction: allocateStruct.index, ...params }
  // allocateStruct.layout.encode(layoutFields, data)

  // allocateTransaction.add(
  //     new web3.TransactionInstruction({
  //         keys,
  //         programId: web3.SystemProgram.programId,
  //         data,
  //     })
  // )

  // await web3.sendAndConfirmTransaction(connection, allocateTransaction, [
  //     payer,
  //     keypair,
  // ])
  const instructions = web3.SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: keypair.publicKey,
    lamports: web3.LAMPORTS_PER_SOL / 2,
  });

  const transaction = new web3.Transaction().add(instructions);

  const signers = [
    {
      publicKey: payer.publicKey,
      secretKey: payer.secretKey,
    },
  ];

  /* const confirmation = */ await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    signers
  );
}

export default createNewAccount;
