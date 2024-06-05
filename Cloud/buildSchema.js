const fs = require('fs')
const fss = require('fs/promises')
const path = require('path')
const os = require('os')
const { getSchema } = require('./Schema.js')

const copyFile = async (source, destination) => {
  return await fss.copyFile(source, path.join(destination, path.basename(source)))
}
const mkdir = async pathname => {
  if (!await fileExists(pathname)) {
    await fss.mkdir(pathname, { recursive: true })
  }
}

const main = async (serverURL) => {
  if (!serverURL) {
    const dest = `${__dirname}/../Build`
    const serverURLFile = path.join(dest, 'serverURL.txt')
    serverURL = (await fss.readFile(serverURLFile, 'utf-8')).trim()
    console.log("read server url", serverURL)
  }
  const dest = `${__dirname}/../Build`
  const instructions = await fss.readFile('./Instructions.txt', 'utf-8')
  const getInstructions = platform => {
    return instructions.replace('$platform$', platform)
  }
  const windowsInstructions = getInstructions("Windows")
  const macInstructions = getInstructions("Mac")
  await fss.writeFile(path.join(dest, 'Instructions-Windows.txt'), windowsInstructions, 'utf-8')
  await fss.writeFile(path.join(dest, 'Instructions-MacOS.txt'), macInstructions, 'utf-8')
  const schemaWindows = getSchema('win32', serverURL)
  const schemaMac = getSchema('darwin', serverURL)
  await fss.writeFile(path.join(dest, 'Schema-Windows.json'), JSON.stringify(schemaWindows, null, ' '), 'utf-8')
  await fss.writeFile(path.join(dest, 'Schema-MacOS.json'), JSON.stringify(schemaMac, null, ' '), 'utf-8')
  console.log("Copied Instructions and Schemas to Build folder")
}

main(process.argv[2])
