const { getAdmin } = require('./GetAdmin.js')
const crypto = require('crypto');
const fs = require('fs')
const fss = require('fs/promises')

const generateId = (length = 40) => {
  return crypto.randomBytes(length).toString('hex');
}

const createApiKey = async () => {
  const filename = './apiKey.txt'
  let uid
  if (!fs.existsSync(filename)) {
    uid = generateId()
    await fss.writeFile(filename, uid, 'utf-8')
    console.log("Created api key.")
  } else {
    uid = await fss.readFile(filename, 'utf-8')
    console.log("api key already exists.")
  }
  const admin = getAdmin()
  let user
  try {
    user = await admin.auth().getUser(uid)
    console.log("user already exists: ", user.uid)
  } catch (err) {
    admin.auth().createUser({
      uid,
      displayName: "GPT",
    })
  }
}

module.exports = { createApiKey }
