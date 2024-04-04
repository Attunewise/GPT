const path = require('path')
const fss = require('fs/promises')

class PluginTool {

  constructor(config, tool) {
    this.config = config
    this.tool = tool
  }

  getName = () => {
    return this.config.name
  }

  getTools = () => {
    return this.config.tools.map(tool => tool.function.name)
  }

  call = async (name, args) => {
    return await this.tool.call(name, args)
  }

  appendToSchema = (schema) => {
    //console.log('append to schema', this.config)
    const append = (tool, schema) => {
      const key = `/gpt/${tool.function.name}`
      const value = {
        "post": {
          "operationId": tool.function.name,
          "summary": tool.function.description,
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": tool.function.parameters
              }
            }
          }
        }
      }
      schema.paths[key] = value
    }
    for (const tool of this.config.tools) {
      append(tool, schema)
    }
  }
}

let pluginTools = []

const installPlugins = async () => {
  const result = await loadPlugins(true)
  const { windowsSchema, macSchema } = result
  if (windowsSchema) {
    await fss.writeFile('../Build/Schema-Windows-with-plugins.json', JSON.stringify(windowsSchema, null, ' '), 'utf-8')
  }
  if (macSchema) {
    await fss.writeFile('../Build/Schema-MacOs-with-plugins.json', JSON.stringify(windowsSchema, null, ' '), 'utf-8')
  }
  process.exit(1)
}

const loadPlugins = async (installOnly) => {
  let windowsSchema
  let macSchema
  windowsSchema = require('../Build/Schema-Windows.json')
  macSchema = require('../Build/Schema-MacOS.json')
  const folder = path.join(__dirname, 'Plugin', 'plugins')
  const files = await fss.readdir(folder)
  const pluginTools = []
  for (const file of files) {
    const fullPath = path.join(folder, file)
    const isDirectory = (await fss.stat(fullPath)).isDirectory
    if (isDirectory) {
      let config
      try {
        config = require(path.join(fullPath, 'config.json'))
      } catch (err) {
        console.error(err)
        console.log("Couldn't load plugin "+fullPath)
        continue
      }
      const { name, platforms, enabled, tools } = config
      console.log("config", config)
      if (enabled) {
        let tool
        if (!installOnly) {
          try {
            tool = require(path.join(fullPath, 'Tool.js'))
          } catch (err) {
            console.error(err)
            console.log("Couldn't load plugin "+fullPath)
            continue
          }
          console.log("enabling tool", JSON.stringify(config, null, ' '))
        }
        pluginTools.push(new PluginTool(config, platforms, tool))
      }
    }
  }
  for (const tool of pluginTools) {
    console.log('config', tool.config)
    if (tool.config.platforms.find(p => p === 'windows')) {
      tool.appendToSchema(windowsSchema)
    }
    if (tool.config.platforms.find(p => p === 'macos')) {
      tool.appendToSchema(macSchema)
    }
  }
  return { tools: pluginTools, windowsSchema, macSchema }
}


module.exports = { loadPlugins, installPlugins }
