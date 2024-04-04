Experimental use of plugin tools:
We've added a method for plugging in additional tools and as an example provided a plugin for VSCode
You can add new tools by addign a folder under `Assistant/Plugin/plugins`. The folder must contain the following files:
1. `config.json`
2. `Tool.js`

`config.json` provides the name, whether the plugin is enabled, the platforms it suppports, and the tools it supports in the form of function definitions according to the OpenAI function calling specification. Here is an example:
```
{
  "name": "VScode",
  "enabled": true,
  "platforms": ["windows", "macos"],
  "tools": [{
    "type": "function",
    "function": {
      "name": "vscode",
      "description": "Execute javascript code inside of a Visual Studio Code (VSCode) extension. You can safely access all capabilities of VSCode via its extensibilty API. This allows you to assist the user in all forms of software development.",
      "parameters": {
        "type": "object",
        "properties": {
          "javascript": {
            "type": "string",
            "description": "The javascript code to execute."
          }
        },
        "required": ["javascript"]
      }
    }
  }]
}
```

`Tool.js` must export a single function `call` which will take two arguments, `name`, and `args` corresponding to the function call. It must return an object containg to properties `content` which is a string containing the output of the function call and `isError` which is a boolean. If isError is true, then `content` should contain the error message.

The VSCode plugin uses a websocket server to communicate with the plugin running inside of VSCode. You can use this framework for other plugins, for example we've used it with `ExtendScript` and `UXP` plugins for Adobe Creative Suite.


Once you've enabled a plugin, you can generate new JSON action schemas for its tools by navigating to the `Assistant` folder, and running

```
node installPlugins.js
``

This will generate `Schema-Windows-with-plugins.json` and `Schema-MacOS-with-plugins.json` in the `Build` folder which you can then copy and paste int o your GPT configuration in the OpenAI GPT editor.

