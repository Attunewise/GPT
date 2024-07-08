const firebase  = require( 'firebase/compat/app')
require('firebase/compat/auth')
require('firebase/compat/firestore')
require('firebase/compat/storage')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const { docData, doc, collectionChanges } = require("rxfire/firestore")
const { bindCallback, of, concat, from, Subject, merge: mergeN, combineLatest } = require('rxjs')
const { catchError, filter, map, flatMap, take, merge  } = require('rxjs/operators')
const { axios }  = require('./Axios.js')
const { exec, spawn } = require('child_process')
const os = require('os')
const readline = require('readline')
const path = require('path')
const fss = require('fs/promises')
const fs = require('fs')
const { ChatService } = require('./ChatService.js')
const { session, BrowserWindow, app } = require('electron')
const { addReturnStatementIfNecessary, returnFunctionDecl } = require('./JavascriptCode.js')
const { getGeoLocation } = require('./Location.js')
const FastEmbed = require('./FastEmbed.js')
const { InMemorySearch } = require('./InMemorySearch.js')
const { shell, tempFile, getLoginShell } = require('./Shell.js')
const { encode } = require('gpt-3-encoder')
const { getScreenDimensions } = require('./Screen.js')
const { loadPlugins } = require('./PluginTools.js')

const countTokens = text => text ? encode(text).length : 0

const apiKey = fs.readFileSync('./apiKey.txt', 'utf-8').trim()
const serverURL = fs.readFileSync('./serverURL.txt', 'utf-8').trim()
const firebaseConfig = require('./firebaseConfig.json')

const delay = millis => new Promise(resolve => setTimeout(resolve, millis))
const formatDate = (utcOffset, when) => {
  const roundToSeconds = t => Math.round(t / 1000) * 1000
  const dateToString = (t, utcOffset) => moment(roundToSeconds(t + utcOffset / (1000 * 60))).format('YYYY-MM-DD HH:mm:ss Z')
  return dateToString(when, utcOffset)
}

const osascriptErrors = require('./osascript-error.json')

const electronLog = require('electron-log/main')
const log = (...args) => {
  console.log(...args)
  //electronLog.info(...args)
}

const logError = (...args) => {
  console.error(...args)
  //electronLog.error(...args)
}


const executeAppleScript = async (lang, script, timeout) => {
  const { filePath, cleanup } = await tempFile({ suffix: lang == 'javaScript' ? '.js' : '.scpt' });
  console.log({lang, script})
  await fss.writeFile(filePath, script, 'utf-8');
  await fss.chmod(filePath, '755');
  let langOpt = lang === 'javaScript' ? '-l JavaScript' : ''
  const cmd = `osascript ${langOpt}${filePath}`
  console.log(cmd)
  let timedOut = false
  const run = () => new Promise((resolve, reject) => {
    let output = ''
    let errorOutput = ''
    let timer
    const process = spawn('osascript', [filePath, '2>&1'])
    process.on('error', reject)
    process.stdout.on('data', (data) => {
      clearTimeout(timer)
      console.log(data)
      output += data.toString();
    });
    process.stderr.on('data', (data) => {
      clearTimeout(timer)
      console.log(data)
      output += data.toString();
    });
    if (timeout) {
      timer = setTimeout(() => {
        timedOut = true
        process.kill()
      }, timeout)
    }
    process.on('close', (code) => {
      cleanup()
      clearTimeout(timer)
      if (timedOut) {
        output = `(Timed Out after ${timeout / 1000} seconds) ` + (output || ' ')
        if (!code) {
          code = -1
        }
      }
      log(`Exit code: ${code}`)
      log('Output:', output)
      //cleanup(); // Clean up the temporary file
      resolve({ code, output })
    });
  })
  let { code, output } =  await run()
  if (code !== 0 && !timedOut) {
    const offset = filePath.length
    if (lang !== 'javaScript') {
      let errorCode
      if (output.endsWith(")")) {
        const lparen = output.lastIndexOf('(')
        errorCode = output.substring(lparen + 1, output.length-1)
        console.log('errorCode')
        output = output.substring(0, lparen) + '('+ errorCode +' '+osascriptErrors[errorCode] + ')'
      }
      let [ignored, start, end, ...rest] = output.split(':')
      start = parseInt(start)
      end = parseInt(end)
      const location = script.substring(start, end)
      const select = script.substring(0, start) + "`" + location + "`" + script.substring(end)
      //const select = '`' + location + '`'
      output = `${select}:\n${start}:${end}: ${rest.join(':')}`
    } else { 
      let [ignored, ...rest] = output.split(':')
      output = rest.join(':')
    }
  }
  return { code, output }
}

