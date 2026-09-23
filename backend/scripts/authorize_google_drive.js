const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { authenticate } = require("@google-cloud/local-auth");

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file"
];

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials are missing from this PowerShell session."
    );
  }

  const credentials = {
    installed: {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: ["http://localhost"]
    }
  };

  const credentialsPath = path.join(
    process.cwd(),
    "scripts",
    "pvl-drive-credentials.json"
  );

  fs.writeFileSync(
    credentialsPath,
    JSON.stringify(credentials, null, 2),
    "utf8"
  );

  console.log("");
  console.log("==========================================");
  console.log(" PVL COMMERCE - GOOGLE DRIVE AUTH");
  console.log("==========================================");
  console.log("");
  console.log("Opening Google authorization...");
  console.log("");
  console.log("IMPORTANT:");
  console.log("Sign in with the Google account that owns");
  console.log("the Drive storage for PVL driver documents.");
  console.log("");

  const auth = await authenticate({
    keyfilePath: credentialsPath,
    scopes: SCOPES
  });

  const drive = google.drive({
    version: "v3",
    auth
  });

  const response = await drive.about.get({
    fields: "user(displayName,emailAddress),storageQuota"
  });

  console.log("");
  console.log("==========================================");
  console.log(" GOOGLE DRIVE AUTHENTICATION SUCCESS");
  console.log("==========================================");
  console.log("");

  console.log("Google Account:");
  console.log(response.data.user.emailAddress);

  console.log("");
  console.log("Display Name:");
  console.log(response.data.user.displayName);

  console.log("");
  console.log("Drive Connection: SUCCESS");

  if (response.data.storageQuota) {
    const quota = response.data.storageQuota;

    console.log("");
    console.log("Drive Storage:");

    if (quota.limit) {
      console.log(
        "Total:",
        (Number(quota.limit) / 1024 / 1024 / 1024).toFixed(2),
        "GB"
      );
    }

    if (quota.usage) {
      console.log(
        "Used:",
        (Number(quota.usage) / 1024 / 1024 / 1024).toFixed(2),
        "GB"
      );
    }
  }

  console.log("");
  console.log("OAuth authorization completed successfully.");
  console.log("");
}

main().catch((error) => {
  console.log("");
  console.log("==========================================");
  console.log(" GOOGLE DRIVE AUTHENTICATION FAILED");
  console.log("==========================================");
  console.log("");
  console.error(error);
  console.log("");
  process.exit(1);
});
