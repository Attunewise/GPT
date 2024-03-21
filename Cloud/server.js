const { getAdmin } = require('./GetAdmin.js')
const { gptAction } = require('./GPTAction.js')
const fss = require('fs/promises')
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/gpt/:action', async (req, rsp) => {
  const token = req.get('authorization').split(' ')[1]
  const action = req.params.action
  await gptAction(token, action, req.body, req, rsp)
})

app.post('/gptLogin', async (req, rsp) => {
  const { apiKey } = req.body
  const uid = (await fss.readFile('./apiKey.txt', 'utf-8')).trim()
  if (uid === apiKey) {
    const admin = getAdmin()
    const customToken = await admin.auth().createCustomToken(uid)
    return rsp.status(200).send({ customToken })
  }
  return rsp.status(401).send()
})

const port = parseInt(process.env.PORT) || 8080
app.listen(port, () => {
  console.log(`server.js: listening on port ${port}`);
});
