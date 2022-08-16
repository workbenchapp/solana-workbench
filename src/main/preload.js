const { contextBridge, ipcRenderer } = require('electron');
const log = require('electron-log');
const promiseIpc = require('electron-promise-ipc');

if (process.env.LOG_LEVEL) {
  log.transports.console.level = process.env.LOG_LEVEL;
  log.transports.ipc.level = process.env.LOG_LEVEL;
} else {
  log.transports.console.level = 'info';
  log.transports.ipc.level = 'info';
}

const send = (method, msg) => {
  ipcRenderer.send('main', method, msg);
};

contextBridge.exposeInMainWorld('electron', {
  log: log.functions,
  ipcRenderer: {
    validatorState(msg) {
      send('validator-state', msg);
    },
    validatorLogs(msg) {
      send('validator-logs', msg);
    },
    fetchAnchorIDL(msg) {
      send('fetch-anchor-idl', msg);
    },
    closeWindowAction(option) {
      send('close-window-actions', option);
    },
    on(method, func) {
      ipcRenderer.on(method, (event, ...args) => func(...args));
    },
    once(method, func) {
      ipcRenderer.once(method, (event, ...args) => func(...args));
    },
    removeListener(method, func) {
      ipcRenderer.removeListener(method, func);
    },
    removeAllListeners(channel) {
      ipcRenderer.removeAllListeners(channel);
    },
  },
});

contextBridge.exposeInMainWorld('promiseIpc', {
  send: (event, ...args) => promiseIpc.send(event, ...args),
  on: (event, listener) => promiseIpc.on(event, listener),
  off: (event, listener) => promiseIpc.off(event, listener),
  removeAllListeners: (event) => promiseIpc.removeAllListeners(event),
});
