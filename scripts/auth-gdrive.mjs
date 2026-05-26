#!/usr/bin/env node
// One-time Google Drive OAuth authorization for backups.
//
// Usage:
//   GDRIVE_OAUTH_CLIENT_ID=... GDRIVE_OAUTH_CLIENT_SECRET=... \
//     node scripts/auth-gdrive.mjs
//
// Or put the two values into .env.local and run `pnpm auth-gdrive`.
//
// Outputs a refresh_token that you paste into Coolify ENV as GDRIVE_REFRESH_TOKEN.

import http from 'node:http';
import { google } from 'googleapis';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Minimal .env.local loader (no extra dependency)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const CLIENT_ID = process.env.GDRIVE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    '\nGDRIVE_OAUTH_CLIENT_ID and GDRIVE_OAUTH_CLIENT_SECRET must be set\n' +
      '(either in environment or .env.local).\n\n' +
      'Where to get them:\n' +
      '  1. https://console.cloud.google.com/apis/credentials\n' +
      '  2. + Create credentials → OAuth client ID → Application type: Desktop app\n' +
      '  3. Authorized redirect URIs: http://localhost:8765/callback\n' +
      '  4. Copy client_id + client_secret\n',
  );
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const url = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces refresh_token even on re-auth
  scope: [SCOPE],
});

console.log('\n→ Opening browser for Google authorization…');
console.log('  If it does not open automatically, paste this URL manually:\n');
console.log('  ' + url + '\n');

const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
exec(`${opener} "${url}"`, () => {});

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (u.pathname !== '/callback') {
    res.writeHead(404).end('not found');
    return;
  }
  const code = u.searchParams.get('code');
  const error = u.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Authorization failed</h1><pre>${error}</pre>`);
    console.error('\n✗ Authorization failed:', error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400).end('missing code');
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><body style="font-family: system-ui; padding: 2em">
      <h1>✓ Authorized</h1>
      <p>You can close this tab. Refresh token has been printed in the terminal.</p>
      </body></html>
    `);

    console.log('\n✓ Authorization complete.\n');
    if (!tokens.refresh_token) {
      console.error(
        '⚠ No refresh_token returned. This usually means the same Google account\n' +
          '  was previously authorized and Google reused old grant. To force a new\n' +
          '  refresh token: go to https://myaccount.google.com/permissions, remove the\n' +
          '  app, and re-run this script.',
      );
      server.close();
      process.exit(1);
    }
    console.log('Paste this into Coolify ENV as GDRIVE_REFRESH_TOKEN:\n');
    console.log('  ' + tokens.refresh_token + '\n');
    console.log('(Scope granted: ' + tokens.scope + ')');
    console.log('(Expires: ' + (tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'n/a') + ' — auto-refreshed by app)');
    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Token exchange failed</h1><pre>${e}</pre>`);
    console.error('\n✗ Token exchange failed:', e);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Local callback server listening on ${REDIRECT_URI}\n`);
});

setTimeout(() => {
  console.error('\n✗ Timeout — no authorization received within 5 minutes.');
  process.exit(1);
}, 5 * 60 * 1000);
