# AegisLiq Market Ops Backend

**CA:** Coming soon  
**X:** [x.com/AegisLiq](https://x.com/AegisLiquid)

This package houses the backend prototype for AegisLiq’s market-making stack around Zcash ZIP 227 shielded assets. It does not submit transactions yet. Instead, it lets us model issuances, persist proposed program states, and observe how liquidity scenarios might unfold once ZIP 227 rails are live.

## Current Capabilities

- **Token Registry API** – Express server with REST endpoints for creating draft assets, listing inventory, and fetching individual records.
- **Event Streaming** – Socket.IO layer broadcasts `token.created`, `token.updated`, and `token.history-appended` events so dashboards and operator clients stay in sync.
- **Supabase Persistence** – Tokens and history entries land in `zsa_tokens` and `zsa_token_history`, giving us an auditable log for rehearsals.
- **ZIP 227 Modeling** – Deterministic issuer derivation (`m/227'/133'/0'`), canonical asset description hashing, and mocked issuance bundles keep simulated data aligned with the spec.
- **Operator Stubs** – Status updates, history appenders, and error recording provide the scaffolding for future automation, alerts, and reconciliation.

## Out of Scope (for now)

- No live Zcash RPC calls, bridge interactions, or automated market making logic.
- Signatures are placeholder HMACs; we do not build final Orchard ZSA transactions yet.
- No authentication, multi-tenant controls, or rate limits—the service expects to live behind internal gateways.
- Market data ingest, hedging logic, and execution adapters are roadmap items.

## Architecture

```
src/
├── env.js                 # Environment loader (Supabase URL, keys, CORS)
├── index.js               # Entry point – boots the server
├── server.js              # Express routes + Socket.IO wiring
├── events/tokenEvents.js  # Local event emitter used for fan-out
├── lib/supabaseClient.js  # Service-role Supabase client
├── repositories/          # Persistence helpers (tokens + history)
├── services/tokenService.js
│                          # Business logic for token creation & updates
└── zsa/                   # ZIP 227 helpers (keys, crypto, issuance mock)
```

Typical flow:

1. Client `POST /tokens` with a draft issuance plan.
2. `TokenService` derives an issuer, computes asset IDs, and builds a mocked issuance bundle.
3. The record and a matching history row are stored in Supabase.
4. Socket.IO pushes the event to any connected dashboards or bots.
5. Operators can update status or append additional history as we rehearse the program.

## API Quick Reference

| Method | Endpoint                      | Description                                                                   |
| ------ | ----------------------------- | ----------------------------------------------------------------------------- |
| `GET`  | `/health`                     | Liveness probe                                                                |
| `GET`  | `/tokens`                     | List tracked tokens (supports `?limit=`)                                      |
| `POST` | `/tokens`                     | Create a draft token issuance                                                 |
| `GET`  | `/tokens/:externalId`         | Fetch a single token by UUID                                                  |
| `GET`  | `/tokens/:externalId/history` | Recent lifecycle entries                                                      |
| `POST` | `/tokens/:externalId/status`  | Update status, attach transaction IDs, log errors, and toggle finalized state |

### Example Create Payload

```json
{
  "name": "Aegis Test Asset",
  "symbol": "AEGIS",
  "description": "ZIP227 rehearsal",
  "initialSupply": "1000000000",
  "recipientAddress": "ztestsapling1...",
  "finalize": false,
  "metadata": {
    "playbook": "mm-prototype"
  }
}
```

The response includes the persisted token record, deterministic asset identifiers, and the mock issuance transaction we use during dry runs.

## Local Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create a `.env` file (or export variables) with at minimum:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=service-role-or-dev-key
   PORT=4000
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```

   The service will refuse to start without a Supabase URL and key.

3. **Run the server**

   ```bash
   npm run dev
   ```

   or

   ```bash
   npm start
   ```

4. **Interact**

   - `curl http://localhost:4000/health`
   - `curl http://localhost:4000/tokens`
   - Use Postman or the frontend prototype to exercise the endpoints and observe Socket.IO broadcasts.

## Roadmap

1. **Market Data Ingest** – Pull ZEC pairs, depth charts, and pool stats to enrich token context.
2. **Strategy Simulation** – Feed issuance history and mocked fills into modeling engines before going live.
3. **Execution Connectors** – Add adapters for custodians, bridges, and desks as ZIP 227 endpoints stabilize.
4. **Risk Controls** – Introduce authentication, approvals, supply caps, and alerting tied to status changes.
5. **Real Transaction Assembly** – Swap HMAC placeholders for final Orchard ZSA primitives once available.

## Contributing

We are iterating rapidly; expect breaking changes. Ping us on X or open an issue once the repo is public if you want to plug in new data sources, execution venues, or monitoring hooks.

---

This backend is the rehearsal stage for AegisLiq liquidity ops. When ZIP 227 networks and partner integrations are production-ready, we drop them into this scaffold and graduate from simulations to live market making.

# AegisLiq Backend Toolkit

**CA:** Coming soon  
**X:** [x.com/AegisLiq](https://x.com/AegisLiquid)

AegisLiq is building a liquidity command center for emerging meme ecosystems. This backend package powers our operator CLI: it lets us model token lifecycles, rehearse launch-day procedures, and wire future integrations without waiting on mainnet infrastructure. Think of it as the dry-run environment for every liquidity stunt we want to ship.

## What AegisLiq Is Doing

- **Launch Ops Sandbox:** Spin up issuance plans, track launch-day states, and rehearse supply controls before we flip anything live.
- **Cross-Chain Liquidity Prep:** Map supply snapshots across chains so we can bridge, mirror, or migrate communities when the rails exist.
- **Compliance-Ready Workflow:** Keep every action auditable—issuance metadata, approvals, and custody steps stay in structured JSON so they’re easy to review and plug into reporting dashboards.
- **Operator-First UX:** The CLI keeps things scriptable. Automations and runbooks can wrap it, which keeps the actual operational flow under version control.

## Roadmap & Expansion Plans

1. **Live Chain Adapters**

   - Roll in chain-specific modules (EVM, Solana, Zcash Shielded Assets) as soon as partner RPCs and SDKs stabilize.
   - Auto-simulate fees, bridge limits, and confirmation times so operators know their window before they hit broadcast.

2. **Liquidity Routing Engine**

   - Calculate optimal token flows (market-making vs. treasury) with guardrails for max slippage.
   - Plug the outputs into the CLI so single commands can initiate multi-leg operations.

3. **Treasury Guard & Reporting**

   - Add policy enforcement (multi-sig approvals, value-at-risk alerts).
   - Stream structured events to the internal dashboard and export finance-ready CSVs.

4. **Community Expansion Toolkit**

   - Ship preset playbooks for new chain launches, allowing community managers to fork configs and run targeted campaigns.
   - Bundle design assets, launch instructions, and analytics hooks so we ship coordinated activations quickly.

5. **Partner Integrations**
   - Line up liquidity partners, OTC desks, and custodians; expose one-click “call partner” flows inside the CLI once APIs are signed.

## Current CLI Capabilities

- **Create Launch Blueprint:** Define token metadata, initial supply, and issuance schedule.
- **Issue More Supply:** Top up circulating supply before a program is finalized.
- **Finalize Run:** Lock supply to guarantee hard caps once we’re live.
- **Asset Registry:** Persist metadata, supply movements, and statuses for every asset we mock or launch.
- **Inspection Commands:** Surface everything an operator needs—issuer IDs, supply history, and audit trails.

> Transfers, bridge calls, and on-chain signatures are mocked today. The scaffolding mirrors the interfaces we will plug into once each chain’s SDK is production-ready.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Boot the CLI Environment

```bash
npm run setup
```

Populate the generated `.env` with the credentials for your current testnet or partner sandbox.

### 3. Run the Operator CLI

```bash
npm start
```

Or:

```bash
npm run cli
```

### 4. Practice a Launch Flow

```bash
# Create a mock token blueprint (stores metadata under tokens/)
node scripts/create-test-token.js

# Simulate a deploy (no on-chain calls yet)
node scripts/deploy-token.js <assetId>

# Append --mine if you are running a local chain harness that can advance blocks
node scripts/deploy-token.js <assetId> --mine
```

Every command writes structured JSON in `tokens/` and `keys/` so you can diff runs, build dashboards, or archive playbooks.

## Project Structure

```
aegisliq-backend/
├── cli.js                  # Entry point for the operator CLI
├── scripts/
│   ├── setup.js            # Environment bootstrapper
│   ├── deploy-token.js     # Launch rehearsal script
│   └── create-test-token.js# Sample blueprint generator
├── src/
│   ├── keys.js             # Issuance key derivation + storage helpers
│   ├── crypto.js           # Hashing & encoding utilities (mocked today)
│   ├── issuance.js         # Launch/issuance orchestration
│   ├── token-creator.js    # Token metadata builder
│   ├── token-manager.js    # Supply tracking + state machine
│   └── partner-client.js   # Placeholder for future partner RPC integrations
├── tokens/                 # Generated token records (gitignored)
├── keys/                   # Issuance keys (gitignored)
├── token-config.json       # Default blueprint template
└── package.json            # Dependencies and scripts
```

## Working With the CLI

- `npm run cli -- help` — discover available commands
- `npm run cli -- create-token` — launch the interactive wizard
- `npm run cli -- issue-more <assetId>` — add to the circulating supply while in staging
- `npm run cli -- finalize <assetId>` — simulate the hard-cap switch
- `npm run cli -- info <assetId>` — inspect audit-ready metadata
- `npm run cli -- list-assets` — snapshot everything you’re tracking

## Operator Playbooks (Planned)

- **Multi-Chain Launch:** Automatically scaffold configs for each target chain with pre-flight checks.
- **Liquidity Migration:** Import supply snapshots from partner chains and prepare the burn-and-mint flow.
- **Treasury Balancing:** Model treasury routes (staking, LP seeding, market making) with single-command execution once live rails exist.
- **Community Drops:** Bundle campaigns (airdrops, quests, gatekeeping) so they can be toggled on or off per launch.

## Contributing

We’re keeping the project private while we stitch integrations together, but we welcome feedback and intros to new partners. Reach out via X or open a discussion ticket if you have ideas, liquidity infrastructure, or tooling we should plug into AegisLiq.

---

**Note:** All on-chain actions are placeholders until partner SDKs and contracts are deployed. The moment they’re live, this toolkit becomes the ops console that drives every AegisLiq launch.

# Zcash Meme Coin CLI Tool - ZIP 227 Implementation

This repo is a hands-on sandbox for ZIP 227. You can explore how Zcash Shielded Assets (ZSAs) will work—derive issuers, mint assets, and track lifecycle events—even though Orchard ZSA isn’t live yet.

## Overview

We track the current ZIP 227 spec: issuance keys follow the real hardened path, asset IDs and description hashes match the draft standard, and the CLI mirrors the future workflows. Transfers, burns, and consensus checks are still mocked because no public ZSA network exists, but the shapes line up with the Rust tooling we’ll plug in as soon as OrchardZSA lands.

## Current Status

**ZSAs (Zcash Shielded Assets) are not yet live on testnet.** The repo provides a spec-driven mock so you can design your flows now and swap in the real primitives when they ship.

### What is implemented now

- ZIP-32 hardened derivation path `m/227'/133'/0'` for issuance keys, with BIP-340 compliant public key encoding (`issuer = 0x00 || x-coordinate`).

- Canonical asset description hashing and Asset ID construction per draft ZIP 227 (with temporary SHA-256 stand-ins for BLAKE2b).

- Deterministic issuance bundle scaffolding and local state/history tracking for created assets.

- CLI flows for token lifecycle management (create, issue-more, finalize, inspect) operating on persisted JSON.

### Still mocked / TODO

- Orchard action groups, note commitments, consensus validation, and MAX_ISSUE enforcement happen only in memory.

- `issueAuthSig` is simulated; we do not yet build or sign Version 6 transactions.

- Transfer/burn operations remain placeholders until ZIP 226 is deployable.

- GroupHash and BLAKE2b implementations use simplified hashes — swap to real primitives before mainnet.

See `docs/ZSA_COMPLIANCE.md` for a running checklist.

## Mock Bonding Curve Sandbox

- **Purpose**: Rapidly sketch token economics against ZIP 227 assets using a deterministic linear bonding curve that caps supply at 64-bit space.
- **Curve model**: Price ticks follow `price = initialPrice + slope * supply`, computed with integer math and configurable precision (0–18 decimals).
- **Helpers**: Access spot pricing, reserve depth, mint/burn quotes, and budget projections through `getSpotPrice`, `getReserveBalance`, `quoteMint`, `quoteBurn`, and `projectMintForBudget`.
- **Metadata**: Include a `bondingCurve` object in the `POST /tokens` payload to persist `metadata.bondingCurve` with the resolved config plus a mint preview for front-ends.

```116:141:backend/src/zsa/bondingCurve.js
export class BondingCurveMock {
  constructor({
    initialPrice = "0.10",
    slope = "0.00001",
    maxSupply = UINT64_MAX,
    decimals = DEFAULT_DECIMALS,
  } = {}) {
    this.decimals = normalizeDecimals(decimals);
    this.scale = 10n ** BigInt(this.decimals);

    this.initialPriceScaled = parseDecimalToScaled(
      initialPrice,
      this.scale,
      "initialPrice",
    );
    this.slopeScaled = parseDecimalToScaled(
      slope,
      this.scale,
      "slope",
    );
    this.maxSupply = ensureNonNegativeBigInt(maxSupply, "maxSupply");

    if (this.maxSupply === 0n) {
      throw new Error("maxSupply must be greater than zero");
    }
  }
```

```218:240:backend/src/zsa/bondingCurve.js
    return {
      amount: mintAmount.toString(),
      currentSupply: supplyBefore.toString(),
      newSupply: newSupply.toString(),
      totalCost: formatScaledDecimal(
        totalCostScaled,
        this.scale,
        this.decimals,
      ),
      averagePrice: formatScaledDecimal(
        averagePriceScaled,
        this.scale,
        this.decimals,
      ),
      spotPriceBefore: formatScaledDecimal(
        this.#priceAtSupply(supplyBefore),
        this.scale,
        this.decimals,
      ),
      spotPriceAfter: formatScaledDecimal(
        this.#priceAtSupply(newSupply),
        this.scale,
        this.decimals,
      ),
    };
```

Example: load the mock in a script or REPL to quote the first issuance tranche.

```js
import { BondingCurveMock } from "../backend/src/zsa/bondingCurve.js";

const curve = new BondingCurveMock({
  initialPrice: "0.25",
  slope: "0.00005",
  maxSupply: BondingCurveMock.UINT64_MAX,
});

const mintPreview = curve.quoteMint({ amount: 1000n, currentSupply: 0n });

console.log(mintPreview.totalCost); // "250.025"
console.log(mintPreview.spotPriceAfter); // "0.275"
```

Include the bonding-curve configuration when creating a token to capture the economics snapshot alongside issuance metadata.

```json
POST /tokens
{
  "name": "MEOW",
  "symbol": "MEOW",
  "description": "Cat economy with bonding curve",
  "recipientAddress": "zs1exampleaddress",
  "initialSupply": "1000",
  "finalize": false,
  "bondingCurve": {
    "initialPrice": "0.25",
    "slope": "0.00005",
    "decimals": 6,
    "maxSupply": "1000000000"
  }
}
```

The backend stores the resolved curve plus the issuance preview under `metadata.bondingCurve.preview`, ready to drive dashboards or liquidity calculators.

## Prerequisites

- Node.js (v18 or higher)

- npm or yarn

- Zcash testnet node (optional, for full functionality when ZSAs are available)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Configuration

```bash
npm run setup
```

This will create a `.env` file from the template. Update it with your Zcash testnet credentials:

```env
ZCASH_TESTNET_RPC_URL=http://localhost:18232
ZCASH_TESTNET_RPC_USER=your_rpc_user
ZCASH_TESTNET_RPC_PASSWORD=your_rpc_password
```

### 3. Run the CLI

```bash
npm start
```

Or:

```bash
npm run cli
```

### 4. Deploy a token with the Rust tx-tool

```bash
# Create a token (stores metadata under tokens/)
node scripts/create-test-token.js

# Deploy it (requires a ZSA-enabled node)
node scripts/deploy-token.js <assetId>

# If you are running a local Zebra regtest node that lets you mine blocks, add --mine
node scripts/deploy-token.js <assetId> --mine
```

If the deploy step fails with `transaction did not pass consensus validation`, the connected node rejected the issuance. See [Running a local Zebra regtest](#running-a-local-zebra-regtest) for a configuration that allows you to mine and accept the transaction locally.

## CLI Commands

The CLI provides the following commands:

### 1. create-token

Create a new meme coin (ZSA token)

```
- Token Name
- Token Symbol (2-10 characters)
- Description
- Initial Supply
- Recipient Zcash Address (z-addr)
- Finalize (yes/no)
```

### 2. issue-more

Issue additional tokens (if token is not finalized)

```
- Asset ID
- Amount to issue
- Recipient Zcash Address
```

### 3. transfer

Transfer tokens to another address (ZIP 226 - OrchardZSA)

```
- Asset ID
- Recipient Address
- Amount
```

### 4. burn

Burn tokens (mocked by sending supply to the incinerator wallet for tracking)

```
- Asset ID
- Amount to burn
```

[INFO] The CLI records burns by routing the amount to a fixed incinerator wallet and reducing the tracked total supply. Real ZIP‑226 burns will replace this once OrchardZSA is live.

### 5. balance

Check token balance

```
- Asset ID (or "all" for all tokens)
```

### 6. list-assets

List all your created assets

Shows a table with:

- Name
- Symbol
- Asset ID
- Supply
- Finalized status

### 7. info

Get detailed asset information

```
- Asset ID
```

Shows complete asset details including:

- Asset ID and description hash
- Issuer identifier
- Supply information
- Status and metadata

### 8. finalize

Finalize token (prevent further issuance)

```
- Asset ID
```

**Warning:** Finalizing a token prevents any further issuance permanently.

## Project Structure

```
zcash-meme-coin/
├── cli.js                  # Main CLI interface
├── scripts/
│   ├── setup.js            # Setup script
│   ├── deploy.js           # Deployment script
│   └── test.js             # Testing utilities
├── src/
│   ├── keys.js             # Issuance key generation (ZIP 227)
│   ├── crypto.js           # Cryptographic utilities (BLAKE2b, Asset ID)
│   ├── issuance.js         # Issuance transaction building
│   ├── token-creator.js    # Token creation service
│   ├── token-manager.js    # Token management logic
│   └── zcash-client.js     # Zcash RPC client
├── tokens/                 # Created tokens storage (gitignored)
├── keys/                   # Issuance keys storage (gitignored)
├── token-config.json       # Default token configuration
├── package.json            # Dependencies
└── README.md               # This file
```

## ZIP 227 Implementation Details

### Key Generation

The tool implements the ZIP 227 key ladder:

- **Master Key**: Derived from a 32-byte seed using the `ZcashSA_Issue_V1` domain (ZIP 32 hardened-only tree).

- **Issuance Key (`isk`)**: Produced via the hardened path `m/227'/133'/0'`.

- **Validating Key (`ik`)**: BIP-340 compliant x-coordinate derived from `isk`, normalized to even Y parity.

- **Issuer Identifier**: `issuer = 0x00 || ik`, matching the draft spec encoding.

### Asset Description

Asset descriptions follow ZIP 227 format:

```
"name|symbol|description"
```

Example: `"PepeCoin|PEPE|The memest coin on Zcash"`

### Asset ID Calculation

Asset ID is computed as:

```
asset_desc_hash = BLAKE2b-256("ZSA-AssetDescCRH", asset_desc)
AssetId = [0x00 || issuer (32 bytes) || asset_desc_hash (32 bytes)]
```

### Issuance Transaction

The local transaction objects follow the ZIP 227 layout (still off-chain):

- **Version**: 6 (placeholder flag).

- **Issuance Bundle**: Stores issuer encoding, actions, and simulated signatures.

- **Issue Action**: Carries `asset_desc_hash`, mock notes, and `finalize`.

- **Signature**: Placeholder string; swap for a real BIP-340 Schnorr signature once OrchardZSA SIGHASH is available.

## Available Scripts

- `npm start` or `npm run cli` - Start the CLI interface

- `npm run setup` - Set up the project environment

- `npm run setup:verification` - Set up GitHub commit verification (SSH signing)

- `npm run deploy` - Deploy token (when ZSAs are available)

- `npm test` - Run basic setup tests

- `npm run test:unit` - Run comprehensive unit tests

- `npm run test:watch` - Run tests in watch mode

- `npm run test:coverage` - Run tests with coverage report

## Running a local Zebra regtest

If the hosted node is unavailable or rejects ZSA issuance, you can run the bundled Zebra image locally and mine blocks yourself:

```bash
# Build and launch the ZSA-enabled Zebra node (regtest)
git clone -b zsa-integration-demo --single-branch https://github.com/QED-it/zebra.git
cd zebra/testnet-single-node-deploy
docker build -t zsa-zebra-regtest .
docker run --rm -p 18232:18232 zsa-zebra-regtest
```

In a separate PowerShell window:

```powershell
$env:ZCASH_NODE_ADDRESS = "127.0.0.1"
$env:ZCASH_NODE_PORT = "18232"
$env:ZCASH_NODE_PROTOCOL = "http"
```

Now run `node scripts/deploy-token.js <assetId> --mine` to broadcast and mine the issuance transaction locally.

## GitHub Verification

To make your commits show as "Verified" on GitHub:

1. **Quick Setup (Windows):**

   ```bash
   npm run setup:verification
   ```

2. **Manual Setup:**

   See `docs/GITHUB_VERIFICATION.md` for detailed instructions on setting up SSH or GPG signing.

3. **After Setup:**

   - Add your SSH public key to GitHub as a "Signing Key"
   - All future commits will be automatically signed
   - Commits will show as "Verified" on GitHub

## Token Features

Once ZSAs are available, this tooling is ready to plug in:

- Token creation on Zcash testnet (ZIP 227) using live consensus calls instead of mocks.

- Additional token issuance (if not finalized) with real issuance actions.

- Token transfers (ZIP 226 - OrchardZSA).

- Token burning and on-chain supply reconciliation.

- Balance queries and shielded transfers via Orchard components.

## Solana → Zcash ZSA Migration Plan (Preview)

We expect many meme projects to launch liquidity on Solana first. When ZSAs land, the migration path will look like:

1. **Inventory & Freeze**

   - Snapshot Solana token supply and circulating balances.

   - Pause new minting (or burn remaining authority) to guarantee 1:1 backing.

2. **Custody & Bridge Setup**

   - Select a ZSA-aware custodian/multisig that holds the Solana reserves.

   - Stand up a relayer service that can observe Solana burn events and trigger ZSA issuance.

3. **Issuance Key Provisioning**

   - Use this CLI to derive the production `isk/ik` pair following `m/227'/133'/0'`.

   - Store the `issuer` encoding on the coordination service; guard the private key inside HSM or MPC.

4. **Asset Definition**

   - Publish the canonical asset description (`name|symbol|description`) alongside a signed statement linking it to the Solana mint address.

   - Distribute pet-name metadata so wallets can map the Asset ID to brand assets.

5. **Peg-In / Mint Flow**

   - Users burn or lock their Solana tokens in the bridge contract.

   - The relayer assembles a ZIP-227 issuance transaction (using the real OrchardZSA libraries) and broadcasts it to Zcash testnet / mainnet.

   - The CLI’s issuance history log becomes the audit trail for each 1:1 mint.

6. **Peg-Out / Redemption Flow**

   - Users submit ZSA burn proofs (ZIP 226) back to the bridge.

   - Upon confirmation, the custodian releases the equivalent Solana tokens.

7. **Monitoring & Comms**

   - Provide a dashboard that scrapes `tokens/*.json` (or on-chain data once live) to show total supply, burns, and outstanding Solana reserves.

   - Document emergency procedures (key rotation, finalization) for transparency.

We’ll publish a deeper playbook under `docs/solana-migration.md` and wire the CLI into real bridge scripts as OrchardZSA reference code becomes available.

## Maximum Supply

ZIP 227 defines maximum supply as:

```
MAX_ISSUE = 2^64 - 1 = 18,446,744,073,709,551,615
```

## Important Notes

### Current Status

- ZIP 227 is **DRAFT** status

- Not yet deployed to mainnet or testnet

- Needs network upgrade (likely NU7)

- You'll need ZSA-enabled testnet

### Where to Find ZSA Testnet

Check Zcash community resources:

- Zcash Community Forum: https://forum.zcashcommunity.com
- Zcash R&D Discord
- QEDIT (ZSA development team)

### Security

- Issuance keys are stored locally (unencrypted in current implementation)

- **Important**: In production, encrypt keys and use secure storage

- Never share your issuance keys (isk)

## Resources

- [ZIP 227 Specification](https://zips.z.cash/zip-0227)

- [ZIP 226: Transfer and Burn](https://zips.z.cash/zip-0226)

- [Zcash Official Website](https://z.cash)

- [Zcash Community Forum](https://forum.zcashcommunity.com)

- [Zcash Testnet Faucet](https://faucet.testnet.z.cash/)

## Disclaimer

This is a testnet project for educational purposes. ZSAs are not yet fully implemented, so actual token deployment is not currently possible. Monitor the Zcash community for updates on ZSA availability.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Note:** This project implements ZIP 227 specification and is ready for when ZSAs become available on Zcash testnet.
