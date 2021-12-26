const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    runValidator() {
      ipcRenderer.send('run-validator', {});
    },
    solState() {
      ipcRenderer.send('sol-state', {});
    },
    accounts() {
      ipcRenderer.send('accounts', {});
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
    on(channel, func) {
      const validChannels = [
        'sol-state',
        'run-validator',
        'accounts',
        'add-keypair',
        'airdrop',
        'validator-logs',
        'fetch-anchor-idl',
        'update-account-name',
        'import-account',
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = [
        'sol-state',
        'run-validator',
        'accounts',
        'add-keypair',
        'airdrop',
        'validator-logs',
        'fetch-anchor-idl',
        'update-account-name',
        'import-account',
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