const googleSearch = async searchQuery => {
  const page = await openPage('https://www.google.com')
  const inputSelector = 'input[name="q"], textarea[name="q"]'
  const searchInput = await page.$(inputSelector)
  await searchInput.fill(searchQuery);
  await searchInput.press('Enter');
  await page.waitForSelector('#search');
  const searchResults = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('div.g');
    for (const item of items) {
      const title = item.querySelector('h3').textContent.trim();
      const url = item.querySelector('a').href;
      const snippetElement = item.querySelector('div.VwiC3b');
      const snippet = snippetElement ? snippetElement.textContent.trim() : '';
      results.push({ title, url, snippet });
    }
    return results;
  });
  return searchResults
}

let electronApp
let page

initPlaywright = async () => {
  if (!electronApp) {
    const { _electron } = require('playwright');
    electronApp = await _electron.launch({
      args: ['./electron-playwright.js', '--disable-http2', '--disable-blink-features=AutomationControlled'],
      ignoreHTTPSErrors: true,
      headless: false,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.81"
    });
    const result = await electronApp.evaluate(({ app, session }) => {
      app.whenReady().then(() => {
        session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
          //console.log("permission.check", permission)
          return true
        })
        session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
          //console.log("permission.req", permission)
          callback(true)
          return true
        })
        //console.log("installed permission handlers")
      })
    })
    //console.log('initPlayWright', result)
  }
}

const openPage = async (url, options) => {
  options = options || {
    width: 800,
    height: 600,
    visible: true
  }
  const { width, height, visible } = options
  await initPlaywright()
  if (!page) {
    console.log("options", options)
    await electronApp.evaluate(({ BrowserWindow, session}, options) => {
      options = JSON.parse(options)
      console.log("inside options", options)
      const { url, height, width, visible, title } = options
      const newWindow = new BrowserWindow({
        width,
        height,
      })
      newWindow.on('close', (event) => {
        event.preventDefault();
        newWindow.hide();
      });
      console.log("created electron window")
      setTimeout(() => {
        newWindow.setTitle(title)
        newWindow.loadURL(url)
      }, 200)
    }, JSON.stringify({
      width, height, visible, title: 'Assistant', url
    }))
    page = await electronApp.waitForEvent('window')
    await page.setDefaultTimeout(10000)
  } else {
    await electronApp.evaluate(({BrowserWindow}, options) => {
      const { height, width, visible } = JSON.parse(options)
      const allWindows = BrowserWindow.getAllWindows()
      const mainWindow = allWindows[0]
      if (visible) {
        mainWindow.show()
      } else {
        mainWindow.hide()
      }
      mainWindow.setSize(width, height)
    }, JSON.stringify(options))
    await page.goto(url, { waitUntil: 'load' });
  }
  return page
}

const scrape = async page => {
  await page.waitForLoadState('load')
  const content = await page.evaluate(() => {
    const extractContent = (node) => {
      let text = '';
      let links = []
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          //text += child.nodeValue.trim() + '\n';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.nodeName === 'A') {
            links.push('[' + child.textContent.trim() + '](' + child.href + ')')
          } else if (child.nodeName === 'P' || child.nodeName === 'H1' || child.nodeName === 'H2' || child.nodeName === 'H3' || child.nodeName === 'H4' || child.nodeName === 'H5' || child.nodeName === 'H6') {
            text += child.innerText.split('.').join('\n')
          } else {
            const result = extractContent(child);
            links = links.concat(result.links)
            text += result.text
          }
        }
      }
      return { links, text: text.trim() }
    }
    return extractContent(document.body)
  })
  return content
}

