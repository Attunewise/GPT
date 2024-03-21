const fs = require('fs').promises;
const { shell } = require('./Shell.js')

const createServiceAccount = async projectId => {

  const SERVICE_ACCOUNT_NAME = "ServiceAccount";
  const DISPLAY_NAME = "ServiceAccount";
  const ROLE = "roles/firebase.admin";
  const KEY_PATH = "./ServiceAccount.json";

  await shell("gcloud config set project "+projectId)
  
  // Check if the key file already exists
  try {
    const content = await fs.readFile(KEY_PATH, 'utf-8')
    if (content) {
      console.log(`Service Account key for '${projectId}' already exists at '${KEY_PATH}'`);
      return; // Exit if file exists
    }
  } catch (error) {
    // File does not exist, proceed
  }
  
  const SERVICE_ACCOUNT_EMAIL = `${SERVICE_ACCOUNT_NAME}@${projectId}.iam.gserviceaccount.com`;
  
  // Check if the service account already exists
  const serviceAccountsList = await shell(`gcloud iam service-accounts list --project="${projectId}" --filter="email=${SERVICE_ACCOUNT_EMAIL}" --format="value(email)"`);
  console.log("service account list", serviceAccountsList)
  if (serviceAccountsList.includes(SERVICE_ACCOUNT_EMAIL)) {
    console.log(`Service account ${SERVICE_ACCOUNT_EMAIL} already exists.`);
  } else {
    // Create a service account
    console.log("Creating service account")
    await shell(`gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" --display-name="${DISPLAY_NAME}" --project="${projectId}"`);
  }
  
  // Check if the service account already has the firebase/admin role
  const hasRole = await shell(`gcloud projects get-iam-policy "${projectId}" --flatten="bindings[].members" --format="table(bindings.role,bindings.members)" --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL} AND bindings.role:${ROLE}"`);
  if (hasRole.includes(ROLE)) {
    console.log(`Service account ${SERVICE_ACCOUNT_EMAIL} already has the ${ROLE} role.`);
  } else {
    // Assign roles to the service account
    console.log("Assigning firebase/admin role to service account")
    await shell(`gcloud projects add-iam-policy-binding "${projectId}" --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" --role="${ROLE}"`);
  }
  // Generate a new private key for the service account
  console.log("Creating service account key")
  await shell(`gcloud iam service-accounts keys create "${KEY_PATH}" --iam-account="${SERVICE_ACCOUNT_EMAIL}" --project="${projectId}"`);
  console.log(`Service account key for project '${projectId}' created at '${KEY_PATH}'`);
}

module.exports = { createServiceAccount }
