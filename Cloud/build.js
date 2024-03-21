const fs = require('fs')
const fss = require('fs/promises')
const path = require('path')
const os = require('os')
const { shell } = require('./Shell.js')
const { getFirebaseConfig } = require('./getFirebaseConfig.js')
const { createServiceAccount } = require('./createServiceAccount.js')
const { createApiKey } = require('./createApiKey.js')
const { getServerURL } = require('./getServerURL.js')
const { getSchema } = require('./Schema.js')

const fileExists = async (filePath) => {
  try {
    await fss.access(filePath, fs.constants.F_OK)
    return true
  } catch (error) {
    return false;
  }
}

const mkdir = async pathname => {
  if (!await fileExists(pathname)) {
    await fss.mkdir(pathname, { recursive: true })
  }
}

const copyFile = async (source, destination) => {
  return await fss.copyFile(source, path.join(destination, path.basename(source)))
}


const main = async () => {
  let firebaseTools
  try {
    firebaseTools = await shell('firebase --version', true)
  } catch (err) {
  }
  if (!firebaseTools) {
    await shell("npm install -g firebase-tools", true)
  }
  await shell("npm install", true)
  let loggedIn
  try {
    loggedIn = await shell('firebase login:list', true)
    console.log('loggedIn', loggedIn)
  } catch (err) {
    console.error(err)
  }
  if (!loggedIn) {
    await shell('firebase login', true)
  }
  let projectId
  try {
    projectId = await shell('firebase use', true)
    console.log("Project", projectId)
  } catch (err) {
    console.log("firebase project not set")
    process.exit(1)
  }
  await getFirebaseConfig()
  await shell('firebase deploy --only firestore:rules')
  output = await shell('gcloud auth list')
  if (!output) {
    await shell('gcloud auth login')
  }
  await createServiceAccount(projectId)
  await createApiKey()
  const enableService = async service => {
    console.log(`Enabling ${service} on project `+ projectId)
    console.log("Please wait...")
    let output = await shell(`gcloud services list --enabled --project=${projectId} --filter=${service}`)   
    if (!output) {
      await shell(`gcloud services enable ${service} --project=${projectId}`)
      console.log(`Enabled ${service} on project `+ projectId)
    }
  }
  await enableService('artifactregistry.googleapis.com')
  await enableService('run.googleapis.com')
  await enableService('cloudbuild.googleapis.com')
  const dest = `${__dirname}/../Build`
  await mkdir(dest)
  const instructions = await fss.readFile('./Instructions.txt', 'utf-8')
  const getInstructions = platform => {
    return instructions.replace('$platform$', platform)
  }
  const windowsInstructions = getInstructions("Windows")
  const macInstructions = getInstructions("Mac")
  await fss.writeFile(path.join(dest, 'Instructions-Windows.txt'), windowsInstructions, 'utf-8')
  await fss.writeFile(path.join(dest, 'Instructions-MacOS.txt'), macInstructions, 'utf-8')
  console.log("Deploying...")
  const serviceName = 'assistant'
  const region = 'us-central1'
  await shell(`gcloud run deploy ${serviceName} --quiet --source . --region ${region} --allow-unauthenticated`, true, true)
  const apiKeyFile = `${__dirname}/apiKey.txt`
  await copyFile(apiKeyFile, dest)
  const serverURL = await getServerURL(serviceName, region, projectId)
  console.log("Server deployed to ", serverURL)
  const schemaWindows = getSchema('win32', serverURL)
  const schemaMac = getSchema('darwin', serverURL)
  console.log("Copying API key, Instructions, and Schemas to Build folder")
  await fss.writeFile(path.join(dest, 'Schema-Windows.json'), JSON.stringify(schemaWindows, null, ' '), 'utf-8')
  await fss.writeFile(path.join(dest, 'Schema-MacOS.json'), JSON.stringify(schemaMac, null, ' '), 'utf-8')
  const serverURLFile = path.join(dest, 'serverURL.txt')
  const firebaseConfigFile = path.join(__dirname, 'firebaseConfig.json')
  await fss.writeFile(serverURLFile, serverURL, 'utf-8')
  console.log("Copying API key, server url, and firebase configuration to Assistant")
  await copyFile(apiKeyFile, `${__dirname}/../Assistant`)
  await copyFile(serverURLFile, `${__dirname}/../Assistant`)
  await copyFile(firebaseConfigFile, `${__dirname}/../Assistant`)
  process.exit(0)	
}

main().catch(err => {
  console.error(err)
})


