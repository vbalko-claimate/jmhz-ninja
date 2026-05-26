import crypto from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

const scrypt = promisify(crypto.scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const MAGIC = Buffer.from('JMHZ1');
const KEY_LEN = 32;
const SALT_LEN = 16;
const NONCE_LEN = 12;
const TAG_LEN = 16;

export async function encryptFile(
  srcPath: string,
  dstPath: string,
  passphrase: string,
): Promise<void> {
  const data = await fs.promises.readFile(srcPath);
  const salt = crypto.randomBytes(SALT_LEN);
  const nonce = crypto.randomBytes(NONCE_LEN);
  const key = await scrypt(passphrase, salt, KEY_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([MAGIC, salt, nonce, tag, ciphertext]);
  await fs.promises.writeFile(dstPath, out);
}

export async function decryptFile(
  srcPath: string,
  dstPath: string,
  passphrase: string,
): Promise<void> {
  const buf = await fs.promises.readFile(srcPath);
  const magic = buf.subarray(0, MAGIC.length);
  if (!magic.equals(MAGIC)) throw new Error('Not a JMHZ encrypted backup (bad magic).');
  let offset = MAGIC.length;
  const salt = buf.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const nonce = buf.subarray(offset, offset + NONCE_LEN);
  offset += NONCE_LEN;
  const tag = buf.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ciphertext = buf.subarray(offset);
  const key = await scrypt(passphrase, salt, KEY_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  await fs.promises.writeFile(dstPath, plain);
}

// satisfy unused import detection for streaming helpers we may add later
void pipeline;
