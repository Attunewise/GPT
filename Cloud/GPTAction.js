const { getAdmin } = require('./GetAdmin.js')
const fs = require('fs')

const apiKey = fs.readFileSync('apiKey.txt', 'utf-8').trim()

const gptAction = async (token, action, params, req, res) => {
  if (token !== apiKey) {
    console.error('invalid api key', token)
    return res.status(401).send()
  }
  const uid = token
  const admin = getAdmin()
  const db = admin.firestore()
  const c = db.collection('UserChannel').doc(uid).collection('toolCalls')
  const ref = c.doc()
  await ref.set({
    ts: Date.now(),
    name: action,
    arguments: params
  })
  let closed = false
  let result = await new Promise((resolve, reject) => {
    const unsubscribe = ref.onSnapshot(snap => {
      const data = snap.data()
      //console.log("GPTAction data: ", data)
      const { content } = data
      if (content !== undefined) {
        unsubscribe()
        resolve(content)
      }
    })
    res.on('close', () => {
      //console.log("GPTAction close")
      closed = true
      try {
        unsubscribe()
      } catch (ignored) {
      }
    })
  })
  //console.log("GPTAction: ", closed, result)
  if (!closed) {
    try {
      result = JSON.parse(result)
    } catch (ignored) {
      result = JSON.stringify(result)
    }
    return res.status(200).send(result)
  }
}

module.exports = { gptAction }
