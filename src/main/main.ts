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
import Sudoer from 'electron-sudo';
import os from 'os';
import fs from 'fs';

import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import SolState from '../types/types';

const WORKBENCH_DIR_NAME = '.solana-workbench';
const WORKBENCH_DIR_PATH = path.join(os.homedir(), WORKBENCH_DIR_NAME);
const KEYPAIR_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'keys');
if (!fs.existsSync(WORKBENCH_DIR_PATH)) {
  fs.mkdirSync(WORKBENCH_DIR_PATH);
  fs.mkdirSync(KEYPAIR_DIR_PATH);
}

const connectSOL = async (): Promise<SolState> => {
  // Connect to cluster
  let connection: web3.Connection;
  const ret = {
    running: false,
    keyId: '',
  } as SolState;
  try {
    connection = new web3.Connection('http://localhost:8899');
    await connection.getEpochInfo();
    // connection = new web3.Connection('https://api.devnet.solana.com');
  } catch (error) {
    console.log('COULD NOT CONNECT', error);
    return ret;
  }
  ret.running = true;
  return ret;
};

const keypairs = async () => {
  const keypairFiles = await fs.promises.readdir(KEYPAIR_DIR_PATH);
  const web3KeyPromises = keypairFiles
    .map((key) => path.join(KEYPAIR_DIR_PATH, key))
    .filter(async (keyPath) => {
      const stat = await fs.promises.stat(keyPath);
      return stat.isFile();
    })
    .map(async (keyPath) => {
      const data = fs.readFileSync(keyPath);
      return web3.Keypair.fromSecretKey(data);
    });
  const web3Keys = await Promise.all(web3KeyPromises);
  const publicKeys = web3Keys.map((k) => k.publicKey.toString());
  return publicKeys;
};

const addKeypair = async () => {
  const kp = web3.Keypair.generate();
  const kpPath = path.join(KEYPAIR_DIR_PATH, `${kp.publicKey}`);
  fs.writeFileSync(kpPath, kp.secretKey);
  const allKeypairs = await keypairs();
  return allKeypairs;
};

/*
const airdropTokens = async (): Promise<void> => {
  const connection = new web3.Connection('http://localhost:8899');

  console.log('GENERATING KEYPAIR');
  const from = web3.Keypair.generate();
  console.log('AIRDROPPING');
  const airdropSignature = await connection.requestAirdrop(
    from.publicKey,
    web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // Generate a new random public key
  const to = web3.Keypair.generate();

  console.log('CREATING TXN');
  // Add transfer instruction to transaction
  const transaction = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to.publicKey,
      lamports: web3.LAMPORTS_PER_SOL / 100,
    })
  );

  console.log('SIGNING');
  // Sign transaction, broadcast, and confirm
  await web3.sendAndConfirmTransaction(connection, transaction, [from]);
};
*/

const validatorController = new AbortController();
const sudoer = new Sudoer({
  name: 'solana-validator',
});

const runValidator = () => {
  const { signal } = validatorController;
  sudoer.exec('solana-test-validator.exe', { signal }, (error: any) => {
    console.log(error);
  });
};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('init', async (event) => {
  const solState = await connectSOL();
  event.reply('init', solState);
});

ipcMain.on('run-validator', async (event) => {
  runValidator();
  event.reply('run-validator', {});
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
  validatorController.abort();
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
