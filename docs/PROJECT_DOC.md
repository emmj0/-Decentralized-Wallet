# Project Reference Document — Decentralized Cryptocurrency Wallet System

This document is the working reference for building the final project. It describes architecture, data models, API endpoints, deployment steps, and a prioritized implementation plan. Use this as the single source of truth while completing the project.

---

## 1. High-level architecture

- Frontend: React + Vite + Tailwind CSS
  - Pages: Login (OTP), Register, Dashboard, Wallet Profile, Send Money, Beneficiaries, Transaction History, Block Explorer, Reports, Admin Panel, System Logs
  - Client-side signing: Ed25519 via `tweetnacl` (private key stored in client; optional encrypted storage)
  - Auth: Firebase Auth (Email link / OTP)
- Backend: Go
  - REST API, authentication middleware (Firebase Admin ID token verification), blockchain module, utxo manager, miner, scheduler
- Database: Firebase Firestore (serverless)
  - Collections: `users`, `wallets`, `utxos`, `pending_txs`, `transactions`, `blocks`, `zakat_deductions`, `logs`

## 2. Key design decisions

- UTXO model for balances: Balance = sum(unspent UTXOs)
- Digital signatures: Ed25519 (tweetnacl on client; backend verifies base64-encoded signature)
- Private keys: Client-side by default (safer), stored encrypted with passphrase when enabled
- PoW mining: SHA-256 over block header; difficulty as number of leading zeros (configurable via `POW_DIFFICULTY`)
- Zakat deduction: Monthly scheduled job; 2.5% of wallet balance moved to Zakat Pool wallet (system transaction)

## 3. Data models (Firestore collections)

- users
  - id (uid), name, email, cnic, wallet_id, created_at, last_login, role, is_verified
- wallets
  - wallet_id (sha256(pubkey)), user_id, public_key (base64), encrypted_private_key (optional), created_at
- utxos
  - id (doc id), tx_id, index, wallet_id, amount (int minor units), spent (bool), created_at
- pending_txs
  - id (txid), sender, receiver, amount, note, timestamp, sender_public_key, signature, inputs (array of utxo ids), outputs
- transactions
  - id (txid), block_index, block_hash, sender, receiver, amount, inputs, outputs, note, timestamp, status
- blocks
  - index, timestamp, previous_hash, nonce, hash, merkle_root, transactions (array of txids)
- zakat_deductions
  - id, wallet_id, amount, tx_id, month, created_at
- logs
  - id, type, message, metadata, ip, user_id, timestamp

## 4. API endpoints (planned)

Auth
- POST /api/auth/register -> send OTP/email-link
- POST /api/auth/verify -> verify OTP
- GET /api/auth/me -> user profile

Wallets & Keys
- POST /api/wallets/register -> register public key (protected)
- GET /api/wallets/:id -> wallet details, UTXOs, balance
- POST /api/wallets/credit (admin) -> create test UTXO (admin only)

Transactions
- POST /api/tx/send -> submit signed transaction (protected)
- GET /api/tx/:txid -> tx details
- GET /api/txs?wallet=... -> wallet tx history

Blockchain & Mining
- POST /api/admin/mine (admin) -> mine pending txs into a block
- GET /api/blocks -> list blocks
- GET /api/blocks/:index -> block details
- GET /api/chain/validate -> validate chain integrity

Zakat & Reports
- POST /api/admin/zakat (admin) -> trigger zakat computation now
- GET /api/reports/monthly-summary?wallet=... -> returns monthly summary

Admin & Logs
- GET /api/logs -> system logs (admin)
- GET /api/status -> node status, pending tx count

## 5. Transaction signing format

- Payload signed (UTF-8) = `${senderID}|${receiverID}|${amount}|${timestamp}|${note}`
- Signature: Ed25519 detached signature, base64-encoded
- Backend verifies signature using the sender's registered public key

## 6. UTXO spend rules (backend)

1. Verify sender wallet exists.
2. Verify signature validity.
3. Recompute or fetch UTXOs and ensure inputs exist and are unspent.
4. Use Firestore transaction to atomically mark input UTXOs as spent and create output UTXOs (receiver + change).
5. Insert pending tx document or move directly to transaction + block if mining immediately.

## 7. Miner behavior

- Miner collects pending txs (batch), computes merkle root (simple hash concatenation), creates a block header with index/previous_hash/nonce/timestamp, and loops nonces until the block hash has the required leading zeros.
- On success: persist block, move pending txs to `transactions`, mark UTXOs spent for inputs (if not already) and insert outputs.

## 8. Zakat scheduler

- Monthly cron (or background scheduler in the backend) runs on a configured date/time. For reliability in production, use provider cron (Render cron, GitHub Actions) rather than relying on instance time.
- For each wallet: compute balance by summing unspent UTXOs, compute 2.5% (integer minor units), create a system transaction to `ZAKAT_POOL_WALLET_ID`, persist the tx and UTXO outputs, and log the deduction.

## 9. Security & best practices checklist

- Verify Firebase ID tokens in backend on protected endpoints.
- Use Firestore transactions to avoid double-spend.
- Never log private keys or signatures in plain text.
- Provide client-side key backup and optional passphrase-based encryption.
- Limit API rate for auth and tx endpoints.
- Secure service account JSON on deployment (secrets in Render/Fly/Railway) and do not commit it.

## 10. Deployment checklist

- Frontend: deploy to Vercel or Netlify. Add environment variables (Firebase client config) in the hosting UI.
- Backend: deploy to Render/Fly/Railway. Store `GOOGLE_APPLICATION_CREDENTIALS` JSON as a secret and mount or set env vars as supported.
- Configure domain and authorized domains in Firebase console.
- Confirm Firestore rules as desired for production.

## 11. Immediate prioritized tasks (for today)

1. Harden UTXO spend with Firestore transaction for `POST /api/tx/send`.
2. Add admin test funding endpoint to create a UTXO for a wallet for demo.
3. Implement chain-tip lookup and set `previous_hash` and increment block indices on mining.
4. Fix/minor polish frontend pages: Send Money, WalletGen, Auth flows, and add Dashboard skeleton.
5. Add block explorer endpoints and basic frontend view.
6. Finalize README, API docs, and DB schema diagrams (use a screenshot/ASCII if short on time).
7. Deploy backend to Render (quick) and frontend to Vercel; test end-to-end.
8. Record a short demo video (screen + narration) showing key flows.
9. Draft research article outline and start filling sections (use IEEE template in `docs/IEEE-Template.doc`).

## 12. How to run locally

### Backend
```powershell
cd backend
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\firebase-service-account.json'
go mod download
go run .
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

## 13. Notes for reviewers

- Current implementation is intentionally iterative: first run with in-memory stores for quick testing, then persist to Firestore for production behavior. Always validate the claims and ensure Firestore transaction semantics are used for critical state changes.

---

Keep this doc updated as tasks are completed. When major features are implemented (UTXO atomicity, chain-tip, block explorer, full frontend pages), update the API section and DB schema with final shapes and examples.
