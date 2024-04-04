const { createPluginServer } = require('../../PluginServer.js')
const { addReturnStatementIfNecessary } = require('../../../JavascriptCode.js')

const vscode = createPluginServer('VSCode', 0xbada)

const call = async (name, args) => {
  let isError
  switch (name) {
    case 'vscode':
      {
        let content
        try {
          let { javascript } = args
          if (!javascript) {
            throw new Error("`javascript` is required.")
          }
          const req = javascript.indexOf('require')
          if (req < 0) {
            javascript = "const vscode = require('vscode')\n"+javascript
          }
          javascript = addReturnStatementIfNecessary(javascript)
          const newScript = `(async function() { ${javascript} })()`
          const scriptResult = await vscode.evaluateScript('vscode', newScript)
          content = JSON.stringify(scriptResult, null, ' ')
        } catch (err) {
          console.error("scriptError", err)
          isError = true
          content = err.message
        }
        console.log("vscode reply", content)
        return {
          content, isError
        }
      }
  }
}

module.exports = { call }
