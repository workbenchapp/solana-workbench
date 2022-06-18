const { contextBridge, ipcRenderer } = require('electron');
const log = require('electron-log');
const promiseIpc = require('electron-promise-ipc');
// TODO: make this a setting...
log.transports.console.level = 'silly';
log.transports.ipc.level = 'silly';

const send = (method, msg) => {
  ipcRenderer.send('main', method, msg);
};

contextBridge.exposeInMainWorld('electron', {
  log: log.functions,
  ipcRenderer: {
    runValidator() {
      send('run-validator', {});
    },
    stopValidator() {
      send('stop-validator', {});
    },
    validatorState(msg) {
      send('validator-state', msg);
    },
    validatorLogs(msg) {
      send('validator-logs', msg);
    },
    fetchAnchorIDL(msg) {
      send('fetch-anchor-idl', msg);
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
