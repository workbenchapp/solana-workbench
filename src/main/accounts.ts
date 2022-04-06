import * as sol from '@solana/web3.js';
import fs from 'fs';
import { netToURL } from '../common/strings';
import {
  AccountsRequest,
  AccountsResponse,
  GetAccountRequest,
  GetAccountResponse,
  ImportAccountRequest,
  ImportAccountResponse,
  Net,
  UpdateAccountRequest,
  WBAccount,
} from '../types/types';
import db from './db';
import { logger } from './logger';
import { KEY_PATH } from './const';

const hexdump = require('hexdump-nodejs');
const randomart = require('randomart');

const HEXDUMP_BYTES = 512;
const AIRDROP_AMOUNT = 100;

const addKeypair = async (kpPath: string) => {
  const kp = sol.Keypair.generate();

  // goofy looking but otherwise stringify encodes Uint8Array like:
  // {"0": 1, "1": 2, "2": 3 ...}
  const secretKeyUint = Array.from(Uint8Array.from(kp.secretKey));
  const fileContents = JSON.stringify(secretKeyUint);
  await fs.promises.writeFile(kpPath, fileContents);
};

const localKeypair = async (f: string): Promise<sol.Keypair> => {
  const fileContents = await fs.promises.readFile(f);
  const data = Uint8Array.from(JSON.parse(fileContents.toString()));
  return sol.Keypair.fromSecretKey(data);
};

function deleteAccount(msg: ImportAccountRequest) {
  const { pubKey, net } = msg;
  db.accounts.delete(pubKey, net);
}

async function getAccount(msg: GetAccountRequest): Promise<GetAccountResponse> {
  const { net, pubKey } = msg;
  const solConn = new sol.Connection(netToURL(net));
  const resp: GetAccountResponse = {};
  try {
    const key = new sol.PublicKey(pubKey);
    const art = randomart(key.toBytes());
    const solAccount = await solConn.getAccountInfo(key);
    let solAmount = 0;
    if (solAccount?.lamports)
      solAmount = solAccount.lamports / sol.LAMPORTS_PER_SOL;
    const hexDump = hexdump(solAccount?.data.subarray(0, HEXDUMP_BYTES));
    if (solAccount !== null) {
      resp.account = {
        net,
        pubKey,
        solAmount,
        art,
        hexDump,
        executable: solAccount.executable,
        exists: true,
      };
    } else {
      resp.account = { net, pubKey, exists: false, executable: false };
    }
  } catch (e) {
    resp.err = e as Error;
  }
  return resp;
}

async function accounts(msg: AccountsRequest): Promise<AccountsResponse> {
  const { net } = msg;
  try {
    await fs.promises.access(KEY_PATH);
  } catch {
    logger.info('Creating root key', { KEY_PATH });
    await addKeypair(KEY_PATH);
  }
  const kp = await localKeypair(KEY_PATH);
  const solConn = new sol.Connection(netToURL(net));
  const existingAccounts = await db.accounts.all(net);
  logger.info('existingAccounts', { existingAccounts });
  if (existingAccounts?.length > 0) {
    const pubKeys = existingAccounts.map((a) => {
      return new sol.PublicKey(a.pubKey);
    });
    const solAccountInfo = await solConn.getMultipleAccountsInfo(pubKeys);
    const mergedAccountInfo: WBAccount[] = solAccountInfo.map(
      (solAccount: sol.AccountInfo<Buffer> | null, i: number) => {
        const key = new sol.PublicKey(existingAccounts[i].pubKey);
        const { humanName } = existingAccounts[i];
        const art = randomart(key.toBytes());
        const exists = false;
        const newAcc: WBAccount = {
          net,
          art,
          humanName,
          exists,
          pubKey: key.toString(),
        };
        if (solAccount) {
          newAcc.solAmount = solAccount.lamports / sol.LAMPORTS_PER_SOL;
          newAcc.hexDump = hexdump(solAccount?.data.subarray(0, HEXDUMP_BYTES));
          newAcc.exists = true;
        }
        return newAcc;
      }
    );
    return {
      rootKey: kp.publicKey.toString(),
      accounts: mergedAccountInfo,
    };
  }
  const createdAccounts: sol.Keypair[] = [];
  if (net === Net.Localhost) {
    await solConn.confirmTransaction(
      await solConn.requestAirdrop(
        kp.publicKey,
        AIRDROP_AMOUNT * sol.LAMPORTS_PER_SOL
      ),
      'finalized'
    );
    const N_ACCOUNTS = 5;
    const txn = new sol.Transaction();
    for (let i = 0; i < N_ACCOUNTS; i += 1) {
      const acc = new sol.Keypair();
      txn.add(
        sol.SystemProgram.createAccount({
          fromPubkey: kp.publicKey,
          newAccountPubkey: acc.publicKey,
          space: 0,
          lamports: 10 * sol.LAMPORTS_PER_SOL,
          programId: sol.SystemProgram.programId,
        })
      );
      logger.info('adding account', {
        acc_pubkey: acc.publicKey,
      });

      createdAccounts.push(acc);
    }

    const txnID = await sol.sendAndConfirmTransaction(
      solConn,
      txn,
      [kp, createdAccounts].flat(),
      { commitment: 'finalized' }
    );

    logger.info('created accounts', { txnID });

    createdAccounts.forEach((acc, i) => {
      db.accounts.insert(
        acc.publicKey.toString(),
        Net.Localhost,
        `Wallet ${i}`
      );
    });
  }

  return {
    rootKey: kp.publicKey.toString(),
    // todo: this should be on created accounts from DB
    accounts: createdAccounts.map((acc, i) => {
      return {
        net,
        exists: true,
        art: randomart(acc.publicKey.toBytes()),
        pubKey: acc.publicKey.toString(),
        humanName: `Wallet ${i}`,
      };
    }),
  };
}

async function updateAccountName(msg: UpdateAccountRequest) {
  const { net, pubKey, humanName } = msg;
  const res = await db.accounts.updateHumanName(pubKey, net, humanName);
  return res;
}

async function importAccount(
  msg: ImportAccountRequest
): Promise<ImportAccountResponse> {
  const { net, pubKey } = msg;
  await db.accounts.insert(pubKey, net, '');
  return { net };
}

export {
  importAccount,
  accounts,
  getAccount,
  deleteAccount,
  updateAccountName,
};
