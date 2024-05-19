const { dialog, session, contextBridge, ipcMain, ipcRenderer, app, BrowserWindow } = require('electron')
const crypto = require('crypto')
const { ToolClient } = require('./ToolClient.js')
const path  = require('path')
const os = require('os')
const fs = require('fs')
const gptURL = fs.readFileSync('./gptURL.txt', 'utf-8').trim()
try {
//    require('electron-reloader')(module);
} catch (_) {}

let toolClient = new ToolClient('gpt-4')

dialog.showErrorBox = function(title, content) {
    console.log(`${title}\n${content}`);
};

initGPT = (win, url) => {
  console.log('initGPT', url)
  url = url.replace('chat.openai.com', 'chatgpt.com')
  win.webContents.on('did-finish-load', async () => {
    let current = win.webContents.getURL()
    console.log("current", current)
    if (current.startsWith(url)) {
      current = url
    }
    console.log(current)
    switch (current) {
      default:
      case 'https://chatgpt.com/':
      case 'https://chat.openai.com/':
      case 'https://chat.openai.com':
        let ses = win.webContents.session;
        const cookies = await ses.cookies.get({domain: 'chat.openai.com'})
        const cookies2 = await ses.cookies.get({domain: 'chatgpt.com'})
        console.log(cookies)
        const isLoggedIn = cookies.find(x => x.name == '__Secure-next-auth.session-token')
              || cookies2.find(x => x.name == '__Secure-next-auth.session-token')
        console.log("isLoggedIn", isLoggedIn)
        if (isLoggedIn) {
          console.log("LOADING", url)
          win.loadURL(url)
        }
        break
      case url:
      case url + '/':
        setTimeout(() => {
          let css = fs.readFileSync(path.join(__dirname, 'gpt-override.css'), 'utf-8')
          const { pathname } = new URL(url)
          css = css.replaceAll('$GPT_PATH', pathname)
          win.webContents.insertCSS(css);
          console.log("inserted css")
        }, 0)
    }
  });
  win.loadURL('https://chat.openai.com')
}

let win
async function createWindow () {
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    //console.log("permission check:", permission)
    return true
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    //console.log("permission request:", permission)
    callback(true)
  });
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'Preload.js'),
      nodeIntegration: true,
      webviewTag: true
    }
  });
  initGPT(win, gptURL)
  await toolClient.login()
}

console.log("started")
app.whenReady().then(() => {
  createWindow()
})
