const { contextBridge, ipcRenderer } = require('electron');

const send = (method, msg) => {
  ipcRenderer.send('main', method, msg);
};

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    runValidator() {
      send('run-validator', {});
    },
    validatorState(msg) {
      send('validator-state', msg);
    },
    // accounts(msg) {
    //   send('accounts', msg);
    // },
    // addKeypair() {
    //   send('add-keypair', {});
    // },
    // airdropTokens(msg) {
    //   send('airdrop', msg);
    // },
    validatorLogs(msg) {
      send('validator-logs', msg);
    },
    fetchAnchorIDL(msg) {
      send('fetch-anchor-idl', msg);
    },
    // fetchValidatorNetworkInfo(msg) {
    //   send('get-validator-network-info', msg);
    // },
    // updateAccountName(msg) {
    //   send('update-account-name', msg);
    // },
    // importAccount(msg) {
    //   send('import-account', msg);
    // },
    // getAccount(msg) {
    //   send('get-account', msg);
    // },
    // deleteAccount(msg) {
    //   send('delete-account', msg);
    // },
    // onProgramLog(msg) {
    //   send('get-account', msg);
    // },
    // config(msg) {
    //   send('config', msg);
    // },
    // subscribeTransactionLogs(msg) {
    //   send('subscribe-transaction-logs', msg);
    // },
    // unsubscribeTransactionLogs(msg) {
    //   send('unsubscribe-transaction-logs', msg);
    // },
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
