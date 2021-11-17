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
    on(channel, func) {
      const validChannels = ['init', 'run-validator', 'keypairs'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = ['init', 'run-validator', 'keypairs'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
