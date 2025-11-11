import { v4 as uuidv4 } from 'uuid';
import { IssuanceKeys } from '../zsa/keys.js';
import { IssuanceTransaction } from '../zsa/issuance.js';
import { computeAssetId, createAssetDescription } from '../zsa/crypto.js';
import { TokenRepository } from '../repositories/tokenRepository.js';
import { emitTokenEvent } from '../events/tokenEvents.js';

const MAX_SUPPLY = BigInt('18446744073709551615');

const sanitizeString = (value) => (value ?? '').toString().trim();

const ensurePositiveBigInt = (value, fieldName) => {
  let bigIntValue;
  try {
    bigIntValue = BigInt(value.toString());
  } catch (error) {
    throw new Error(`${fieldName} must be a valid integer string`);
  }

  if (bigIntValue <= 0n) {
    throw new Error(`${fieldName} must be greater than zero`);
  }

  return bigIntValue;
};

const validateSymbol = (symbol) => {
  const sanitized = sanitizeString(symbol).toUpperCase();
  if (sanitized.length < 2 || sanitized.length > 10) {
    throw new Error('Symbol must be between 2 and 10 characters');
  }
  return sanitized;
};

export class TokenService {
  constructor({
    repository = new TokenRepository(),
    keys = new IssuanceKeys(),
    issuance = null,
  } = {}) {
    this.repository = repository;
    this.keys = keys;
    this.issuance = issuance ?? new IssuanceTransaction(this.keys);
  }

  async createToken(payload = {}) {
    const name = sanitizeString(payload.name);
    const symbol = validateSymbol(payload.symbol);
    const description = sanitizeString(payload.description);
    const recipientAddress = sanitizeString(payload.recipientAddress);
    const finalize = Boolean(payload.finalize);
    const initialSupply = ensurePositiveBigInt(
      payload.initialSupply,
      'initialSupply'
    );

    if (!name) {
      throw new Error('Token name is required');
    }

    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }

    if (initialSupply > MAX_SUPPLY) {
      throw new Error(`initialSupply exceeds maximum ${MAX_SUPPLY.toString()}`);
    }

    const issuer = this.keys.getIssuer();
    const assetDesc = createAssetDescription(name, symbol, description);
    const { assetId, assetDescHash } = computeAssetId(issuer, assetDesc);
    const issuanceTx = this.issuance.buildIssuanceTransaction(
      { name, symbol, description },
      [
        {
          address: recipientAddress,
          amount: initialSupply.toString(),
        },
      ],
      finalize
    );

    const tokenRecord = {
      external_id: uuidv4(),
      name,
      symbol,
      description,
      initial_supply: initialSupply.toString(),
      total_supply: initialSupply.toString(),
      burned_supply: '0',
      issuer,
      asset_id: assetId,
      asset_desc: assetDesc,
      asset_desc_hash: assetDescHash,
      recipient_address: recipientAddress,
      finalized: finalize,
      status: 'pending',
      network: 'zcash-testnet',
      transaction_id: null,
      transaction: issuanceTx,
      error: null,
      metadata: payload.metadata ?? {},
      deployed_at: null,
      first_issuance: true,
    };

    const token = await this.repository.insertToken(tokenRecord);
    const historyEntry = await this.repository.insertHistory({
      token_id: token.id,
      event_type: 'creation',
      amount: token.initialSupply,
      recipient: token.recipientAddress,
      metadata: {
        finalize,
        initial_supply: token.initialSupply,
      },
    });

    emitTokenEvent('token.created', { token, historyEntry });
    return token;
  }

  async listTokens(params) {
    return this.repository.listTokens(params);
  }

  async getTokenByExternalId(externalId) {
    const token = await this.repository.getTokenByExternalId(externalId);
    if (!token) {
      throw new Error('Token not found');
    }
    return token;
  }

  async getHistory(externalId) {
    const token = await this.getTokenByExternalId(externalId);
    return this.repository.getHistoryForToken(token.id);
  }

  async updateStatus(externalId, status, options = {}) {
    const token = await this.getTokenByExternalId(externalId);
    const updates = {
      status,
    };

    if (options.transactionId) {
      updates.transaction_id = options.transactionId;
      updates.deployed_at = new Date().toISOString();
    }

    if (options.error) {
      updates.error = options.error;
    } else if (status !== 'failed') {
      updates.error = null;
    }

    if (typeof options.finalized === 'boolean') {
      updates.finalized = options.finalized;
    }

    if (options.totalSupply) {
      updates.total_supply = options.totalSupply;
    }

    const updatedToken = await this.repository.updateTokenByExternalId(
      externalId,
      updates
    );

    await this.repository.insertHistory({
      token_id: token.id,
      event_type: status === 'failed' ? 'deployment_failed' : 'deployment',
      transaction_id: options.transactionId ?? null,
      error: options.error ?? null,
      metadata: {
        status,
      },
    });

    emitTokenEvent('token.updated', { token: updatedToken });
    return updatedToken;
  }

  async appendHistory(externalId, entry) {
    const token = await this.getTokenByExternalId(externalId);
    const historyEntry = await this.repository.insertHistory({
      token_id: token.id,
      event_type: entry.eventType,
      amount: entry.amount ?? null,
      recipient: entry.recipient ?? null,
      transaction_id: entry.transactionId ?? null,
      finalized: entry.finalized ?? null,
      broadcast: entry.broadcast ?? null,
      error: entry.error ?? null,
      metadata: entry.metadata ?? {},
    });

    emitTokenEvent('token.history-appended', {
      tokenId: token.externalId,
      historyEntry,
    });

    return historyEntry;
  }
}

