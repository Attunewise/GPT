const drainStream = stream => {
  if (!stream.on) {
    return Promise.resolve(stream)
  }
  return new Promise(resolve => {
    let output = ''
    stream.on('data', data => {
      console.log("data=>", data)
      output += data
    })
    stream.on('end', () => {
      resolve(output)
    })
  })
}

module.exports = {  drainStream }
