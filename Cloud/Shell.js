const { exec, spawn } = require('child_process');
const readline = require('readline')
const fss = require('fs/promises')
const path = require('path')
const os = require('os')
const crypto = require('crypto')

const tempFile = (opts) => new Promise((resolve, reject) => {
  opts = opts || {}
  const { suffix } = opts
  const uniqueId = crypto.randomBytes(16).toString('hex')
  const tempFilename = path.join(os.tmpdir(), `tempfile_${uniqueId}.${suffix}`);
  resolve({
    filePath: tempFilename,
    cleanup: async () => {
      try {
        await fss.unlink(tempFilename)
      } catch (err) {
        console.error(err)
      }
    }
  })
})

let _loginShell
let _loginShellType
const getLoginShell = async () => {
  if (_loginShell !== undefined) {
    return _loginShell
  }
  const prefix = await getLoginShellPrefix() 
  return _loginShell = prefix + '; '+ _loginShellType + " -c"
}

const log = info => {
}

const logError = err => {
}

const getLoginShellPrefix = async () => {
  if (os.platform() === 'win32') {
    return _loginShellType = "cmd.exe"
  }
  const homeDirectory = require('os').homedir();
  const bashrcPath = path.join(homeDirectory, '.bash_profile');
  const zshrcPath = path.join(homeDirectory, '.zshrc');
  // Check for .bashrc
  let bashExists = false
  let zshExists = false
  let cmd
  try {
    await fss.access(bashrcPath, fs.constants.F_OK)
    bashExists = true
  } catch (err) {
    logError(err)    
  }
  try {
    await fss.access(zshrcPath, fs.constants.F_OK)
    zshExists = true
  } catch(err) {
    logError(err)
  }
  
  if (bashExists && zshExists) {
    const stat1 = await fss.stat(bashrcPath)
    const lastModified1 = Date.parse(stat1.mtime)
    const fileSize1 = stat1.size
    log({lastModified1, fileSize1})
    const stat2 = await fss.stat(zshrcPath)
    const lastModified2 = Date.parse(stat2.mtime)
    const fileSize2 = stat2.size
    log({lastModified2, fileSize2})
    if (lastModified2 > lastModified1) {
      bashExists = false
    } else {
      zshExists = false
    }
  }
  log({zshExists, bashExists})
  if (zshExists) {
    _loginShellType = 'zsh'
    cmd = `source "${zshrcPath}"`
  } else {
    _loginShellType = 'bash'
    cmd = `source "${bashrcPath}"`
  }
  log("LOGIN SHELL", cmd)
  return cmd
}

const getLoginShellType = async () => {
  await getLoginShell()
  return _loginShellType
}

let theProcess = process

const run = async (script, trace, traceErr) => {
  const suffix = (os.platform() === 'win32') ? 'bat' : 'sh'
  const { filePath, cleanup } = await tempFile({ suffix });
  const shell = await getLoginShellType()
  console.log(script)
  if (shell === 'cmd.exe') script = "@echo off\r\n" + script
  await fss.writeFile(filePath, script);
  await fss.chmod(filePath, '755');
  const args = [filePath]
  if (shell === 'cmd.exe') args.unshift('/c')
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const process = spawn(shell, args)
    process.on('error', reject)
    process.stdout.on('data', (data) => {
      data = data.toString()      
      if (trace) {
        theProcess.stdout.write(data)
      }
      stdout += data
    })
    process.stderr.on('data', (data) => {
      data = data.toString().replace(filePath + ":", '')
      if (traceErr) {
        theProcess.stderr.write(data)
      }
      stderr += data
    })
    process.on('close', (code) => {
      cleanup()
      if (code) {
        reject(stderr)
      } else {
	resolve(stdout.trim())
      }
    })
  })
}

module.exports = { shell: run }
