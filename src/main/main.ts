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
import * as web3 from '@solana/web3.js';
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
const WORKBENCH_VERSION = '0.1.2-dev';
const WORKBENCH_DIR_NAME = '.solana-workbench';
const WORKBENCH_DIR_PATH = path.join(os.homedir(), WORKBENCH_DIR_NAME);
const KEYPAIR_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'keys');
const LOG_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'logs');
const DOCKER_IMAGE =
  process.arch === 'arm64'
    ? 'nathanleclaire/solana:v1.8.5'
    : 'solanalabs/solana:v1.8.5';
if (!fs.existsSync(WORKBENCH_DIR_PATH)) {
  fs.mkdirSync(WORKBENCH_DIR_PATH);
}
if (!fs.existsSync(KEYPAIR_DIR_PATH)) {
  fs.mkdirSync(KEYPAIR_DIR_PATH);
}
if (!fs.existsSync(LOG_DIR_PATH)) {
  fs.mkdirSync(LOG_DIR_PATH);
}

const logfmtFormat = winston.format.printf((info) => {
  const { timestamp } = info.metadata;
  delete info.metadata.timestamp;
  return `${timestamp} ${info.level.toUpperCase()} ${
    info.message
  }\t${logfmt.stringify(info.metadata)}`;
});
const winstonLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata(),
    logfmtFormat
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR_PATH, 'latest.log'),
    }),
  ],
});

winstonLogger.info('Workbench session begin', {
  version: WORKBENCH_VERSION,
});

const connectSOL = async (): Promise<SolState> => {
  // Connect to cluster
  let connection: web3.Connection;
  const ret = {
    running: false,
    keyId: '',
  } as SolState;
  try {
    connection = new web3.Connection('http://127.0.0.1:8899');
    await connection.getEpochInfo();
    // connection = new web3.Connection('https://api.devnet.solana.com');
  } catch (error) {
    winston.error('Cannot connect to validator', { error });
    return ret;
  }
  ret.running = true;
  return ret;
};

const keyPath = (pubKey: string) =>
  path.join(KEYPAIR_DIR_PATH, `${pubKey}.json`);

const localKeypair = async (pubKey: string): Promise<web3.Keypair> => {
  const fileContents = await fs.promises.readFile(keyPath(pubKey));
  const data = Uint8Array.from(JSON.parse(fileContents.toString()));
  return web3.Keypair.fromSecretKey(data);
};

const keypairs = async () => {
  const keypairFiles = await fs.promises.readdir(KEYPAIR_DIR_PATH);
  const web3KeyPromises = keypairFiles.map(async (keyFile) => {
    const kPath = path.join(KEYPAIR_DIR_PATH, keyFile);
    const stat = await fs.promises.stat(kPath);
    const isFile = stat.isFile();
    const time = stat.mtime.getTime();
    const pubKey = keyFile.slice(0, keyFile.indexOf('.'));
    return {
      kPath,
      isFile,
      time,
      pubKey,
    };
  });
  const web3Keys = await Promise.all(web3KeyPromises);
  web3Keys.filter((x) => x.isFile).sort((a, b) => b.time - a.time);
  const publicKeys = web3Keys.map((k) => k.pubKey);
  return publicKeys;
};

const addKeypair = async () => {
  const kp = web3.Keypair.generate();
  const kpPath = keyPath(kp.publicKey.toString());

  // goofy looking but otherwise stringify encodes Uint8Array like:
  // {"0": 1, "1": 2, "2": 3 ...}
  const secretKeyUint = Array.from(Uint8Array.from(kp.secretKey));
  const fileContents = JSON.stringify(secretKeyUint);
  await fs.promises.writeFile(kpPath, fileContents);
  const allKeypairs = await keypairs();
  return allKeypairs;
};

const airdropTokens = async (pubKey: string, sol: number): Promise<void> => {
  const connection = new web3.Connection('http://127.0.0.1:8899');

  const to = await localKeypair(pubKey);
  const airdropSignature = await connection.requestAirdrop(
    to.publicKey,
    web3.LAMPORTS_PER_SOL * sol
  );
  await connection.confirmTransaction(airdropSignature);
};

const runValidator = async () => {
  try {
    await execAsync(`docker inspect solana-test-validator`);
  } catch (e) {
    const err = e as Error;
    console.log('INSPECT ERROR', err);

    // TODO: check for image, pull if not present

    await execAsync(
      `docker run \
        --name solana-test-validator \
        -d \
        -p 8899:8899 \
        -p 8900:8900 \
         --ulimit nofile=1000000 \
        ${DOCKER_IMAGE}`
    );

    return;
  }
  await execAsync(`docker start solana-test-validator`);
};

const validatorLogs = async (filter: string) => {
  const MAX_TAIL_LINES = 10000;
  const MAX_DISPLAY_LINES = 30;

  // TODO: doing this out of process might be a better fit
  const maxBuffer = 104857600; // 100MB

  const { stderr } = await execAsync(
    `docker logs --tail ${MAX_TAIL_LINES} solana-test-validator`,
    { maxBuffer }
  );
  const lines = stderr.split('\n').filter((s) => s.match(filter));
  return lines.slice(Math.max(lines.length - MAX_DISPLAY_LINES, 1)).join('\n');
};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('sol-state', async (event) => {
  const solState = await connectSOL();
  event.reply('sol-state', solState);
});

ipcMain.on('run-validator', async (event) => {
  runValidator();
  event.reply('run-validator', {});
});

ipcMain.on('validator-logs', async (event, msg) => {
  const logs = await validatorLogs(msg.filter);
  event.reply('validator-logs', logs);
});

ipcMain.on('keypairs', async (event) => {
  const pairs = await keypairs();
  event.reply('keypairs', pairs);
});

ipcMain.on('add-keypair', async (event) => {
  await addKeypair();
  const pairs = await keypairs();
  event.reply('add-keypair', pairs);
});

ipcMain.on('airdrop', async (event, msg) => {
  await airdropTokens(msg.pubKey, msg.solAmount);
  event.reply('airdrop success');
});

ipcMain.on('fetch-anchor-idl', async (event, msg) => {
  const { stdout } = await execAsync(`anchor idl fetch ${msg.programID}`);
  event.reply('fetch-anchor-idl', JSON.parse(stdout));
});

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
