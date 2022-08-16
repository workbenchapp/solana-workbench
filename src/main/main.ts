import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import 'regenerator-runtime/runtime';
import fetchAnchorIdl from './anchor';
import { RESOURCES_PATH } from './const';
import { initAccountPromises } from './ipc/accounts';
import { initConfigPromises } from './ipc/config';
import {
  initDockerPromises,
  inspectValidatorContainer,
  stopValidatorContainer,
  removeValidatorContainer,
} from './ipc/docker';
import { initLogging, logger } from './logger';
import MenuBuilder from './menu';
import {
  subscribeTransactionLogs,
  unsubscribeTransactionLogs,
} from './transactionLogs';
import { resolveHtmlPath } from './util';
import { validatorLogs } from './validator';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
const MAX_STRING_LOG_LENGTH = 32;

initConfigPromises();
initAccountPromises();
initDockerPromises();

ipcMain.on(
  'main',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (event: Electron.IpcMainEvent, method: string, msg: any) => {
    // logger.info('IPC event', { method, ...msg });
    let res = {};
    try {
      switch (method) {
        case 'validator-logs':
          res = await validatorLogs(msg);
          break;
        case 'fetch-anchor-idl':
          res = await fetchAnchorIdl(msg);
          logger.debug(`fetchIDL(${msg}: (${res})`);
          break;
        case 'subscribe-transaction-logs':
          await subscribeTransactionLogs(event, msg);
          break;
        case 'unsubscribe-transaction-logs':
          await unsubscribeTransactionLogs(event, msg);
          break;
        default:
      }
      let loggedRes = res;
      if (typeof loggedRes === 'string') {
        loggedRes = { res: `${loggedRes.slice(0, MAX_STRING_LOG_LENGTH)}...` };
      }
      // logger.info('OK', { method, ...loggedRes });
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
    .catch(log.info);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // mainWindow.Buffer = Buffer;

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

  // eslint-disable-next-line consistent-return
  mainWindow.on('close', async function (e: Event) {
    e.preventDefault();

    try {
      const containerInspect = await inspectValidatorContainer();
      if (!containerInspect?.State?.Running) return app.exit(0);
    } catch (err) {
      logger.error(err);
      app.exit(); // not doing show will make the window "un-closable" if an error occurs while inspecting
    }

    const choice = dialog.showMessageBoxSync(mainWindow as BrowserWindow, {
      type: 'question',
      buttons: ['Stop', 'Stop & Remove', 'Leave Running', 'Cancel'],
      title: 'Just before you leave',
      message:
        'What would you like to do to the Solana Validator container before exiting?',
      icon: getAssetPath('icon.png'),
    });
    switch (choice) {
      // Stop
      case 0:
        await stopValidatorContainer();
        app.exit(0);
        break;
      // Stop & Delete
      case 1:
        await stopValidatorContainer();
        await removeValidatorContainer();
        app.exit(0);
        break;
      // Leave Running
      case 2:
        // TODO might close multiple window at once.
        app.exit(0);
        break;
      // Cancel
      case 3:
        break;
      default:
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  // eslint-disable-next-line promise/always-return
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(log.catchErrors);
