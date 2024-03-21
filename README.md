This project enables you to experiment with an OpenAI [GPT](https://chat.openai.com/gpts) that can act as an agent on your desktop computer.
The benefit of this approach compared to other agent frameworks is that OpenAI pays for the tokens and you don't have to pay for the [expensive GPT-4 API](https://openai.com/pricing).

Using GPT-4 with tools has many pitfalls and failures, which few people are aware of due to limited access to testing it on realistic use cases. The purpose of this project is to enable such testing. All you need is a paid OpenAI account which is $20/mo.

The GPT is equipped with the following tools:
1. Ability to use the terminal and run shell commands
2. Ability to run apple script on MacOS to automate applications such as Mail, Calendar, and others
3. Ability to query the chat.db on MacOS for messages
4. Ability to write to files
5. Ability to automate a web browser shared with the user
6. Ability to search the web and individual web pages using the web browser shared with the user
7. Ability to save, search, and delete task notes to optimize tasks
8. Ability to get information about the user including name, home directory, geo location, time zone, host and OS information
9. Ability to evaluate Javascript code in node.js

And, of course, since you have the source code you can add or modify tools yourself.

**For security reasons you must run your own personal server for this GPT.**

To avoid costs, the server will be deployed using google cloud run and it will route calls from the GPT to the client running on your machine via google cloud Firestore. This setup avoids a dedicated cloud cpu that you'd have to pay for.

A unique API key will be generated for use by the GPT and a copy of it will be used by your server and client. Do not share it with anybody else.

Note: this implies you must trust both OpenAI and Google Cloud to protect the security of your server and client and the privacy of information that you share with the GPT. Given the massive number of users they both serve you presumably can.

You must first create a firebase project using the Google firebase console

#### **Create a New Firebase Project:**

1.  **Go to the Firebase Console:** Open your web browser and navigate to the [Firebase Console](https://console.firebase.google.com/). You'll need to log in with your Google account if you haven't already.
    
2.  **Add a Project:** Click on the “Add project” button to start the process of creating a new project.
    
3.  **Project Details:** Enter a name for your project in the designated field. This name is how you'll identify your project in the Firebase console.
    
4.  **Google Analytics (Optional):** Disable Google Analytics for your project.
    
5.  **Create Project:** After configuring your project's settings, click on the “Create project” button. Firebase will take a few moments to prepare your project.
    
6.  **Enable the Blaze pay as you go billing plan:** In order to deploy your server to cloud run, you'll need to enable pay as you go billing. This does not mean you will actually incur any costs. You can tap on the "Spark Plan" button on the getting started page to do this. Or tap the gear button on the sidebar and select "Usage and billing", and then select the "Details and settings" tab. You can set a budget alert to ensure you do not incur charges.

#### **Add Firebase Authentication to Your Project:**
1. In the left-hand menu, click on "Authentication" to open the Authentication section.
2. Tap the "Get Started" Button
3. Do not enable any sign-in providers as the GPT client will use custom authentication with the API key.

#### **Add Firestore to Your Project:**

1.  **Navigate to Firestore Database:** Once your project dashboard is ready, look for the “Firestore Database” option in the left-hand menu and click on it.
    
2.  **Create Database:** Click on the “Create database” button to start setting up Firestore for your project.
    
3.  **Choose Database Mode:** You'll be prompted to select a mode for your Firestore Database. You can choose between “Production mode” and “Test mode”. Choose Production.
    
4.  **Select a Location:** Choose a location for your Firestore Database. This determines where your data is stored and can affect latency for your users, so pick a location that is close to you as possible. If undecided, choose us-central.
    
5.  **Finalize:** Click on “Done” to finalize the creation of your Firestore database. It might take a few moments for the database to be fully set up.

**Install Node.js if you don't have it already:**

Both the GPT server and GPT client use Node.js

*   Visit the official Node.js website at [https://nodejs.org/](https://nodejs.org/).
*   You will see two versions available for download: LTS (Long Term Support) and Current. The LTS version is recommended for most users as it is more stable. Click on the LTS version to download the installer.

Install the Google Cloud CLI (also known as the `gcloud` command-line tool) if you haven't already

[Follow the instructions here](https://cloud.google.com/sdk/docs/install)

#### **Build and run your server**

Node.js and the firebase and gcloud cli tools will be used to build and deploy your server to cloud run and configure your firebase project and firestore database for use by this GPT.
Additionally, it will create the following files containing information you will need to provide to OpenAI in the OpenAI GPT Editor of your GPT in the output folder `Build`

1. `apiKey.txt` - The api key for the GPT authentication
2. `Instructions-Windows.txt` - Instructions for the system prompt of your GPT on Windows.
3. `Instructions-MacOS.txt` - Instructions for the system prompt of your GPT on Mac.
4. `Schema-Windows.json` - Schema for the actions provided by your GPT on Windows.
5. `Schema-MacOS.json` - Schema for the actions provided by your GPT on a Mac.
6. `serverURL.txt` - the url of your deployed server

To build and deploy your server follow these steps:
1.  Open a terminal and navigate to the `Cloud` folder.
2.  Run ```npm install -g firebase-tools``` to install the firebase cli, if you haven't already.
2.  Run ```firebase login``` to log in to the firebase cli, if you haven't already
3.  Run ```firebase use <project>``` to select the project you created (you can use `firebase projects:list` to see all your projects)
3.  Run the following command:
```
   node build.js
```
This command will
1. Build the project with `npm`
1. Set up the firebase project
2. Configure security for your firestore database
3. Create a unique api key and associated firebase account
4. Enable required google deployment services on your project: artifact registry, cloud build, cloud run
5. Deploy the server using google cloud run
6. Generate the output files

Next you must create your GPT using OpenAI's [GPT editor](https://chat.openai.com/gpts/editor)
Select the Configure tab and perform the following steps:
1. Copy the contents of `Instructions-Windows.txt`  or `Instructions-MacOS.txt` into the Instructions field that says "What does this GPT do etc"
2. Turn off the Web Browsing capability as the GPT has its own web browser
3. Tap the Create new action button
4. Select the Authentication drop-down and choose Authentication type "API Key" and Auth Type "Bearer" and copy and paste contents of `apiKey.txt` into the API Key field, then Save.
5. Copy and paste the content of `Schema-Windows.json` or `Schema-MacOS.json` into the text area where it says "Enter you OpenAPI schema here"
6. Press the back button, then scroll down to the bottom of the Configure tab and open "Additional Settings" and disable "Use conversation data in your GPT to improve our models"
7. Create and save for yourself only (DO NOT SHARE OR MAKE THIS GPT PUBLIC AS IT HAS ACCESS TO YOUR COMPUTER)

Now you can run the client
1. Navigate to the `Assistant` folder
2. Create a text file called 'gptURL.txt' in this folder and store the url of your GPT in it (it will be something like 'https://chat.openai.com/g/g-btPQRDlHM-name')
3. Run the following command to build the client
```
npm install
```
4. Run the following command to run the client
```
npm start
```

The first time you run it you will land on the OpenAI sign in page. Once you sign in you will redirected to your GPT.

NOTE: be sure to keep the following generated files private:

1. `{Cloud,Build,Assistant}/apiKey.txt`
2. `Cloud/ServiceAccount.json`
3. `{Cloud,Assistant}/firebaseConfig.json`

Once your server is deployed, you can modify the schema in your GPT and make changes to the Assistant app without redeploying the server.
