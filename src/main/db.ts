// import path from 'path';
// import fs from 'fs';
// import * as sol from '@solana/web3.js';

// import { Net, ConfigMap, WBAccount } from 'types/types';
// import { netToURL } from '../common/strings';
// import { CONFIG_FILE_PATH, ACCOUNTS_DIR_PATH } from './const';
// import { logger } from './logger';

// // PersistedAccount[File] allow us to store
// // accounts in a file format that solana-test-validator
// // understands with the --account flag.
// // i.e., what is given by the following command:
// // $ solana account <pubkey> --output-file <file> --output json
// type PersistedAccount = {
//   lamports: number;
//   data: string[];
//   owner: string;
//   executable: boolean;
//   rentEpoch: number | undefined;
// };

// type PersistedAccountFile = {
//   pubkey: string;
//   humanName: string;
//   importedAt: string;
//   net: Net;
//   account: PersistedAccount;
// };

// const acctFile = (pubKey: string, net: Net): string => {
//   return path.join(ACCOUNTS_DIR_PATH, `${net}_${pubKey}.json`);
// };

// const db = {
//   config: {
//     all: async (): Promise<ConfigMap> => {
//       const config = await JSON.parse(
//         (await fs.promises.readFile(CONFIG_FILE_PATH)).toString()
//       );
//       return config;
//     },
//     get: async (key: string): Promise<string | undefined> => {
//       const cfg = await db.config.all();
//       return cfg[key];
//     },
//     set: async (key: string, val: string | undefined) => {
//       const cfg = await db.config.all();
//       cfg[key] = val;
//       try {
//         await fs.promises.writeFile(CONFIG_FILE_PATH, JSON.stringify(cfg));
//       } catch (err) {
//         logger.error('Error writing config', { err });
//       }
//     },
//   },
//   accounts: {
//     all: async (net: Net): Promise<WBAccount[]> => {
//       const accountFileNames = await fs.promises.readdir(ACCOUNTS_DIR_PATH);
//       const accountFiles = await Promise.all(
//         accountFileNames.map(async (f: string): Promise<WBAccount> => {
//           const accountFileData = await fs.promises.readFile(
//             path.join(ACCOUNTS_DIR_PATH, f)
//           );
//           const persistedAccount: PersistedAccountFile = JSON.parse(
//             accountFileData.toString()
//           );
//           return {
//             importedAt: persistedAccount.importedAt,
//             net: persistedAccount.net,
//             pubKey: persistedAccount.pubkey,
//             humanName: persistedAccount.humanName,
//           };
//         })
//       );
//       return accountFiles
//         .sort((acctA, acctB) => {
//           if (acctA.importedAt && acctB.importedAt) {
//             return acctA.importedAt.localeCompare(acctB.importedAt);
//           }
//           return 0;
//         })
//         .sort((acctA, acctB) => {
//           if (acctA.importedAt && acctB.importedAt) {
//             return Date.parse(acctB.importedAt) - Date.parse(acctA.importedAt);
//           }
//           return 0;
//         })
//         .filter((acct) => {
//           return acct.net === net;
//         });
//     },
//     insert: async (pubKey: string, net: Net, humanName: string) => {
//       const solConn = new sol.Connection(netToURL(net));
//       const key = new sol.PublicKey(pubKey);
//       const solAccount = await solConn.getAccountInfo(key);
//       const importedAt = new Date().toString();
//       try {
//         if (solAccount) {
//           const persistedAccount: PersistedAccountFile = {
//             pubkey: pubKey,
//             humanName,
//             net,
//             importedAt,
//             account: {
//               lamports: solAccount.lamports,
//               data: [solAccount.data.toString('base64'), 'base64'],
//               owner: solAccount.owner.toString(),
//               executable: solAccount.executable,
//               rentEpoch: solAccount.rentEpoch,
//             },
//           };
//           await fs.promises.writeFile(
//             acctFile(pubKey, net),
//             JSON.stringify(persistedAccount)
//           );
//         } else {
//           throw new Error('Account not found');
//         }
//       } catch (err) {
//         logger.error('Error writing account JSON', { err });
//       }
//     },
//     updateHumanName: async (pubKey: string, net: Net, humanName: string) => {
//       const acct: PersistedAccountFile = JSON.parse(
//         (await fs.promises.readFile(acctFile(pubKey, net))).toString()
//       );
//       acct.humanName = humanName;
//       await fs.promises.writeFile(acctFile(pubKey, net), JSON.stringify(acct));
//     },
//     delete: async (pubKey: string, net: Net) => {
//       try {
//         await fs.promises.rm(acctFile(pubKey, net));
//       } catch (err) {
//         logger.error('Error deleting account JSON', { err });
//       }
//     },
//   },
// };

// export default db;
