import { supabase } from '../lib/supabaseClient.js';

const TOKEN_TABLE = 'zsa_tokens';
const HISTORY_TABLE = 'zsa_token_history';

const mapTokenRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    symbol: row.symbol,
    description: row.description,
    initialSupply: row.initial_supply,
    totalSupply: row.total_supply,
    burnedSupply: row.burned_supply,
    issuer: row.issuer,
    assetId: row.asset_id,
    assetDesc: row.asset_desc,
    assetDescHash: row.asset_desc_hash,
    recipientAddress: row.recipient_address,
    finalized: row.finalized,
    status: row.status,
    network: row.network,
    transactionId: row.transaction_id,
    transaction: row.transaction,
    error: row.error,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deployedAt: row.deployed_at,
    firstIssuance: row.first_issuance,
  };
};

const mapHistoryRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tokenId: row.token_id,
    eventType: row.event_type,
    amount: row.amount,
    recipient: row.recipient,
    transactionId: row.transaction_id,
    finalized: row.finalized,
    broadcast: row.broadcast,
    error: row.error,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
};

export class TokenRepository {
  async insertToken(record) {
    const { data, error } = await supabase
      .from(TOKEN_TABLE)
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase insertToken failed: ${error.message}`);
    }

    return mapTokenRow(data);
  }

  async updateTokenByExternalId(externalId, updates) {
    const { data, error } = await supabase
      .from(TOKEN_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('external_id', externalId)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase updateToken failed: ${error.message}`);
    }

    return mapTokenRow(data);
  }

  async getTokenByExternalId(externalId) {
    const { data, error } = await supabase
      .from(TOKEN_TABLE)
      .select('*')
      .eq('external_id', externalId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase getTokenByExternalId failed: ${error.message}`);
    }

    return mapTokenRow(data);
  }

  async getTokenByAssetId(assetId) {
    const { data, error } = await supabase
      .from(TOKEN_TABLE)
      .select('*')
      .eq('asset_id', assetId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase getTokenByAssetId failed: ${error.message}`);
    }

    return mapTokenRow(data);
  }

  async listTokens({ limit = 50, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from(TOKEN_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Supabase listTokens failed: ${error.message}`);
    }

    return (data ?? []).map(mapTokenRow);
  }

  async insertHistory(record) {
    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase insertHistory failed: ${error.message}`);
    }

    return mapHistoryRow(data);
  }

  async getHistoryForToken(tokenId, { limit = 100 } = {}) {
    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .select('*')
      .eq('token_id', tokenId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Supabase getHistoryForToken failed: ${error.message}`);
    }

    return (data ?? []).map(mapHistoryRow);
  }
}

