const { app } = require('electron');

app.on('ready', () => {
  console.log('Electron app is ready, no main window created.');
  // Initialize your background tasks or services here
  // Do not create a BrowserWindow instance

  // If you need to test IPC communication, setup IPC listeners here
  // ipcMain.on('message', (event, args) => { ... });
});

app.on('window-all-closed', () => {
})

// You may not need the 'activate' event handler if no UI is involved
// but it's useful if you decide to open windows based on some events
app.on('activate', () => {
  // This event fires when the app is activated (e.g., clicking app icon)
  // You could create a window here if needed based on some condition
});
