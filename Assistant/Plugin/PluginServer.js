const WebSocket = require('ws')

const delay = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000))

const createPluginServer = (name, port) => {
  // Create a WebSocket server on port 0xbad0
  console.log("Creating plugin server for plugin", name, "on port", port)
  const wss = new WebSocket.Server({ port });
  
  const apps = {}

  const isConnected = appName => {
    return apps[appName] || apps['the']
  }

  const getApp = async (appName, retry) => {
    console.log("getApp", appName)
    const app = apps[appName]
    if (app) {
      return app
    } else {
      if (!retry) {
        console.log("retrying...")
        await delay(5)
        return await getApp(appName, true)
      } 
      const message = "Service not available: "  + appName
      throw new Error(message)
    }
  }

  const listeners = {}

  const addEventListener = (appName, event, listener) => {
    const k = appName + '.' + event
    listeners[k] = { appName, listener }
    const app = apps[appName]
    if (app) {
      app.addEventListener(event, listener)
    }
  }

  const removeEventListener = (appName, event, listener) => {
    const k = appName + '.' + event
    delete listeners[k]
    const app = apps[appName]
    if (app) {
      app.removeEventListener(event, listener)
    }
  }

  const evaluateScript = async (appName, script) => {
    const app = await getApp(appName)
    return await app.evaluateScript(script)
  }
  
  class App {
    constructor(apps, allListeners, ws) {
      this.reqId = 0
      let appName
      this.ws = ws
      this.reqs = {}
      // Set up message event
      const self = this
      ws.on('message', message => {
        const json = JSON.parse(message)
        console.log('message', json)
        const reqId = json.reqId
        switch (json.type) {
          case 'event':
            {
              const value = json.event
              const { type } = value
              const event = value[type]
              self.fireEvent(type, event)
            }
            break
          case 'appName':
            appName = json.appName
            const existing = apps[appName]
            if (existing) {
              try {
                existing.close()
              } catch (ignored) {
              }
            }
            self.appName = appName
            this.listeners = Object.values(allListeners).filter(x => x.appName === appName).map(x => x.listener)
            apps[appName] = self
            console.log("New app connected: "+appName)
            self.fireEvent('connect', appName)
            return
          case 'result':
            const { resolve } = this.reqs[reqId]
            delete this.reqs[reqId]
            resolve(json.result)
            break
          case 'error':
            const {reject} = this.reqs[reqId]
            delete this.reqs[reqId]
            reject(new Error(json.error))
            break
        }
      })
    }
    evaluateScript = (script) => {
      const ws = this.ws
      return new Promise((resolve, reject) => {
        let id = ++this.reqId
        const msg = {
          reqId: `${id}`,
          target: this.appName,
          script
        }
        this.reqs[id] = {resolve, reject }
        ws.send(JSON.stringify(msg))
      })
    }
    addEventListener = (event, handler) => {
      let array = listeners[event]
      if (!array) {
        listeners[event] = [handler]
      } else {
        array.push(handler)
      }
    }
    removeEventListener = (event, handler) => {
      let array = listeners[event]
      if (array) {
        array = array.filter(x => x !== handler)
      }
    }
    fireEvent = (type, event) => {
      console.log("fire event", type, event)
      const listeners1 = listeners[type]
      const listeners2 = listeners['all']
      const dispatch = listeners => {
        if (listeners) {
          listeners.forEach(listener => listener(type, event))
        }
      }
      dispatch(listeners1)
      dispatch(listeners2)
    }

    close = () => {
      this.ws.close()
    }
  }

  // Set up connection event
  wss.on('connection', ws => {
    new App(apps, listeners, ws)
  })
  
  console.log('WebSocket server started on ws://localhost:'+ port);
  return {
    evaluateScript,
    isConnected,
    addEventListener,
    removeEventListener
  }

}



module.exports = { createPluginServer }
