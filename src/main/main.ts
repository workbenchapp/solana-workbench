/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as sol from '@solana/web3.js';
import os from 'os';
import fs from 'fs';
import util from 'util';
import { exec } from 'child_process';
import winston from 'winston';
import randomart from 'randomart';
import hexdump from 'hexdump-nodejs';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import logfmt from 'logfmt';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import {
  netToURL,
  WBAccount,
  AccountsResponse,
  Net,
  ValidatorState,
  GetAccountResponse,
  ValidatorLogsRequest,
  AccountsRequest,
  ImportAccountRequest,
  GetAccountRequest,
  SubscribeProgramChangesRequest,
  UnsubscribeProgramChangesRequest,
  ChangeSubscriptionMap,
  ProgramAccountChange,
  ChangeBatchSize,
  ChangeLookupMap,
  ProgramChangeResponse,
  UpdateAccountRequest,
  FetchAnchorIDLRequest,
  ValidatorStateRequest,
  ImportAccountResponse,
} from '../types/types';

const execAsync = util.promisify(exec);
const WORKBENCH_VERSION = '0.2.1';
const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '..', '..', 'assets');
const WORKBENCH_DIR_NAME = '.solana-workbench';
const WORKBENCH_DIR_PATH = path.join(os.homedir(), WORKBENCH_DIR_NAME);
const PROGRAM_CHANGE_MAX_BATCH_SIZES: ChangeBatchSize = {
  [Net.Localhost]: 1,
  [Net.Dev]: 20,
  [Net.Test]: 100,
  [Net.MainnetBeta]: 500,
};
const KEYPAIR_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'keys');
const LOG_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'logs');
const LOG_FILE_PATH = path.join(LOG_DIR_PATH, 'latest.log');
const LOG_KV_PAD = 50;
const KEY_FILE_NAME = 'wbkey.json';
const KEY_PATH = path.join(KEYPAIR_DIR_PATH, KEY_FILE_NAME);
const MIGRATION_DIR = path.join(RESOURCES_PATH, 'migrations');
const DB_PATH = path.join(WORKBENCH_DIR_PATH, 'wb.db');
const HEXDUMP_BYTES = 512;
const MAX_LOG_FILE_BYTES = 5 * 1028 * 1028;
const DOCKER_IMAGE =
  process.arch === 'arm64'
    ? 'nathanleclaire/solana:v1.9.2'
    : 'solanalabs/solana:v1.9.2';
let DOCKER_PATH = 'docker';
const AIRDROP_AMOUNT = 100;
if (process.platform !== 'win32') {
  DOCKER_PATH = '/usr/local/bin/docker';
}
if (!fs.existsSync(WORKBENCH_DIR_PATH)) {
  fs.mkdirSync(WORKBENCH_DIR_PATH);
}
if (!fs.existsSync(KEYPAIR_DIR_PATH)) {
  fs.mkdirSync(KEYPAIR_DIR_PATH);
}
if (!fs.existsSync(LOG_DIR_PATH)) {
  fs.mkdirSync(LOG_DIR_PATH);
}

let db: Database<sqlite3.Database, sqlite3.Statement>;
let logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const initLogging = async () => {
  // todo: could do better log rotation,
  // but this will do for now to avoid infinite growth
  try {
    const stat = await fs.promises.stat(LOG_FILE_PATH);
    if (stat.size > MAX_LOG_FILE_BYTES) {
      await fs.promises.rm(LOG_FILE_PATH);
    }
    // might get exception if file does not exist,
    // but it's expected.
    //
    // eslint-disable-next-line no-empty
  } catch (error) {}

  const logfmtFormat = winston.format.printf((info) => {
    const { timestamp } = info.metadata;
    delete info.metadata.timestamp;
    return `${timestamp} ${info.level.toUpperCase()} ${info.message.padEnd(
      LOG_KV_PAD,
      ' '
    )}${logfmt.stringify(info.metadata)}`;
  });
  const loggerConfig: winston.LoggerOptions = {
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.metadata(),
      logfmtFormat
    ),
    transports: [
      new winston.transports.File({
        filename: LOG_FILE_PATH,
        handleExceptions: true,
      }),
    ],
  };
  if (process.env.NODE_ENV === 'development') {
    loggerConfig.transports = [new winston.transports.Console()];
  }
  logger = winston.createLogger(loggerConfig);
  logger.info('Workbench session begin', {
    WORKBENCH_VERSION,
    RESOURCES_PATH,
  });
};
initLogging();

