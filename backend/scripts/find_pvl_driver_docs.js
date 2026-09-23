const { google } = require("googleapis");
const fs = require("fs");

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("OAuth credentials are missing.");
  process.exit(1);
}

if (!fs.existsSync("./token.json")) {
  console.error("token.json not found.");
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync("./token.json", "utf8"));

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
  const response = await drive.files.list({
    q: "name = 'PVL-Driver-Docs' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id,name,mimeType,parents,webViewLink)",
    spaces: "drive"
  });

  if (!response.data.files || response.data.files.length === 0) {
    console.log("");
    console.log("PVL-Driver-Docs folder was NOT found.");
    console.log("");
    return;
  }

  console.log("");
  console.log("==========================================");
  console.log(" PVL DRIVER DOCS FOLDER FOUND");
  console.log("==========================================");

  for (const folder of response.data.files) {
    console.log("");
    console.log("Folder Name:");
    console.log(folder.name);
    console.log("");
    console.log("Folder ID:");
    console.log(folder.id);
    console.log("");
    console.log("Drive Link:");
    console.log(folder.webViewLink || "Not available");
    console.log("");
  }
}

main().catch(error => {
  console.error("");
  console.error("GOOGLE DRIVE ERROR");
  console.error(error.response?.data || error.message);
});
