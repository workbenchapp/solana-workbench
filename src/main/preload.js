const { contextBridge, ipcRenderer } = require('electron');

const allValidChannels = [
  'sol-state',
  'run-validator',
  'accounts',
  'validator-logs',
  'fetch-anchor-idl',
  'update-account-name',
  'import-account',
  'get-account',
  'delete-account',
  'program-changes',
  'subscribe-program-changes',
  'unsubscribe-program-changes',
];

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    runValidator() {
      ipcRenderer.send('run-validator', {});
    },
    solState(msg) {
      ipcRenderer.send('sol-state', msg);
    },
    accounts(msg) {
      ipcRenderer.send('accounts', msg);
    },
    addKeypair() {
      ipcRenderer.send('add-keypair', {});
    },
    airdropTokens(msg) {
      ipcRenderer.send('airdrop', msg);
    },
    validatorLogs(msg) {
      ipcRenderer.send('validator-logs', msg);
    },
    fetchAnchorIDL(msg) {
      ipcRenderer.send('fetch-anchor-idl', msg);
    },
    updateAccountName(msg) {
      ipcRenderer.send('update-account-name', msg);
    },
    importAccount(msg) {
      ipcRenderer.send('import-account', msg);
    },
    getAccount(msg) {
      ipcRenderer.send('get-account', msg);
    },
    deleteAccount(msg) {
      ipcRenderer.send('delete-account', msg);
    },
    onProgramLog(msg) {
      ipcRenderer.send('get-account', msg);
    },
    subscribeProgramChanges(msg) {
      ipcRenderer.send('subscribe-program-changes', msg);
    },
    unsubscribeProgramChanges(msg) {
      ipcRenderer.send('unsubscribe-program-changes', msg);
    },
    on(channel, func) {
      if (allValidChannels.includes(channel)) {
        // deliberately strip as it includes 'sender'
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = ['accounts', 'fetch-anchor-idl'];
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
    removeListener(channel, func) {
      if (allValidChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    removeAllListeners(channel) {
      if (allValidChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },
});