const initDB = async () => {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  await db.migrate({
    table: 'migration',
    migrationsPath: MIGRATION_DIR,
  });
};
initDB();

const validatorState = async (
  msg: ValidatorStateRequest
): Promise<ValidatorState> => {
  const { net } = msg;
  let solConn: sol.Connection;

  // Connect to cluster
  const ret = {
    running: false,
  } as ValidatorState;
  if (net !== Net.Localhost) {
    ret.running = true;
    return ret;
  }
  try {
    solConn = new sol.Connection(netToURL(net));
    await solConn.getEpochInfo();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ECONNREFUSED') {
      return ret;
    }
  }
  ret.running = true;
  return ret;
};

const addKeypair = async (net: Net, kpPath: string) => {
  const kp = sol.Keypair.generate();
  const solConn = new sol.Connection(netToURL(net));

  // todo: this conn might not be initialized yet
  await solConn.confirmTransaction(
    await solConn.requestAirdrop(
      kp.publicKey,
      AIRDROP_AMOUNT * sol.LAMPORTS_PER_SOL
    )
  );

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

async function deleteAccount(msg: ImportAccountRequest): Promise<number> {
  const { pubKey } = msg;
  const res = await db.run('DELETE FROM account WHERE pubKey = ?', pubKey);
  return res.changes || 0;
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
    await addKeypair(msg.net, KEY_PATH);
  }
  const kp = await localKeypair(KEY_PATH);
  logger.info('accounts', { net, pubKey: kp.publicKey });
  const solConn = new sol.Connection(netToURL(net));
  const existingAccounts = await db.all(
    'SELECT * FROM account WHERE net = ? ORDER BY created_at DESC, humanName ASC',
    net
  );
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
      db.exec('');
    }

    const txnID = await sol.sendAndConfirmTransaction(
      solConn,
      txn,
      [kp, createdAccounts].flat()
    );

    logger.info('created accounts', { txnID });

    const stmt = await db.prepare(
      'INSERT INTO account (pubKey, net, humanName) VALUES (?, ?, ?)'
    );
    createdAccounts.forEach(async (acc, i) => {
      await stmt.run([acc.publicKey.toString(), Net.Localhost, `Wallet ${i}`]);
    });
    await stmt.finalize();
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
  const res = await db.run(
    'UPDATE account SET humanName = ? WHERE pubKey = ? AND net = ?',
    humanName,
    pubKey,
    net
  );
  return res;
}

async function importAccount(
  msg: ImportAccountRequest
): Promise<ImportAccountResponse> {
  const { net, pubKey } = msg;
  await db.run('INSERT INTO account (net, pubKey) VALUES (?, ?)', net, pubKey);
  return { net };
}

const runValidator = async () => {
  try {
    await execAsync(`${DOCKER_PATH} inspect solana-test-validator`);
  } catch (e) {
    // TODO: check for image, pull if not present
    await execAsync(
      `${DOCKER_PATH} run \
        --name solana-test-validator \
        -d \
        --init \
        -p 8899:8899 \
        -p 8900:8900 \
        --log-driver local \
        --ulimit nofile=1000000 \
        ${DOCKER_IMAGE} \
        solana-test-validator \
        --limit-ledger-size 50000000`
    );

    return;
  }
  await execAsync(`${DOCKER_PATH} start solana-test-validator`);
};

const validatorLogs = async (msg: ValidatorLogsRequest) => {
  const { filter } = msg;
  const MAX_TAIL_LINES = 10000;
  const MAX_DISPLAY_LINES = 30;

  // TODO: doing this out of process might be a better fit
  const maxBuffer = 104857600; // 100MB

  if (filter !== '') {
    const { stderr } = await execAsync(
      `${DOCKER_PATH} logs --tail ${MAX_TAIL_LINES} solana-test-validator`,
      { maxBuffer }
    );
    const lines = stderr.split('\n').filter((s) => s.match(filter));
    const matchingLines = lines
      .slice(Math.max(lines.length - MAX_DISPLAY_LINES, 0))
      .join('\n');
    logger.info('Filtered log lookup', {
      matchLinesLen: matchingLines.length,
      filterLinesLen: lines.length,
    });
    return matchingLines;
  }
  const { stderr } = await execAsync(
    `${DOCKER_PATH} logs --tail ${MAX_DISPLAY_LINES} solana-test-validator`,
    { maxBuffer }
  );
  return stderr;
};

