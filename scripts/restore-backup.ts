#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { decryptFile } from '../lib/backup/crypto';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: pnpm restore-backup <input.db[.enc]> [output.db]');
    process.exit(1);
  }
  const src = path.resolve(args[0]);
  if (!fs.existsSync(src)) {
    console.error('Input file not found:', src);
    process.exit(1);
  }

  const isEnc = src.endsWith('.enc');
  const dst = path.resolve(args[1] ?? (isEnc ? src.replace(/\.enc$/, '') : src + '.restored'));

  if (!isEnc) {
    fs.copyFileSync(src, dst);
    console.log('Copied (no decryption needed) ->', dst);
    return;
  }

  const rl = readline.createInterface({ input, output });
  const passphrase = await rl.question('Backup passphrase: ');
  rl.close();
  if (!passphrase) {
    console.error('Empty passphrase.');
    process.exit(1);
  }

  await decryptFile(src, dst, passphrase);
  console.log('Decrypted ->', dst);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
