const { axios } = require('./Axios.js')

getGeoLocation = async () => {
  const response = await axios.get('https://ipinfo.io/json')
  return response.data
}

module.exports = { getGeoLocation }
  
