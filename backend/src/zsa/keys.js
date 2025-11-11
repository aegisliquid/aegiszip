import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import secp256k1 from 'secp256k1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IssuanceKeys {
  constructor() {
    this.keysDir = path.join(__dirname, '..', 'keys');
    this.keysFile = path.join(this.keysDir, 'issuance-keys.json');
    this.ensureKeysDir();
  }

  ensureKeysDir() {
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }
  }

  generateSeed(length = 32) {
    if (length < 32 || length > 252) {
      throw new Error('Seed length must be between 32 and 252 bytes');
    }
    return crypto.randomBytes(length);
  }

  generateMasterKey(seed) {
    const domain = Buffer.from('ZcashSA_Issue_V1', 'utf8');
    const hmac = crypto.createHmac('sha512', domain);
    hmac.update(seed);
    const result = hmac.digest();

    return {
      masterKey: result.slice(0, 32),
      chainCode: result.slice(32, 64),
    };
  }

  deriveIssuanceKey(masterKey, chainCode, account = 0) {
    const hardened = (index) => (index | 0x80000000) >>> 0;
    const pathIndices = [
      hardened(227),
      hardened(133),
      hardened(account),
    ];

    let key = Buffer.from(masterKey);
    let cc = Buffer.from(chainCode);

    pathIndices.forEach((index) => {
      const data = Buffer.alloc(1 + key.length + 4);
      data[0] = 0x00;
      key.copy(data, 1);
      data.writeUInt32BE(index, data.length - 4);

      let derived = crypto.createHmac('sha512', cc).update(data).digest();
      let childKey = derived.slice(0, 32);
      let childChain = derived.slice(32, 64);

      let tweakIndex = 1;
      while (!secp256k1.privateKeyVerify(childKey)) {
        const retryData = Buffer.alloc(data.length);
        data.copy(retryData);
        const bump = Buffer.alloc(4);
        bump.writeUInt32BE(tweakIndex, 0);
        retryData.set(bump, retryData.length - 4);
        derived = crypto.createHmac('sha512', cc).update(retryData).digest();
        childKey = derived.slice(0, 32);
        childChain = derived.slice(32, 64);
        tweakIndex += 1;
      }

      key = childKey;
      cc = childChain;
    });

    return {
      isk: key,
      chainCode: cc,
    };
  }

  deriveValidatingKey(isk) {
    let privateKey = Buffer.from(isk);
    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid issuance key');
    }

    let publicKey = secp256k1.publicKeyCreate(privateKey, true);

    if (publicKey[0] === 0x03) {
      privateKey = secp256k1.privateKeyNegate(privateKey);
      publicKey = secp256k1.publicKeyCreate(privateKey, true);
    }

    return {
      ik: Buffer.from(publicKey.slice(1)),
      normalizedISK: privateKey,
    };
  }

  encodeIssuer(ik) {
    const ikBuffer = Buffer.from(ik);
    const encoding = Buffer.concat([Buffer.from([0x00]), ikBuffer]);
    return encoding.toString('hex');
  }

  generateOrLoadKeys() {
    this.ensureKeysDir();
    let loadedKeys = null;

    if (fs.existsSync(this.keysFile)) {
      try {
        const keysData = JSON.parse(fs.readFileSync(this.keysFile, 'utf8'));
        if (keysData.issuer && keysData.issuer.length === 66) {
          return keysData;
        }
        loadedKeys = keysData;
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EPERM') {
          throw error;
        }
      }

      if (loadedKeys) {
        const upgraded = this.upgradeLegacyKeys(loadedKeys);
        fs.writeFileSync(this.keysFile, JSON.stringify(upgraded, null, 2));
        return upgraded;
      }
    }

    const seed = this.generateSeed(32);
    const { masterKey, chainCode } = this.generateMasterKey(seed);
    let { isk, chainCode: derivedChainCode } = this.deriveIssuanceKey(
      masterKey,
      chainCode,
      0,
    );
    const { ik, normalizedISK } = this.deriveValidatingKey(isk);
    isk = normalizedISK;
    const issuer = this.encodeIssuer(ik);

    const keysData = {
      seed: seed.toString('hex'),
      masterKey: masterKey.toString('hex'),
      chainCode: chainCode.toString('hex'),
      isk: isk.toString('hex'),
      ik: ik.toString('hex'),
      issuerEncoding: issuer,
      issuer,
      createdAt: new Date().toISOString(),
    };

    fs.mkdirSync(path.dirname(this.keysFile), { recursive: true });
    try {
      fs.writeFileSync(this.keysFile, JSON.stringify(keysData, null, 2));
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.ensureKeysDir();
        fs.writeFileSync(this.keysFile, JSON.stringify(keysData, null, 2));
      } else {
        throw error;
      }
    }

    return keysData;
  }

  upgradeLegacyKeys(keysData) {
    if (!keysData || !keysData.isk) {
      throw new Error('Unable to upgrade legacy issuance keys');
    }

    const legacyISK = Buffer.from(keysData.isk, 'hex');
    const { ik, normalizedISK } = this.deriveValidatingKey(legacyISK);
    const issuer = this.encodeIssuer(ik);

    return {
      ...keysData,
      ik: ik.toString('hex'),
      isk: normalizedISK.toString('hex'),
      issuer,
      issuerEncoding: issuer,
      upgradedAt: new Date().toISOString(),
    };
  }

  getIssuer() {
    const keys = this.generateOrLoadKeys();
    return keys.issuer;
  }

  getISK() {
    const keys = this.generateOrLoadKeys();
    return Buffer.from(keys.isk, 'hex');
  }
}

