# 🎉 Decentralized Cryptocurrency Wallet System

**Status: ✅ COMPLETE & PRODUCTION-READY**

A full-stack blockchain wallet system featuring:
- **Custom blockchain**: UTXO model, Proof-of-Work mining, Ed25519 cryptography
- **Backend**: Go + Firebase Firestore + REST API
- **Frontend**: React 18 + Tailwind CSS + Responsive UI
- **Auth**: Firebase Authentication with custom admin claims
- **Storage**: Google Cloud Firestore (atomic transactions, real-time sync)

**→ Quick Start:** [5-minute setup](#quick-start) | [Full docs](#documentation) | [Architecture](#system-architecture)

---

## 🚀 Quick Start

### Prerequisites
- **Go 1.20+** and **Node.js 18+**
- Firebase project (free at [firebase.google.com](https://firebase.google.com))
- Service account JSON from Firebase

### 1. Clone & Setup
```bash
git clone https://github.com/emmj0/-Decentralized-Wallet.git
cd BlockChainSemesterProject
```

### 2. Start Backend
```powershell
cd backend

# Set environment variables
$env:PORT="8080"
$env:POW_DIFFICULTY="2"
$env:INITIAL_ADMIN_TOKEN="your_64_char_token_here"
$env:GOOGLE_APPLICATION_CREDENTIALS="path/to/firebase-service-account.json"

# Run
go mod download
go run .
```
Backend runs on **http://localhost:8080** ✅

### 3. Start Frontend
```powershell
cd frontend

# Install & run
npm install
npm run dev
```
Frontend runs on **http://localhost:5173** ✅

### 4. Test
1. Open http://localhost:5173
2. Sign up with email
3. Create profile & wallet
4. Bootstrap admin (use `INITIAL_ADMIN_TOKEN`)
5. Admin funds wallet
6. Send transaction
7. Mine block
8. ✅ Done!

**→ Read [QUICKSTART.md](./QUICKSTART.md) for step-by-step screenshots**

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| **QUICKSTART.md** | 5-minute setup & test walkthrough |
| **TESTING_GUIDE.md** | Comprehensive testing guide with all scenarios |
| **TEST_INPUTS.md** | Copy-paste test data & API examples |
| **QUICK_REFERENCE.md** | One-page quick reference |
| **IMPLEMENTATION_SUMMARY.md** | What's been built & recent changes |
| **FLY_DEPLOYMENT.md** | Deploy backend to Fly.io (free tier) |

---

## 🏗️ System Architecture

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (5173)                   │
│  • Auth (Firebase)  • Wallet Gen  • Transactions  • Admin   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/REST
┌────────────────────────▼────────────────────────────────────┐
│                    Go Backend (8080)                        │
│  • User profiles   • UTXO state    • Mining engine          │
│  • Transactions    • Admin ops     • Blockchain validation  │
└────────────────────────┬────────────────────────────────────┘
                         │ gRPC/SDK
┌────────────────────────▼────────────────────────────────────┐
│           Firebase (Auth + Firestore)                       │
│  • User authentication & claims     • All data persistence  │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Backend (Go)
```
backend/
├── main.go                          # Server startup, Firestore init
└── internal/
    ├── api/
    │   ├── server.go               # Route definitions
    │   ├── middleware.go           # Auth & admin checks
    │   ├── users.go                # User CRUD
    │   ├── tx.go                   # Send transaction
    │   ├── admin.go                # Fund, mine, validate, zakat
    │   └── logs.go                 # System logging
    ├── blockchain/
    │   ├── blockchain.go           # Block struct, hash, validation
    │   └── miner.go                # Proof-of-Work mining
    ├── crypto/
    │   └── keys.go                 # Ed25519 key generation
    ├── db/
    │   └── firestore.go            # Firestore DB ops
    └── utxo/
        └── models.go               # UTXO, Transaction structs
```

#### Frontend (React)
```
frontend/
├── src/
│   ├── main.jsx                    # Entry point
│   ├── App.jsx                     # Routes & navigation
│   ├── config.js                   # API base URL
│   ├── firebaseConfig.js           # Firebase setup
│   ├── contexts/
│   │   └── AuthContext.jsx         # Auth state
│   ├── hooks/
│   │   ├── useApi.js               # Fetch wrapper
│   │   └── useEncryption.js        # Crypto hooks
│   ├── pages/
│   │   ├── Auth.jsx                # Sign up / login
│   │   ├── Dashboard.jsx           # Balance & activity
│   │   ├── WalletGen.jsx           # Generate wallet
│   │   ├── SendMoney.jsx           # Send transaction
│   │   ├── Admin.jsx               # Admin panel
│   │   ├── BlockExplorer.jsx       # View blocks
│   │   └── (5 more pages...)
│   └── components/
│       ├── Spinner.jsx
│       └── UnlockWallet.jsx
└── package.json
```

---

## 🗄️ Database Schema (Firestore)

### Collections & Documents

#### `users` — User profiles
```json
{
  "id": "firebase_uid",
  "name": "John Doe",
  "cnic": "12345-6789012-3",
  "beneficiaries": ["wallet_id_1"],
  "created_at": "2025-12-07T10:00:00Z",
  "updated_at": "2025-12-07T10:00:00Z"
}
```

#### `wallets` — Registered wallets
```json
{
  "wallet_id": "base64_public_key_hash",
  "public_key": "base64_ed25519_public_key",
  "created_at": "2025-12-07T10:00:00Z"
}
```

#### `utxos` — Unspent Transaction Outputs
```json
{
  "id": "txid_0",
  "tx_id": "transaction_hash",
  "index": 0,
  "wallet_id": "recipient_wallet",
  "amount": 100000,
  "spent": false,
  "created_at": "2025-12-07T10:00:00Z"
}
```

#### `pending_txs` — Awaiting mining
```json
{
  "id": "tx_hash",
  "sender": "wallet_id",
  "receiver": "wallet_id",
  "amount": 5000,
  "note": "Payment",
  "timestamp": "2025-12-07T10:05:00Z",
  "sender_public_key": "base64_key",
  "inputs": ["utxo_1", "utxo_2"],
  "outputs": ["new_utxo_1"]
}
```

#### `transactions` — Confirmed (mined)
```json
{
  "id": "tx_hash",
  "sender": "wallet_id",
  "receiver": "wallet_id",
  "amount": 5000,
  "block_hash": "mined_block_hash",
  "block_index": 5,
  "timestamp": "2025-12-07T10:05:00Z"
}
```

#### `blocks` — Blockchain blocks
```json
{
  "index": 5,
  "timestamp": "2025-12-07T10:10:00Z",
  "previous_hash": "prev_block_hash",
  "hash": "this_block_hash",
  "merkle_root": "merkle_root_hash",
  "nonce": 12345,
  "difficulty": 2,
  "transactions": ["tx_1", "tx_2", "tx_3"]
}
```

#### `zakat_deductions` — Zakat (2.5%)
```json
{
  "wallet_id": "wallet_id",
  "amount": 2500,
  "tx_id": "zakat_tx_id",
  "created_at": "2025-12-07T10:00:00Z"
}
```

#### `logs` — System audit logs
```json
{
  "id": "log_id",
  "level": "info|warn|error",
  "message": "Transaction signed",
  "type": "tx_signed|admin_fund|mining",
  "user_id": "firebase_uid",
  "ip": "127.0.0.1",
  "metadata": {"tx_id": "...", "amount": 5000},
  "timestamp": "2025-12-07T10:00:00Z"
}
```

---

## 🔌 API Reference

All endpoints (except `/api/admin/make_admin`) require:
```
Authorization: Bearer <firebase_id_token>
```

### User Management
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/users` | ✅ | Create profile |
| GET | `/api/users/{id}` | ✅ | Get profile |
| PUT | `/api/users/{id}` | ✅ | Update profile |

### Wallet & Transactions
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/wallets/register` | ✅ | Register public key |
| GET | `/api/wallets/{id}` | ❌ | Get balance & UTXOs |
| POST | `/api/tx/send` | ✅ | Send transaction |
| GET | `/api/txs/{id}` | ❌ | Get transaction |
| GET | `/api/transactions/filter` | ❌ | Filter transactions |

### Blockchain
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/blocks` | ❌ | List blocks |
| GET | `/api/blocks/{index}` | ❌ | Get block |
| GET | `/api/status` | ❌ | System status |

### Admin (requires `admin: true` claim)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/admin/fund` | ✅ | Fund wallet |
| POST | `/api/admin/mine` | ✅ | Mine block |
| POST | `/api/admin/validate_chain` | ✅ | Validate chain |
| POST | `/api/admin/zakat` | ✅ | Compute zakat |
| POST | `/api/admin/make_admin` | ❌ | Bootstrap admin |
| GET | `/api/admin/logs` | ✅ | View logs |

### Request Examples

**Register Wallet:**
```bash
curl -X POST http://localhost:8080/api/wallets/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"public_key":"base64_key"}'
```

**Send Transaction:**
```bash
curl -X POST http://localhost:8080/api/tx/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "wallet_id",
    "receiver": "wallet_id",
    "amount": 5000,
    "inputs": ["utxo_1"],
    "outputs": ["new_utxo_1"],
    "signature": "base64_signature"
  }'
```

**Fund Wallet (Admin):**
```bash
curl -X POST http://localhost:8080/api/admin/fund \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"target_wallet","amount":100000}'
```

---

## ✨ Key Features

### Regular Users ✅
- Email authentication (Firebase OTP)
- Ed25519 wallet generation (client-side)
- Send/receive signed transactions
- View balance, UTXOs, transaction history
- Explore blockchain in block explorer
- Manage beneficiaries
- View analytics & reports

### Admins ✅
- Bootstrap with `INITIAL_ADMIN_TOKEN`
- Fund wallets (create genesis UTXOs)
- Mine pending transactions (PoW)
- Validate blockchain integrity
- Compute Zakat (2.5% Islamic deduction)
- View complete system audit logs

---

## 🔐 Security & Crypto

### Ed25519 Digital Signatures
- Private keys generated in browser, never sent to server
- Transactions signed client-side before submission
- Server verifies using public key

### Firestore Atomic Transactions
- UTXO spending verified & marked in single atomic operation
- Prevents double-spend attacks
- All-or-nothing semantics

### Firebase Authentication
- Email/password with OTP
- Custom claims for admin role
- ID tokens verified on all protected endpoints

### Admin Bootstrap
- One-time `INITIAL_ADMIN_TOKEN` from environment
- Sets `admin: true` custom claim via Firebase
- Cannot be repeated after first setup

---

## 🚀 Deployment

### Local Development
```powershell
# Terminal 1: Backend
cd backend
go run .

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Production

**Backend → Fly.io (Free)** - See [FLY_DEPLOYMENT.md](./FLY_DEPLOYMENT.md)
```bash
fly launch --no-deploy
fly secrets set INITIAL_ADMIN_TOKEN="..."
fly secrets set FIREBASE_JSON_B64="..."
fly deploy
```

**Frontend → Netlify/Vercel (Free)**
```bash
# Update frontend/src/config.js with backend URL
export const API_BASE = 'https://your-backend.fly.dev'

# Deploy
netlify deploy --prod
```

---

## 📊 Testing Checklist

- [ ] Backend starts on `:8080`
- [ ] Frontend loads on `:5173`
- [ ] Sign up & log in works
- [ ] Create user profile ✓
- [ ] Generate Ed25519 wallet ✓
- [ ] Admin bootstrap with token ✓
- [ ] Admin funds wallet (creates UTXO) ✓
- [ ] Send signed transaction ✓
- [ ] Transaction in pending pool ✓
- [ ] Admin mines block ✓
- [ ] Block in explorer ✓
- [ ] Sender UTXOs marked spent ✓
- [ ] Receiver balance updated ✓
- [ ] Blockchain validates ✓
- [ ] System logs audit trail ✓

---

## 🛠️ Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | React 18, Tailwind, Vite | UI |
| **Backend** | Go 1.20, Gorilla Mux | API |
| **Database** | Google Firestore | Persistence |
| **Auth** | Firebase Auth | User management |
| **Crypto** | Ed25519 (crypto/ed25519) | Signatures |
| **Deploy** | Fly.io, Netlify | Hosting |

---

## 📚 Learning Resources

- [Bitcoin UTXO Model](https://developer.bitcoin.org/reference/transactions.html)
- [Proof of Work](https://bitcoin.org/bitcoin.pdf)
- [Ed25519 Signatures](https://signal.org/docs/)
- [Firestore Docs](https://cloud.google.com/firestore/docs)
- [Go Documentation](https://golang.org/doc/)

---

## 📞 Support

- **Questions?** → Read [QUICKSTART.md](./QUICKSTART.md) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **API examples?** → See [TEST_INPUTS.md](./TEST_INPUTS.md)
- **Deploy issue?** → Check [FLY_DEPLOYMENT.md](./FLY_DEPLOYMENT.md)

---

**Status:** ✅ Complete & Production-Ready  
**Version:** 1.0  
**Last Updated:** December 7, 2025  
**License:** MIT

**→ Start:** [QUICKSTART.md](./QUICKSTART.md) (5 minutes)

