/**
 * Google Drive service — OAuth as the user (saivikas9440@gmail.com).
 * Every driver gets their own subfolder: PVL-Driver-Docs/Driver-<id>-<name>/
 * Uses token.json created by scripts/google_drive_auth.js
 */
const { google } = require('googleapis');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

const PARENT_FOLDER_NAME = 'PVL-Driver-Docs';
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

let cachedAuth = null;
let cachedParentId = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;
  const cid = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const csc = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!cid || !csc) throw new Error('OAuth credentials missing in .env');
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json missing — run: node scripts/google_drive_auth.js');
  }
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const oAuth2Client = new google.auth.OAuth2(cid, csc);
  oAuth2Client.setCredentials(tokens);
  cachedAuth = oAuth2Client;
  return cachedAuth;
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

async function getParentFolderId() {
  if (cachedParentId) return cachedParentId;
  if (process.env.GOOGLE_DRIVE_DRIVER_DOCS_FOLDER_ID) {
    cachedParentId = process.env.GOOGLE_DRIVE_DRIVER_DOCS_FOLDER_ID;
    return cachedParentId;
  }
  const drive = getDrive();
  const res = await drive.files.list({
    q: `name = '${PARENT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)',
  });
  if (!res.data.files || !res.data.files.length) {
    throw new Error(`Parent folder '${PARENT_FOLDER_NAME}' not found in Drive`);
  }
  cachedParentId = res.data.files[0].id;
  return cachedParentId;
}

function sanitize(s) {
  return String(s || '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

async function getOrCreateDriverFolder(driverId, driverName) {
  const drive = getDrive();
  const parentId = await getParentFolderId();
  const idPart = String(driverId || 'unknown');
  const namePart = sanitize(driverName);
  const folderName = namePart ? `Driver-${idPart}-${namePart}` : `Driver-${idPart}`;

  const res = await drive.files.list({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id,name,webViewLink)',
  });
  if (res.data.files && res.data.files.length) {
    const f = res.data.files[0];
    return { id: f.id, name: f.name, webViewLink: f.webViewLink, created: false };
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id,name,webViewLink',
  });
  return { id: createRes.data.id, name: createRes.data.name, webViewLink: createRes.data.webViewLink, created: true };
}

async function uploadBuffer(buffer, filename, mimeType, { driverId, driverName } = {}) {
  const drive = getDrive();
  const folder = await getOrCreateDriverFolder(driverId || 0, driverName);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folder.id],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: Readable.from(buffer),
    },
    fields: 'id, name, mimeType, size, webViewLink, createdTime',
  });

  return {
    fileId: res.data.id,
    name: res.data.name,
    mimeType: res.data.mimeType,
    size: Number(res.data.size || buffer.length),
    webViewLink: res.data.webViewLink,
    folderId: folder.id,
    folderName: folder.name,
    folderLink: folder.webViewLink,
    folderCreated: folder.created,
    createdTime: res.data.createdTime,
  };
}

async function getFileStream(fileId) {
  const drive = getDrive();
  const meta = await drive.files.get({ fileId, fields: 'id,name,mimeType,size' });
  const file = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return {
    stream: file.data,
    mimeType: meta.data.mimeType || 'application/octet-stream',
    size: Number(meta.data.size || 0),
    name: meta.data.name,
  };
}

async function deleteFile(fileId) {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

module.exports = {
  getAuth, getDrive, getParentFolderId, getOrCreateDriverFolder,
  uploadBuffer, getFileStream, deleteFile,
};