const documents = {}

const searchDocument = async ({document, query, chunkSize, limit, createEmbeddings}) => {
  let existing = documents[document]
  let idx
  let docs
  let embeddingSearch
  if (!existing || existing.chunkSize !== chunkSize) {
    let text
    let links
    if (!existing) {
      const page = await openPage(document)
      //text = await page.evaluate(() => document.documentElement.innerText)
      const scraped = await scrape(page)
      text = scraped.text
      links = scraped.links
    } else {
      text = existing.text
      links = existing.links
    }
    chunkSize = chunkSize || 200
    //console.log("GOT TEXT", text)
    //console.log("GOT LINKS", links)
    const lunr = require('lunr')
    docs = {}
    const chunks = []
    const sentences = text.split(/[.\n]/).map(x => x.trim()).filter(x=>x)
    idx = lunr(function() {
      this.field('text')
      let id = 0
      const self = this
      const add = (doc) => {
        //console.log("adding", doc)
        self.add(doc)
        docs[doc.id] = doc
      }
      //console.log("sentences", sentences)
      let tokens = 0
      let doc = []
      let i = 1
      const flush = () => {
        const chunk = doc.join('\n').trim()
        if (chunk) {
          chunks.push(chunk)
          add({id: i, text: chunk})
          doc = []
          tokens = 0
          i++
        }
      }
      for (const sentence of sentences) {
        doc.push(sentence)
        tokens += countTokens(sentence)
        if (tokens > chunkSize) {
          //console.log("tokens", tokens)
          flush()
        }
      }
      flush()
      for (const link of links) {
        self.add({id: i, text: link})
        i++
      }
    })
    embeddingSearch = new InMemorySearch(createEmbeddings)
    await embeddingSearch.index(chunks)
    documents[document] = { idx, text, links, chunkSize, docs, embeddingSearch }
  } else {
    idx = existing.idx
    docs = existing.docs
    embeddingSearch = existing.embeddingSearch
  }
  let results1 = idx.search(query).map(result => {
    console.log('result', result)
    const result1 = docs[result.ref]    
    return result1 ? result1.text : ''
  }).filter(x => x)
  let results2 = await embeddingSearch.search(query)
  return {
    keyword: results1.slice(0, limit || 3),
    vector: results2.results.slice(0, limit || 3)
  }
}

const windows = {
}

const getOrigin = url => new URL(url).origin

async function verifyURL(url) {
  return axios.head(url)
    .then(response => {
      // URL is valid, you can check response.status or response.headers here
      console.log('URL is valid:', response.status);
      return true;
    })
    .catch(error => {
      console.error(error)
      if (error.status === 405) {
        return true
      }
      console.log(error)
      throw new Error(error.message)
    });
}

const open = async (url, onClose) => {
  if (!onClose) {
    return await openPage(url)
  }
  await verifyURL(url)
  const getCurrentUrl = async win => {
    return await win.webContents.executeJavaScript('location.href')
  }

  if (!url) {
    throw new Error('target is required')
  }
  const key = getOrigin(url)
  if (windows[key]) {
    const { window } = windows[key]
    const location = await getCurrentUrl(window)
    if (location !== url) {
      window.loadURL(url)
    }
    return window
  }
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'Preload.js'),
      'node-integration': true,
      'web-security': false,
    }
  })
  //await window.webContents.openDevTools()
  window.on('closed', () => {
    delete windows[key]
    if (onClose) onClose()
  })
  window.webContents.on('will-navigate', event => {
    try {
      console.log('will-navigate', event)
      const data = { from: url, to: event.url }
      window.ipcRenderer.send('will-navigate', JSON.stringify(data))
    } catch(err) {
      console.error(err)
    }
  })
  window.loadURL(url)
  windows[key] = {
    window
  }
  return new Promise(resolve => {
    window.webContents.on('did-finish-load', () => {
      console.log('Page loaded');
      resolve(window)
    })
  })
}

