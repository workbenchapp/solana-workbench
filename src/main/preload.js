const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send(method, msg) {
      ipcRenderer.send('main', method, msg);
    },
    on(method, func) {
      // deliberately strip as it includes 'sender'
      ipcRenderer.on(method, (event, ...args) => {
        if (args.method === method) {
          func(...args);
        }
      });
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
