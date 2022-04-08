import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { logger, initLogging } from './logger';
import { runValidator, validatorLogs } from './validator';
// import {
//   accounts,
//   getAccount,
//   importAccount,
//   deleteAccount,
//   updateAccountName,
// } from './accounts';
import fetchAnchorIdl from './anchor';
// import fetchValidatorNetworkInfo from './validatorNetworkInfo';

import {
  subscribeTransactionLogs,
  unsubscribeTransactionLogs,
} from './transactionLogs';
import { RESOURCES_PATH } from './const';
// import wbConfig from './config';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

const process = require('process');
const { Metadata, credentials } = require('@grpc/grpc-js');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const {
  SemanticResourceAttributes,
} = require('@opentelemetry/semantic-conventions');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-grpc');

const metadata = new Metadata();
metadata.set('x-honeycomb-team', 'KEY');

// The Trace Exporter exports the data to Honeycomb and uses
// the previously-configured metadata and the Honeycomb endpoint.
const traceExporter = new OTLPTraceExporter({
  url: 'grpc://api.honeycomb.io:443/',
  credentials: credentials.createSsl(),
  metadata,
});

// The service name is REQUIRED! It is a resource attribute,
// which means that it will be present on all observability data that your service generates.
//
// Your service name will be used as the Service Dataset in Honeycomb, which is where data is stored.
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'workbench-electron',
  }),
  traceExporter,

  // Instrumentations allow you to add auto-instrumentation packages
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk
  .start()
  .then(() => console.log('Tracing initialized'))
  .catch((error: Error) => console.log('Error initializing tracing', error));

process.on('SIGTERM', () => {
  // eslint-disable-next-line promise/catch-or-return
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error: Error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

let mainWindow: BrowserWindow | null = null;
const MAX_STRING_LOG_LENGTH = 32;

ipcMain.on(
  'main',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (event: Electron.IpcMainEvent, method: string, msg: any) => {
    logger.info('IPC event', { method, ...msg });
    let res = {};
    try {
      switch (method) {
        case 'run-validator':
          await runValidator();
          break;
        // case 'accounts':
        //   res = await accounts(msg);
        //   break;
        case 'validator-logs':
          res = await validatorLogs(msg);
          break;
        case 'fetch-anchor-idl':
          res = await fetchAnchorIdl(msg);
          break;
        // case 'update-account-name':
        //   await updateAccountName(msg);
        //   break;
        // case 'import-account':
        //   await importAccount(msg);
        //   break;
        // case 'get-account':
        //   res = await getAccount(msg);
        //   break;
        // case 'delete-account':
        //   await deleteAccount(msg);
        //   break;
        // case 'config':
        //   res = await wbConfig(msg);
        //   break;
        // case 'get-validator-network-info':
        //   res = await fetchValidatorNetworkInfo(msg);
        //   break;
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

  return (
    installer
      .default(
        extensions.map((name) => installer[name]),
        forceDownload
      )
      /* eslint-disable no-console */
      .catch(console.log)
  );
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
  .catch(console.log);
