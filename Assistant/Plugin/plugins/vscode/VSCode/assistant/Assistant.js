const  WebSocket = require('ws')
const port = 0xbada;

class Assistant {

  onDestroy() {
    this.disconnect()
  }

  onCreate(context) {
    this.context = context
    this.tryConnect()
  }

  evaluateScript = async script => {
    return await eval(script)
  }
  
  tryConnect = async () =>  {
    this.ws = new WebSocket('http://localhost:' + port);
    this.init()
  }

  init() {
    const self = this
    const ws = this.ws
    ws.onopen = async function() {
      try {
        console.log('Connected to the server');
        const appName = 'vscode'
        const initMessage = JSON.stringify({ type: 'appName', appName });
        ws.send(initMessage);

      } catch (err) {
        debugger
        console.error(err)
      }
    };

    const sendReply = msg => {
      console.log('REPLY',  msg)
      ws.send(JSON.stringify(msg))
    }
          
    
    ws.onmessage = async function(event) {
      console.log('Message from server:', event.data);
      
      try {
        const request = JSON.parse(event.data);
        
        if (request.script) {
          try {
            const reply = await self.evaluateScript(request.script)
            sendReply({ type: 'result', result: reply, reqId: request.reqId })
          } catch (err) {
            console.error(err)
            let error
            if (!err.message) {
              error = JSON.stringify(err)
            } else {
              error = err.message
            }
            if (err.stack) {
              const lines = err.stack.split('\t').filter(line => line.indexOf('<anonymous>') >= 0)
              for (const line of lines) {
                const start = line.indexOf('<anonymous>')
                const end = line.indexOf(')', start)
                const location = line.substring(start, end)
                error += '\t at ' + location + '\n'
              }
            }
            sendReply({ type: 'error', error , reqId: request.reqId })
          }
        } else {
          console.error('Invalid message format');
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
    
    ws.onerror = function(error) {
      console.error('WebSocket Error:', error.message);
      try {
        ws.close();
      } catch (ignored) {}
    }
    ws.onclose = function() {
      console.log('Disconnected from the server');
      clearTimeout(self.retryTimeout)
      self.retryTimeout = setTimeout(self.tryConnect, 3000);
    }
  }
}


module.exports = { Assistant }
