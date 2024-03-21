const { shell } = require('./Shell.js')

const getServerURL = async (serviceName, region, projectId) => {
  return (await shell(`gcloud run services describe ${serviceName} --platform managed --region ${region} --project ${projectId} --format="value(status.url)"`)).trim()
}

module.exports = { getServerURL }
