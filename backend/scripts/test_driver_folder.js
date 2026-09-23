const { google } = require("googleapis");
const fs = require("fs");

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_DRIVER_DOCS_FOLDER_ID;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("OAuth credentials are missing.");
  process.exit(1);
}

if (!PARENT_FOLDER_ID) {
  console.error("GOOGLE_DRIVE_DRIVER_DOCS_FOLDER_ID is missing.");
  process.exit(1);
}

if (!fs.existsSync("./token.json")) {
  console.error("token.json not found.");
  process.exit(1);
}

const tokens = JSON.parse(
  fs.readFileSync("./token.json", "utf8")
);

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET
);

oauth2Client.setCredentials(tokens);

const drive = google.drive({
  version: "v3",
  auth: oauth2Client
});

async function main() {
  const response = await drive.files.create({
    requestBody: {
      name: "Driver-TEST-001",
      mimeType: "application/vnd.google-apps.folder",
      parents: [PARENT_FOLDER_ID]
    },
    fields: "id,name,parents,webViewLink"
  });

  console.log("");
  console.log("==========================================");
  console.log(" DRIVER TEST FOLDER CREATED");
  console.log("==========================================");
  console.log("");
  console.log("Folder Name:");
  console.log(response.data.name);
  console.log("");
  console.log("Folder ID:");
  console.log(response.data.id);
  console.log("");
  console.log("Drive Link:");
  console.log(response.data.webViewLink || "Not available");
  console.log("");
}

main().catch(error => {
  console.error("");
  console.error("GOOGLE DRIVE ERROR");
  console.error(error.response?.data || error.message);
});
