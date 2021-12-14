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
import logfmt from 'logfmt';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import SolState from '../types/types';

const execAsync = util.promisify(exec);
const WORKBENCH_VERSION = '0.1.3-dev';
const WORKBENCH_DIR_NAME = '.solana-workbench';
const WORKBENCH_DIR_PATH = path.join(os.homedir(), WORKBENCH_DIR_NAME);
const KEYPAIR_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'keys');
const LOG_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'logs');
const LOG_FILE_PATH = path.join(LOG_DIR_PATH, 'latest.log');
const KEY_FILE_NAME = 'wbkey.json';
const KEY_PATH = path.join(KEYPAIR_DIR_PATH, KEY_FILE_NAME);
const MAX_LOG_FILE_BYTES = 5 * 1028 * 1028;
const DOCKER_IMAGE =
  process.arch === 'arm64'
    ? 'nathanleclaire/solana:v1.8.5'
    : 'solanalabs/solana:v1.8.5';
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
    return `${timestamp} ${info.level.toUpperCase()} ${
      info.message
    } \t${logfmt.stringify(info.metadata)}`;
  });
  logger = winston.createLogger({
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
  });

  logger.info('Workbench session begin', {
    version: WORKBENCH_VERSION,
    workdir: process.cwd(),
  });
};
initLogging();

let solConn: sol.Connection;

const connectSOL = async (): Promise<SolState> => {
  // Connect to cluster
  const ret = {
    running: false,
    keyId: '',
  } as SolState;
  try {
    solConn = new sol.Connection('http://127.0.0.1:8899');
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

const localKeypair = async (f: string): Promise<sol.Keypair> => {
  const fileContents = await fs.promises.readFile(f);
  const data = Uint8Array.from(JSON.parse(fileContents.toString()));
  return sol.Keypair.fromSecretKey(data);
};

const accounts = async () => {
  const kp = await localKeypair(KEY_PATH);
  const acc = new sol.Keypair();
  const txn = new sol.Transaction();
  txn.add(
    sol.SystemProgram.createAccount({
      fromPubkey: kp.publicKey,
      newAccountPubkey: acc.publicKey,
      space: 128,
      lamports: 0,
      programId: sol.SystemProgram.programId,
    })
  );
  await sol.sendAndConfirmTransaction(solConn, txn, [kp, acc]);
  return [kp.publicKey, acc.publicKey];
};

const addKeypair = async (kpPath: string) => {
  const kp = sol.Keypair.generate();

  // todo: this conn might not be initialized yet
  await solConn.requestAirdrop(
    kp.publicKey,
    AIRDROP_AMOUNT * sol.LAMPORTS_PER_SOL
  );

  // goofy looking but otherwise stringify encodes Uint8Array like:
  // {"0": 1, "1": 2, "2": 3 ...}
  const secretKeyUint = Array.from(Uint8Array.from(kp.secretKey));
  const fileContents = JSON.stringify(secretKeyUint);
  await fs.promises.writeFile(kpPath, fileContents);
};

if (!fs.existsSync(KEY_PATH)) {
  logger.info('Creating root key', { KEY_PATH });
  addKeypair(KEY_PATH);
}

const airdropTokens = async (pubKey: string, amount: number): Promise<void> => {
  const connection = new sol.Connection('http://127.0.0.1:8899');

  const to = await localKeypair(pubKey);
  const airdropSignature = await connection.requestAirdrop(
    to.publicKey,
    sol.LAMPORTS_PER_SOL * amount
  );
  await connection.confirmTransaction(airdropSignature);
};

const runValidator = async () => {
  try {
    await execAsync(`${DOCKER_PATH} inspect solana-test-validator`);
  } catch (e) {
    const err = e as Error;
    console.log('INSPECT ERROR', err);

    // TODO: check for image, pull if not present

    await execAsync(
      `${DOCKER_PATH} run \
        --name solana-test-validator \
        -d \
        -p 8899:8899 \
        -p 8900:8900 \
         --ulimit nofile=1000000 \
        ${DOCKER_IMAGE}`
    );

    return;
  }
  await execAsync(`${DOCKER_PATH} start solana-test-validator`);
};

const validatorLogs = async (filter: string) => {
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
    return lines
      .slice(Math.max(lines.length - MAX_DISPLAY_LINES, 1))
      .join('\n');
  }
  const { stderr } = await execAsync(
    `${DOCKER_PATH} logs --tail ${MAX_DISPLAY_LINES} solana-test-validator`,
    { maxBuffer }
  );
  return stderr;
};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
const ipcMiddleware = (
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (event: Electron.IpcMainEvent, ...args: any[]) => void
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (event: Electron.IpcMainEvent, ...args: any[]) => {
    logger.info('IPC event', Object.assign({ channel }, ...args));
    try {
      await fn(event, ...args);
    } catch (e) {
      const error = e as Error;
      const { stack } = error;
      logger.error('IPC error', {
        channel,
        name: error.name,
      });
      logger.error('Stacktrace:');
      stack?.split('\n').forEach((line) => logger.error(`\t${line}`));
    }
  };
};

ipcMain.on(
  'sol-state',
  ipcMiddleware('sol-state', async (event: Electron.IpcMainEvent) => {
    const solState = await connectSOL();
    event.reply('sol-state', solState);
  })
);

ipcMain.on(
  'run-validator',
  ipcMiddleware('run-validator', async (event: Electron.IpcMainEvent) => {
    runValidator();
    event.reply('run-validator', {});
  })
);

ipcMain.on(
  'validator-logs',
  ipcMiddleware('validator-logs', async (event, msg) => {
    const logs = await validatorLogs(msg.filter);
    event.reply('validator-logs', logs);
  })
);

ipcMain.on(
  'accounts',
  ipcMiddleware('accounts', async (event) => {
    const pairs = await accounts();
    event.reply('accounts', pairs);
  })
);

ipcMain.on(
  'add-keypair',
  ipcMiddleware('add-keypair', async (event) => {
    await addKeypair('fixme');
    const pairs = await accounts();
    event.reply('add-keypair', pairs);
  })
);

ipcMain.on(
  'airdrop',
  ipcMiddleware('airdrop', async (event, msg) => {
    await airdropTokens(msg.pubKey, msg.solAmount);
    event.reply('airdrop success');
  })
);

ipcMain.on(
  'fetch-anchor-idl',
  ipcMiddleware('fetch-anchor-idl', async (event, msg) => {
    const { stdout } = await execAsync(`anchor idl fetch ${msg.programID}`);
    event.reply('fetch-anchor-idl', JSON.parse(stdout));
  })
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

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

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
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
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