let server = serverURL

log('firebaseConfig', firebaseConfig)
firebase.initializeApp(firebaseConfig)
firebase.firestore().settings({ignoreUndefinedProperties:true})

let _osVersion
const getOSVersion = async () => {
  if (_osVersion !== undefined) {
    return _osVersion
  }
  let command;
  if (os.platform() === 'darwin') {
    // macOS
    command = 'sw_vers -productVersion';
  } else if (os.platform() === 'win32') {
    // Windows
    command = 'powershell systeminfo | findstr /B /C:"OS Version"';
    // Alternatively, use 'wmic os get Caption, Version' for a shorter output
  } else {
    throw new Error('Unsupported OS');
  }
  let { code, output } = await shell(command)
  if (os.platform() === 'win32') {
    output = output.split(':')[1].trim()
  }
  return _osVersion = output.trim()
}

utcOffset = -(new Date().getTimezoneOffset()*60*1000)

const getToolSchema = name => {
  const platform = os.platform() === 'win32' ? 'Windows' : 'MacOS'
  const {paths} = require('../Build/Schema-${platform}.json')
  for (const path in paths) {
    const { operationId } = paths[path].post
    if (operationId === name) {
      return paths[path]
    }
  }
}

class ToolClient {

  constructor(opts) {
    const { sendMessage } = opts
    this.sendMessage = sendMessage
    loadPlugins().then(tools => {
      this.pluginTools = tools
    })
  }

  login = async () => {
    const func = this.getFunc('gptLogin')
    const response = await func({apiKey})
    const { customToken } = response.data
    const { user } = await firebase.auth().signInWithCustomToken(customToken)
    this.self = user
    this.uid = user.uid
    this.initToolCalls()
    this.initTaskNotes()
    getGeoLocation().then(location => {
      console.log("LOCATION", location)
      this.location = location
    })
  }

  createEmbeddings = async documents => {
    return await FastEmbed.createEmbeddings(documents)
  }

  getFunc = name => {
    return async (data) => {
      const token = await this.getToken()
      const url = `${server}/${name}`
      log("getFunc", url)
      //log("getFunc", name, data)
      const response = await axios.post(url, data, {
        headers: {
          Authorization: 'Bearer '  + token
        }
      })
      log("result", name, response.data)
      return response
    }
  }

  observeTaskNotes = () => {
    const db = firebase.firestore()
    const c = db.collection('UserChannel').doc(this.uid).collection('taskNotes')
    let ob = collectionChanges(c).pipe(flatMap(changes => {
      return changes.map(change => {
        const { type, doc } = change
        const data = doc.data()
        return {
          type,
          snap: doc,
        }
      })
    }))
    return ob
  }

  taskNotes = new InMemorySearch(this.createEmbeddings)

  initTaskNotes = () => {
    this.observeTaskNotes().subscribe(change => {
      const { type, snap } = change
      if (type === 'removed') {
        this.taskNotes.remove(snap.id)
      } else {
        const { notes, task, embedding } = snap.data()
        const id = snap.id
        this.taskNotes.add({id, content: { notes, task }, embedding })
      }
    })
  }

  searchTaskNotes = async (query, limit) => {
    return await this.taskNotes.search(query, limit)
  }

