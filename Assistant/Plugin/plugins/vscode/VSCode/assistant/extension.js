// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const { Assistant } = require('./Assistant.js')

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

let assistant
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  assistant = new Assistant()
  assistant.onCreate(context)
}

// This method is called when your extension is deactivated
function deactivate() {
  assistant.onDestroy()
}

module.exports = {
	activate,
	deactivate
}
