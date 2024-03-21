const fss = require('fs/promises')
const { shell } = require('./Shell.js')

const getFirebaseConfig = async () => {
  let commandOutput = await shell('firebase apps:list')
  const apps = commandOutput.split('\n').filter(line => line.includes('WEB'))
  let appId
  if (apps.length === 0) {
    commandOutput = await shell('firebase apps:create WEB "Client"')
    /*
🎉🎉🎉 Your Firebase WEB App is ready! 🎉🎉🎉

App information:
  - App ID: 1:680626401476:web:16567d572e3a47a4bfd991
  - Display name: My Web App

You can run this command to print out your new app's Google Services config:
firebase apps:sdkconfig WEB 1:680626401476:web:16567d572e3a47a4bfd991
    */
    console.log("creating firebase web app")
    const comps = commandOutput.trim().split(' ')
    appId = comps[comps.length-1]
  } else {
    for (const app of apps) {
      const comps = app.split('│')
      const name = comps[1].trim()
      const id = comps[2].trim()
      console.log("firebase web app exists: ", name)
      console.log({name, id})
      appId = id
      break
    }
  }
  const config = await shell('firebase apps:sdkconfig WEB ' + appId)
  const start = config.indexOf('{')
  const end = config.lastIndexOf('}') + 1
  const json = config.substring(start, end)
  await fss.writeFile('./firebaseConfig.json', json + '\n', 'utf-8')
  console.log('wrote firebaseConfig.json')
}

module.exports = { getFirebaseConfig }