  updateTaskNotes = async ({ upserts, deletes }) => {
    const db = firebase.firestore()
    const c = db.collection('UserChannel').doc(this.uid).collection('taskNotes')
    const batch = db.batch()
    let updated = 0
    let inserted = 0
    let deleted = 0
    if (deletes) for (const id of deletes) {
      console.log('deleting', id)
      const ref = c.doc(id)
      batch.delete(ref)
      deleted++
    }
    if (upserts) {
      const { embeddings } = await this.createEmbeddings(upserts.map(x => x.task + ':\n' + x.notes))
      upserts.forEach((upsert, i) => {
        let { id, task, notes } = upsert
        const embedding = embeddings[i]
        let ref
        if (!id) {
          ref = c.doc()
          inserted++
        } else {
          updated++
          ref = c.doc(id)
        }
        const updates = { task, notes, embedding }
        console.log('updates', updates)
        batch.set(ref, updates, { merge: true })
      })
    }
    await batch.commit()
    let message = ''
    let sep = ''
    if (inserted) {
      message += 'Inserted ' + inserted + ' notes.'
      sep = ' '
    }
    if (updated) {
      message += sep
      message += 'Updated ' + updated + ' notes.'
      sep = ' '
    }
    if (deleted) {
      message += sep
      message += 'Deleted ' + deleted + ' notes.'
    }
    return message
  }

  initToolCalls = async () => {
    const db = firebase.firestore()
    console.log("init tool calls", this.uid)
    const c = db.collection('UserChannel').doc(this.uid).collection('toolCalls')
    const { docs } = await c.where('received', '==', false).get()
    const batch = db.batch()
    for (const snap of docs) {
      batch.delete(snap.ref)
    }
    await batch.commit()
    let taskNotesChecked = false
    let wasError
    this.sub1 = this.observeToolCalls().subscribe(async data => {
      const { type, snap, toolCall } = data
      const ref = c.doc(snap.id)
      if (type == 'added') {
        const args = toolCall.arguments
        const name = toolCall.name
        if (name === 'searchTaskNotes') {
          taskNotesChecked = true
        } else {
          taskNotesChecked = false
        }
        const id = '' + toolCall.ts
        await ref.set({
          received: true
        }, { merge: true })
        let { content, isError } = await this.applyToolCall({id, name, args}, x => x)
        console.log(content)
        if (isError) {
          wasError = true
          content = 'The following error occurred:\n' + content
          if (!taskNotesChecked) {
            content += "\n\nPlease check your task notes if you haven't already by calling `searchTaskNotes` before continuing."
          }
        } else {
          taskNotesChecked = false
          if (wasError) {
            content += "\nUpdate your task notes if necessary."
            wasError = false
          }
        }
        console.log("TOOL CALL OUTPUT", content)
          await ref.set({
            content,
            isError,
          }, { merge: true })
      }
    })
  }

  getToolCallsRef = () => firebase.firestore().collection('UserChannel').doc(this.uid).collection('toolCalls')

  observeToolCalls = () => {
    let q = this.getToolCallsRef()
    q = q.orderBy('ts', 'desc').limit(1)
    let ob = collectionChanges(q).pipe(flatMap(changes => {
      return changes.map(change => {
        const { type, doc } = change
        const data = doc.data()
        console.log('toolCall', data)
        return {
          type,
          snap: doc,
          toolCall: data
        }
      })
    }), filter(x => {
      return !x.toolCall.received
    }))
    return ob
  }

  getPlatformInfo = async () => {
    const platform = process.platform === 'darwin' ? 'MacOS' : 'Windows'
    const osVersion = await getOSVersion()
    const shell = await getLoginShell()
    const info = { platform, osVersion, shell }
    log("platformInfo", info)
    return info
  }

  getToken = async () => this.user ? await this.user.getIdToken() : null

