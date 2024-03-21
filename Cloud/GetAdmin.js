const admin = require('firebase-admin')

const firebaseConfig = require('./firebaseConfig.json')

const FIREBASE_PROJECT = firebaseConfig.projectId
const FIREBASE_STORAGE_BUCKET = firebaseConfig.storageBucket
let init      

const getAdmin = () => {
  if (!init) {
    const serviceAccount = require(`./ServiceAccount.json`)
    const firebaseInit = {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: FIREBASE_STORAGE_BUCKET
    }
    const app = admin.initializeApp(firebaseInit)
    const db = admin.firestore()
    db.settings({ ignoreUndefinedProperties: true })
    init = true
  }
  return admin
}

module.exports = { getAdmin }
  