const changeSubscriptions: ChangeSubscriptionMap = {};
const subscribeProgramChanges = async (
  event: Electron.IpcMainEvent,
  msg: SubscribeProgramChangesRequest
) => {
  const { net, programID } = msg;
  let programIDPubkey: sol.PublicKey;
  if (programID === sol.SystemProgram.programId.toString()) {
    programIDPubkey = sol.SystemProgram.programId;
  } else {
    programIDPubkey = new sol.PublicKey(programID);
  }
  let batchLen = 0;
  const changeLookupMap: ChangeLookupMap = {};

  if (
    !(net in changeSubscriptions) ||
    !(programID in changeSubscriptions[net])
  ) {
    const solConn = new sol.Connection(netToURL(net));
    const subscriptionID = solConn.onProgramAccountChange(
      programIDPubkey,
      (info: sol.KeyedAccountInfo, ctx: sol.Context) => {
        const pubKey = info.accountId.toString();
        const solAmount = info.accountInfo.lamports / sol.LAMPORTS_PER_SOL;
        let [count, maxDelta, solDelta, prevSolAmount] = [1, 0, 0, 0];

        if (pubKey in changeLookupMap) {
          ({ count, maxDelta } = changeLookupMap[pubKey]);
          prevSolAmount = changeLookupMap[pubKey].solAmount;
          solDelta = solAmount - prevSolAmount;
          if (Math.abs(solDelta) > Math.abs(maxDelta)) {
            maxDelta = solDelta;
          }
          count += 1;
        }

        if (batchLen === PROGRAM_CHANGE_MAX_BATCH_SIZES[net]) {
          const sortedChanges = Object.values(changeLookupMap);
          sortedChanges.sort((a, b) => {
            return Math.abs(b.maxDelta) - Math.abs(a.maxDelta);
          });
          const res: ProgramChangeResponse = {
            net,
            changes: sortedChanges,
            uniqueAccounts: Object.keys(changeLookupMap).length,
          };
          event.reply('main', {
            method: 'program-changes',
            res,
          });
          batchLen = 0;
        } else {
          const programAccountChange: ProgramAccountChange = {
            net,
            pubKey,
            info,
            ctx,
            solAmount,
            count,
            solDelta,
            maxDelta,
            programID,
          };
          changeLookupMap[pubKey] = programAccountChange;
          batchLen += 1;
        }
      }
    );
    changeSubscriptions[net] = {
      [programID]: {
        subscriptionID,
        solConn,
      },
    };
  }
};

const unsubscribeProgramChanges = async (
  msg: UnsubscribeProgramChangesRequest
) => {
  const sub = changeSubscriptions[msg.net][msg.programID];
  if (!sub) return;
  await sub.solConn.removeProgramAccountChangeListener(sub.subscriptionID);
  delete changeSubscriptions[msg.net][msg.programID];
};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const fetchAnchorIdl = async (msg: FetchAnchorIDLRequest) => {
  // Anchor doesn't seem to accept a flag for where Anchor.toml is (???)
  // so we do this for now
  const cwd = process.cwd();
  process.chdir(RESOURCES_PATH);
  const { stdout } = await execAsync(`anchor idl fetch ${msg.programID}`);
  process.chdir(cwd);
  return JSON.parse(stdout);
};

ipcMain.on(
  'main',
  async (event: Electron.IpcMainEvent, method: string, msg: any) => {
    logger.info('IPC event', { method, ...msg });
    let res = {};
    try {
      switch (method) {
        case 'validator-state':
          res = await validatorState(msg);
          break;
        case 'run-validator':
          await runValidator();
          break;
        case 'accounts':
          res = await accounts(msg);
          break;
        case 'validator-logs':
          res = await validatorLogs(msg);
          break;
        case 'fetch-anchor-idl':
          res = await fetchAnchorIdl(msg);
          break;
        case 'update-account-name':
          res = await updateAccountName(msg);
          break;
        case 'import-account':
          await importAccount(msg);
          break;
        case 'get-account':
          res = await getAccount(msg);
          break;
        case 'delete-account':
          res = await deleteAccount(msg);
          break;
        case 'subscribe-program-changes':
          await subscribeProgramChanges(event, msg);
          break;
        case 'unsubscribe-program-changes':
          await unsubscribeProgramChanges(msg);
          break;
        default:
      }
      logger.info('OK', { method, ...res });
      event.reply('main', { method, res });
    } catch (e) {
      const error = e as Error;
      const { stack } = error;
      logger.error('ERROR', {
        method,
        name: error.name,
      });
      logger.error('Stacktrace:');
      stack?.split('\n').forEach((line) => logger.error(`\t${line}`));
      event.reply('main', { method, error });
    }
  }
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));
  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  db.close();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
