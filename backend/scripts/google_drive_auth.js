const { google } = require("googleapis");
const http = require("http");
const { exec } = require("child_process");
const fs = require("fs");

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("OAuth credentials are missing.");
  process.exit(1);
}

const REDIRECT_URI = "http://localhost:5005/oauth/callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  "https://www.googleapis.com/auth/drive"
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES
});

console.log("");
console.log("==========================================");
console.log(" PVL COMMERCE GOOGLE DRIVE AUTHORIZATION");
console.log("==========================================");
console.log("");
console.log("Opening Google authorization...");
console.log("");
console.log(authUrl);
console.log("");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:5005");

    if (url.pathname !== "/oauth/callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400);
      res.end("Authorization code missing.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token returned. Make sure prompt=consent is being used."
      );
    }

    oauth2Client.setCredentials(tokens);

    fs.writeFileSync(
      "./token.json",
      JSON.stringify(tokens, null, 2),
      "utf8"
    );

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client
    });

    const about = await drive.about.get({
      fields: "user(displayName,emailAddress),storageQuota"
    });

    res.writeHead(200, {
      "Content-Type": "text/html"
    });

    res.end(`
      <html>
        <body>
          <h2>PVL Commerce Google Drive Authentication Successful</h2>
          <p>You can close this browser tab and return to PowerShell.</p>
        </body>
      </html>
    `);

    console.log("");
    console.log("==========================================");
    console.log(" GOOGLE DRIVE AUTHENTICATION SUCCESS");
    console.log("==========================================");
    console.log("");
    console.log("Google Account:");
    console.log(about.data.user.emailAddress);
    console.log("");
    console.log("Drive Connection: SUCCESS");
    console.log("");
    console.log("Refresh token saved to:");
    console.log("./token.json");
    console.log("");

    server.close();
  } catch (error) {
    console.error("");
    console.error("AUTHORIZATION FAILED");
    console.error(error.response?.data || error.message);

    res.writeHead(500);
    res.end("Authorization failed. Check PowerShell.");
    server.close();
  }
});

server.listen(5005, "127.0.0.1", () => {
  console.log("OAuth callback server listening on:");
  console.log("http://localhost:5005/oauth/callback");
  console.log("");
  console.log("Opening browser...");

  const command =
    process.platform === "win32"
      ? `start "" "${authUrl}"`
      : `open "${authUrl}"`;

  exec(command);
});
