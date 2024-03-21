const { ipcRenderer, contextBridge } = require('electron')

contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    sendEvent: (event, message) => {
      try {
        ipcRenderer.send(event, message)
      } catch (err) {
        console.error(err)
      }
    },
    sendMessage: message => {
      try {
        ipcRenderer.send('request', message)
      } catch (err) {
        console.error(err)
      }
    },
    onReply: callback => ipcRenderer.on('reply', (event, arg) => {
      callback(arg)
    })
  }
)









