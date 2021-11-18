const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    runValidator() {
      ipcRenderer.send('run-validator', {});
    },
    solState() {
      ipcRenderer.send('init', 'ping');
    },
    keypairs() {
      ipcRenderer.send('keypairs', {});
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
    on(channel, func) {
      const validChannels = [
        'init',
        'run-validator',
        'keypairs',
        'add-keypair',
        'airdrop',
        'validator-logs',
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = [
        'init',
        'run-validator',
        'keypairs',
        'add-keypair',
        'airdrop',
        'validator-logs',
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
