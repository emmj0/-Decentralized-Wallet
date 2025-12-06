# Backend (Go)

This folder contains the Go backend for the Decentralized Cryptocurrency Wallet System.

Current scaffold includes:
- `main.go` - starts a small HTTP server
- `internal/api` - basic API routes (`/api/status`, `/api/blocks`, `/api/wallets/:id`)
- `internal/blockchain` - initial Block struct and hash computation

To run locally:

```powershell
cd backend
go mod download
go run ./
```

Server will start on `:8080` by default. Set `PORT` env var to override.

Next backend tasks:
- Implement UTXO manager, transactions, digital signatures, mining engine
- Integrate with serverless DB (Firebase / MongoDB Atlas / Supabase)
- Add authentication and key management

API Notes (local/in-memory testing):

- `POST /api/wallets/register` - register a wallet public key (JSON `{ public_key: "<base64>" }`). Returns `{ wallet_id }`.
- `GET  /api/wallets/{id}` - returns wallet balance and unspent UTXOs (from in-memory store).
- `POST /api/tx/send` - submit a signed transaction (JSON fields: `sender`, `receiver`, `amount`, `note`, `timestamp`, `sender_public_key`, `signature`, `inputs`). Backend verifies Ed25519 signature and UTXO validity, then marks inputs spent and creates outputs.

This is an in-memory implementation intended for early testing. Next steps: persist wallets, utxos, pending txs and blocks in a serverless DB (Firebase Firestore), and verify Firebase Auth ID tokens on protected endpoints.

Firebase setup:
- Create a Firebase project and Firestore (see `../docs/FIREBASE_SETUP.md`).
- Download the service account JSON and set `GOOGLE_APPLICATION_CREDENTIALS` to its path before running the backend. Example:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\firebase-service-account.json'
go run .
```
