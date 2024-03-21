const { drainStream } = require('./Drain.js');

class AxiosError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

const axios1 = (op, ...args) => {
  const doit = async () => {
    try {
      const axios = require('axios');
      if (op) {
        //console.log(`axios[${op}]`, args);
        return await axios[op](...args);
      } else {
        return await axios(...args);
      }
    } catch (err) {
      let status 
      let data
      let message = err.message
      if (err.response) {
        status = err.response.status
        data = err.response.data;
        if (!data || data.request) {
          data = await drainStream(err.response);
          if (data.request) {
            data = data.data
          }
        }
        try {
          err.message += '\n' + data
        } catch (ignored) {
          console.error(ignored.message)
        }
        throw new AxiosError(message, status, data)
      }
      console.error(err.message);
      throw err
    }
  }
  return doit();
}

const axios = (...args) => axios1(null, ...args);

for (const op of ['get', 'set', 'head', 'post', 'delete', 'put']) {
  axios[op] = (...args) => axios1(op, ...args)
}

module.exports = { axios }
