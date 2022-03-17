/* eslint global-require: off, no-console: off, promise/always-return: off */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { logger, initLogging } from './logger';
import { runValidator, validatorState, validatorLogs } from './validator';
import {
  accounts,
  getAccount,
  importAccount,
  deleteAccount,
  updateAccountName,
} from './accounts';
import fetchAnchorIdl from './anchor';
import fetchValidatorNetworkInfo from './validatorNetworkInfo';

import {
  subscribeProgramChanges,
  unsubscribeProgramChanges,
} from './programChanges';
import { RESOURCES_PATH } from './const';
import { db, initDB } from './db';
import wbConfig from './config';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
const MAX_STRING_LOG_LENGTH = 32;

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
        case 'config':
          res = await wbConfig(msg);
          break;
        case 'get-validator-network-info':
          res = await fetchValidatorNetworkInfo(msg);
          break;
        default:
      }
      let loggedRes = res;
      if (typeof loggedRes === 'string') {
        loggedRes = { res: `${loggedRes.slice(0, MAX_STRING_LOG_LENGTH)}...` };
      }
      logger.info('OK', { method, ...loggedRes });
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
  await initDB();
  await initLogging();

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
