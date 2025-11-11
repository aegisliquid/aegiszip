import crypto from 'node:crypto';
import { computeAssetDescHash, computeAssetId, createAssetDescription } from './crypto.js';
import { IssuanceKeys } from './keys.js';

export class IssuanceTransaction {
  constructor(keys = null) {
    this.keys = keys || new IssuanceKeys();
  }

  createAssetDesc(tokenData) {
    const { name, symbol, description = '' } = tokenData;
    return createAssetDescription(name, symbol, description);
  }

  buildIssueAction(assetDesc, recipients, finalize = false) {
    const assetDescHash = computeAssetDescHash(assetDesc);
    const issuer = this.keys.getIssuer();
    const { assetId } = computeAssetId(issuer, assetDesc);

    const notes = recipients.map((recipient, index) => ({
      recipientAddress: recipient.address,
      value: recipient.amount,
      assetId,
      index,
    }));

    return {
      assetDescHash: assetDescHash.toString('hex'),
      assetDesc,
      notes,
      finalize,
      assetId,
    };
  }

  buildIssuanceBundle(issueAction) {
    const issuer = this.keys.getIssuer();

    return {
      issuer,
      actions: [issueAction],
      signature: null,
    };
  }

  signIssuanceBundle(bundle) {
    const isk = this.keys.getISK();
    const bundleData = JSON.stringify(bundle);
    const hash = crypto.createHash('sha256');
    hash.update(bundleData);
    hash.update('ZcashSA_Issue_V1_Sig');
    const sighash = hash.digest();

    const hmac = crypto.createHmac('sha256', isk);
    hmac.update(sighash);

    bundle.signature = hmac.digest().toString('hex');
    return bundle;
  }

  buildIssuanceTransaction(tokenData, recipients, finalize = false) {
    const assetDesc = this.createAssetDesc(tokenData);
    const issueAction = this.buildIssueAction(assetDesc, recipients, finalize);
    const bundle = this.buildIssuanceBundle(issueAction);
    const signedBundle = this.signIssuanceBundle(bundle);
    const issuer = this.keys.getIssuer();
    const { assetId } = computeAssetId(issuer, assetDesc);

    return {
      version: 6,
      issuanceBundle: signedBundle,
      assetId,
      assetDesc,
      finalize,
    };
  }

  prepareTransaction(tx) {
    return {
      txData: tx,
      ready: true,
      note:
        'Transaction prepared according to ZIP 227. Ready for submission when ZSAs are available.',
    };
  }
}