  applyToolCall = async (toolCall, reply) => {
    const { name, args, id } = toolCall
    console.log( { name, args })
    const db = firebase.firestore()
    let isError
    switch (name) {
      default:
        if (this.pluginTools) {
          for (const tool of this.pluginTools) {
            const supported = tool.getTools()
            if (supported.indexOf('name') >= 0) {
              try {
                const { isError, content } = await tool.call(name, args)
                return reply({
                  content, isError
                })
              } catch (err) {
                console.error(err)
                return { content: "Error invoking plugin: " + tool.getName() + "\n" + err.message, isError: true }
              }
            }
          }
        }
        break
      case 'openURL':
      case 'open':
        {
          let content = ''
          try {
            const { target } = args
            const url = target
            if (!url.startsWith('http')) {
              const open = (await import('open')).default
              console.log('open', open)
              let pathname
              try {
                const u = new URL(url)
                pathname = u.pathname
              } catch (err) {
                pathname = url
              }
              await open(pathname)
              content = "Opened app."
            }  else {
              const window = await openPage(url)
              content = "Window created."
            }
          } catch (err) {
            isError = true
            content = err.message
          }
          return reply({
            content, isError
          })
        }
        break
      case 'playwright':
        {
          let content = ''
          try {
            let { target, script, window } = args
            const page = await openPage(target, window)
            console.log(script)
            script = returnFunctionDecl(script)
            const fun = await eval(script)
            page.page = page
            console.log('fun', fun)
            if (typeof fun === 'function') {
              const result = await fun(page)
              console.log("called fun result=>", result)
              content = JSON.stringify(result)
            } else {
              content = JSON.stringify(fun)
              console.log("fun not called result=>", content)
            }
          } catch (err) {
            console.error(err)
            isError = true
            content = err.message
          }
          return reply({
            content, isError
          })
        }
        break
      case 'queryChatDb':
        {
          let content = ''
          try {
            let { query } = args
            const chatService = new ChatService()
            const messages = await chatService.searchMessages(query)
            content = JSON.stringify(messages)
          } catch (err) {
            isError = true
            content = err.message
          }
          return reply({
            content, isError
          })
        }
        break
      case 'osascript':
        {
          let content = ''
          try {
            let { lang, command, script } = args
            script = script || command
            log("COMMAND", script)
            if (lang) {
              switch (lang.toLowerCase()) {
                case 'jxa':
                case 'javascript':
                  lang = 'javaScript'
                  break
                case 'applescript':
                  lang = 'appleScript'
                  break
                default:
                  throw new Error("`lang` must be one of `appleScript` or `javaScript`")
              }
            }
            lang = lang || 'appleScript'
            if (lang === 'javaScript') {
              script = "(function() {" + script + "})()" 
            }
            const { code, output } = await executeAppleScript(lang, script, 120000)
            console.log('apple script output', {code, output})
            isError = code !== 0
            content += "`exit code " + code+"`\n"
            content += output || ''
          } catch (err) {
            console.error(err)
            content = err.message
            isError = true
          }
          log("osascript output", content)
          content = content || ''
          if (!content.trim()) {
            content = "Empty output."
          }
          return reply({
            content, isError
          })
        }
        break
      case 'powershell':
        {
          let content
          try {
            const { command, admin } = args
            const { code, output } = await shell(command, {powershell: true, admin, timeout: 120000})
            if (code !== 0) {
              isError = true
            }
            let exitCode = 'exit code ' + code + "\n"
            content = exitCode
            if (output) {
              content += output
            }
          } catch (err) {
            console.error(err)
            isError = true
          }
          return reply({
            content, isError
          })
        }
        break
      case 'writeToTerminal':
        {
          let content
          try {
            const { text } = args
            const { code, output } = await shell(text, {timeout: 120000})
            if (code !== 0) {
              isError = true
            }
            let exitCode = 'exit code ' + code + "\n"
            content = exitCode
            if (output) {
              content += output
            }
          } catch (err) {
            console.error(err)
            isError = true
          }
          return reply({
             content, isError
          })
        }
        break
      case 'writeToFiles':
        {
          let content
          try {
            const { files } = args
            for (const file of files) {
              let { pathname, text, encoding, append } = file
              const homeDirectory = require('os').homedir();
              pathname = pathname.replace('~', homeDirectory)
              if (append) {
                await fss.appendFile(pathname, text, encoding)
              } else {
                await fss.writeFile(pathname, text, encoding)
              }
            }
            content = 'exit code 0'
          } catch (err) {
            logError(err)
            content = err.message
            isError = true
          }
          return reply({
            content, isError
          })
        }
        break
      case 'awaitEvalJavascript':
        {
          let content
          try {
            let { code } = args
            code = addReturnStatementIfNecessary(code)
            log("code: ", code)
            const script = `
(async () => {
   try {
      return await (async () => { ${code} })()
   } catch (err) {
     console.error(err);
     return err.message
   }
})()`
            const output = await eval(script)
            let result
            if (typeof output === 'function') {
              result = await output()
            } else {
              result = await output
            }
            content = result === undefined ? 'undefined' : JSON.stringify(result)
          } catch (err) {
            content = err.message
            isError = true
          }
          return reply({
            content, isError 
          })
        }
        break
      case 'fetch':
        {
          let content
          const options = args
          try {
            const fetch = (await import('node-fetch')).default
            const url = options.resource
            const response = await fetch(url, options)
            const contentType = response.headers.get('content-type');
            const lastModified = response.headers.get('last-modified')
            const etag = response.headers.get('etag')
            let contentLength = response.headers.get('content-length')
            if (contentLength === null) {
              try {
                const rsp = await axios.head(url, {
                  headers: options.headers
                })
                contentLength = rsp.headers['content-length']
              } catch (err) {
                console.error(err.message)
              }
            }
            content = await response.text()
          } catch (err) {
            logError(err)
            content = err.message
            isError = true
          }
          return reply({
            content, isError
          })
        }
        break
      case 'modifyTaskNotes':
        {
          const { upserts, deletes } = args
          let content
          try {
            content = await this.updateTaskNotes({ upserts, deletes })
          } catch (err) {
            console.error(err)
            content = err.message
            isError = true
          }
          return reply({
            content, isError
          })
        }
        break
      case 'searchWeb':
        {
          let content
          try {
            let {  query, limit } = args
            const searchResults = await googleSearch(query)
            content = JSON.stringify(searchResults)
          } catch (err) {
            console.error("searchWeb", err)
            isError = true
            content = err.message
          }
          return reply({
            content, isError
          })
        }
        break
      case 'searchWebPage':
        {
          let content
          try {
            let { document, query, chunkSize, limit } = args
            const createEmbeddings = this.createEmbeddings
            const { keyword, vector }  = await searchDocument({document, query, chunkSize, limit, createEmbeddings})
            console.log("RESULTS", {keyword, vector})
            limit = limit || 3
            let i = 0;
            let results = []
            for (const result of keyword) {
              results.push({index: i, type: 'keyword', result})
              i++
            }
            for (const result of vector) {
              results.push({index: i, type: 'vector', result})
              i++
            }
            console.log("RESULTS INDEXED", results)
            if (i > 3) {
              content = `The following results were obtained using various methods. ${JSON.stringify(results)}`
            } else {
              content = JSON.stringify(results.map(x => x.result))
            }
          } catch (err) {
            console.error("scriptError", err)
            isError = true
            content = err.message
          }
          console.log("searchDocument reply", content)
          return reply({
            content, isError
          })
        }
        break
      case 'searchTaskNotes':
        {
          const uid = this.uid
          let content
          try {
            const { query } = args
            const { results } = await this.searchTaskNotes(query)
            content = JSON.stringify(results)            
          } catch (err) {
            console.error(err)
            content = err.message
            isError = true
          }
          return reply({
            content, isError
          })
        }
        break
      case 'getUserInfo':
        {
          const { platform, osVersion } = await this.getPlatformInfo()
          const {city, region, country, loc, postal, timezone } = this.location
          const { width, height } = await getScreenDimensions()
          const content = `User info: ${JSON.stringify(os.userInfo())}
Location: ${JSON.stringify({city, region, country, geo: loc, postal, timezone})}
UTC offset: ${utcOffset}
Local time: ${formatDate(utcOffset, Date.now())}
Hostname: ${os.hostname()}
Platform: ${platform} ${osVersion}
Screen: ${width}x${height}
`
          return reply ({
            content, isError
          })
        }
        break
    }
  }
}

module.exports = { ToolClient }
