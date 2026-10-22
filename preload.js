const { contextBridge, ipcRenderer } = require('electron');

// جسر الأمان لتمرير ميزات النظام للواجهة
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // يمكنك إضافة وظائف إضافية هنا عند الحاجة
  // مثال:
  // sendMessage: (message) => ipcRenderer.send('message', message),
});
