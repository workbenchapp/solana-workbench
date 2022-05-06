import * as web3 from '@solana/web3.js';
// import { struct, u32, ns64 } from '@solana/buffer-layout';
// import { Buffer } from 'buffer';

import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';

const logger = window.electron.log;

export async function airdropSol(net: Net, toKey: string, solAmount: string) {
  const to = new web3.PublicKey(toKey);
  const sols = parseFloat(solAmount);

  const connection = new web3.Connection(netToURL(net));

  const airdropSignature = await connection.requestAirdrop(
    to,
    sols * web3.LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(airdropSignature);
}

export async function transferSol(
  fromKey: string,
  toKey: string,
  solAmount: string
) {
  logger.info(
    `TODO(need to store private keys safely first): transfer ${solAmount} from ${fromKey} to ${toKey}`
  );
  return new Promise((resolve) => setTimeout(resolve, 2000));
}

function createNewAccount() {
  const keypair = web3.Keypair.generate();
  return keypair;
}

export default createNewAccount;
