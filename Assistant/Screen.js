const { exec } = require('child_process');
const os = require('os');

function getScreenDimensionsImpl(callback, err) {
  const platform = os.platform()

  if (platform === 'darwin') {
    // macOS
    exec("system_profiler SPDisplaysDataType | grep Resolution", (error, stdout) => {
      const match = stdout.match(/Resolution: (\d+) x (\d+)/)
      if (match) {
        callback({ width: parseInt(match[1], 10), height: parseInt(match[2], 10) })
      }
    })
  } else if (platform === 'win32') {
    // Windows
    exec("wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution", (error, stdout) => {
      const lines = stdout.trim().split('\n').filter(line => line.trim() !== '')
      const dimensions = lines[lines.length - 1].trim().split(/\s+/)
      if (dimensions.length === 2) {
        callback({ width: parseInt(dimensions[0], 10), height: parseInt(dimensions[1], 10) })
      }
    })
  } else if (platform === 'linux') {
    // Linux
    exec("xdpyinfo | grep dimensions", (error, stdout) => {
      const match = stdout.match(/dimensions:\s+(\d+)x(\d+)/)
      if (match) {
        return callback({ width: parseInt(match[1], 10), height: parseInt(match[2], 10) })
      } 
    })
  } 
}


const getScreenDimensions = async () => {
  return new Promise((resolve, reject) => {
    getScreenDimensionsImpl(resolve)
  })
}

module.exports = { getScreenDimensions }
