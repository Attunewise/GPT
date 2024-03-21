

getGeoLocation = async () => {
  const request = require('request')
  return new Promise(resolve => {
    request('https://ipinfo.io/json', (error, response, body) => {
      if (!error && response.statusCode == 200) {
        const locationData = JSON.parse(body);
        resolve(locationData)
      } else {
        console.error("Error getting location:", error);
      }
    })
  })
}

module.exports = { getGeoLocation }
  
