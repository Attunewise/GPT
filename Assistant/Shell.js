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
  const bashrcPath = path.join(homeDirectory, '.bash_profile')
  const zshrcPath = path.join(homeDirectory, '.zshrc')
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

const run = async (script, options) => {
  options = options || {}
  const { trace, traceErr, powershell, admin, timeout } = options
  console.log(script)
  let suffix
  if (powershell) {
    suffix = 'ps1'
    if (admin) {
      script = `# Check if the script is running as an administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    # Re-launch the script with administrative rights
    Start-Process PowerShell -ArgumentList "-File \`"\$PSCommandPath\`"" -Verb RunAs
    exit
}
` + script
      
    }
  } else {
    suffix = (os.platform() === 'win32') ? 'bat' : 'sh'
  }
  const { filePath, cleanup } = await tempFile({ suffix })
  await fss.writeFile(filePath, script)
  await fss.chmod(filePath, '755')
  let shell
  let args = [filePath]
  if (powershell) {
    shell = 'PowerShell.exe'
    args = ['-ExecutionPolicy', 'Bypass', '-File', filePath]
  } else {
    shell = await getLoginShellType()
    if (shell === 'cmd.exe') args.unshift('/c')
  }
  return new Promise((resolve, reject) => {
    let output = ''
    const process = spawn(shell, args)
    process.stdout.on('data', (data) => {
      data = data.toString()      
      console.log(data)
      if (trace) {
        theProcess.stdout.write(data)
      }
      output += data
    })
    process.stderr.on('data', (data) => {
      data = data.toString().replace(filePath + ":", '')
      console.error(data)
      if (traceErr) {
        theProcess.stderr.write(data)
      }
      output += data
    })
    let timer
    let timedOut
    if (timeout) {
      timer = setTimeout(() => {
	timedOut = true
	output = "Timed out after " + (timeout / 1000) + " seconds"
	process.kill()
      }, timeout)
    }
    process.on('close', (code) => {
      cleanup()
      if (timedOut) code = -1
      resolve({ code, output })
    })
  })
}


const interactiveShell = async (commands, resolve) => {
  const { filePath, cleanup } = await tempFile({ suffix: '.sh' });
  const script = (await getLoginShellPrefix()) + '\n' + commands
  console.log(script)
  await fss.writeFile(filePath, script);
  console.log("Script file", filePath)
  await fss.chmod(filePath, '755');

  // Execute the script file
  const shell = await getLoginShellType()
  const process = spawn(shell, [filePath,"2>&1"])
  const rl1 = readline.createInterface({
    input: process.stdout
  });
  const rl2 = readline.createInterface({
    input: process.stderr
  });

  let chars = 0
  let lines = []
  let allOutput = ''
  let listener;
  let code
  let toolCallId
  let subject = new Subject()
  let outputSubject = new Subject()
  let busy = false

  const fireOutput = () => {
    outputSubject.next({code, output: allOutput})
  }

  const flush = () => {
    if (listener && (code !== undefined || chars > 0)) {
      let obj = listener;
      listener = null;
      const output = lines.map(x => x.line).join('\n')
      obj.resolve({ toolCallId, code, output});
    }
  };

  const notify = () => {
    try {
      subject.next({
        busy,
        toolCallId,
        lines,
        code,
        chars,
      })
    } catch (err) {
      console.error(err)
    }
  }

  process.on('close', exitCode => {
    code = exitCode;
    notify()
    flush();
    fireOutput()
    //cleanup(); // Clean up the temporary file
  });

  const cb = (type, line) => {
    line = line.replaceAll(filePath + ':', '')
    const event = {
      type,
      line
    }
    allOutput += line + '\n'
    lines.push(event)
    notify()
    chars += line.length;
    setTimeout(flush, 100);
  }

  const cb1 = line => {
    console.log('out', line)
    cb('out', line)
  }

  const cb2 = line => {
    console.log('err', line)
    cb('err', line)
  }

  rl1.on('line', cb1);
  rl2.on('line', cb2);

  return {
    write: (data, id)  => {
      toolCallId = id
      process.stdin.write(data);
    },
    awaitOutput: (timeout) => {
      return new Promise((resolve, reject) => {
        let timedOut
        let timer
        if (timeout) {
          timer = setTimeout(() => {
            timedOut = true
            resolve({code: -1, output: "Timed out"})
          }, timeout)
        }
        outputSubject.subscribe((event) => {
          if (!timedOut) {
            if (timer) clearTimeout(timer)
            resolve(event)
          }
        })
      })
    },
    getOutput: () => {
      busy = true
      return new Promise((resolve, reject) => {
        listener = {
          resolve: returnValue => {
            busy = false
            resolve(returnValue)
          },
          reject: err => {
            busy = false
            resolve(err)
          }
        };
        flush();
      });
    },
    subscribe: (id, cb) => {
      toolCallId = id
      const sub = subject.subscribe(cb)
      return {
        unsubscribe: () => {
          sub.unsubscribe()
          try {
            process.kill()
          } catch (err) {
            console.error(err)
          }
        }
      }
    }
  };
};


module.exports = { shell: run, getLoginShell, tempFile }
