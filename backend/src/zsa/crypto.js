import crypto from 'node:crypto';
import { blake2b } from '@noble/hashes/blake2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

function ensurePersonalization(personalization) {
  if (!personalization) {
    return undefined;
  }

  if (typeof personalization === 'string') {
    const bytes = utf8ToBytes(personalization);
    if (bytes.length !== 16) {
      throw new Error(`BLAKE2b personalization must be 16 bytes, got ${bytes.length}`);
    }
    return bytes;
  }

  if (personalization.length !== 16) {
    throw new Error(`BLAKE2b personalization must be 16 bytes, got ${personalization.length}`);
  }

  return personalization;
}

export function blake2b256(data, personalization) {
  return Buffer.from(
    blake2b(data, {
      dkLen: 32,
      personalization: ensurePersonalization(personalization),
    }),
  );
}

export function blake2b512(data, personalization) {
  return Buffer.from(
    blake2b(data, {
      dkLen: 64,
      personalization: ensurePersonalization(personalization),
    }),
  );
}

export function computeAssetDescHash(assetDesc) {
  return blake2b256(Buffer.from(assetDesc, 'utf8'), 'ZSA-AssetDescCRH');
}

export function computeAssetId(issuer, assetDesc) {
  const assetDescHash = computeAssetDescHash(assetDesc);
  const issuerBuffer = Buffer.from(issuer, 'hex');

  const assetId = Buffer.concat([
    Buffer.from([0x00]),
    issuerBuffer,
    assetDescHash,
  ]);

  return {
    assetId: assetId.toString('hex'),
    issuer,
    assetDescHash: assetDescHash.toString('hex'),
  };
}

export function computeAssetDigest(assetId) {
  const assetIdBuffer = Buffer.from(assetId, 'hex');
  return blake2b512(assetIdBuffer, 'ZSA-Asset-Digest');
}

export function computeAssetBase(assetDigest) {
  const domain = 'z.cash:OrchardZSA';
  const hash = crypto.createHash('sha256');
  hash.update(domain);
  hash.update(assetDigest);
  return hash.digest().toString('hex');
}

export function createAssetDescription(name, symbol, description = '') {
  return `${name}|${symbol}|${description}`;
}

export function parseAssetDescription(assetDesc) {
  const parts = assetDesc.split('|');
  return {
    name: parts[0] || '',
    symbol: parts[1] || '',
    description: parts.slice(2).join('|') || '',
  };
}

