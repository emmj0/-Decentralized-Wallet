# Private Key Encryption Implementation

## Overview
Client-side AES-256 encryption for private keys with passphrase-based key derivation. Private keys are encrypted before storage in localStorage and remain encrypted until the user explicitly decrypts them for signing transactions.

## Architecture

### Components

#### 1. **useEncryption Hook** (`src/hooks/useEncryption.js`)
- **Purpose:** Provides encryption/decryption utilities
- **Methods:**
  - `encrypt(data, passphrase)` — Encrypts data with AES-256 using passphrase
  - `decrypt(encryptedData, passphrase)` — Decrypts data, throws if passphrase wrong or data corrupted
- **Key Features:**
  - Uses CryptoJS library for AES encryption
  - Returns base64-encoded encrypted data for safe storage
  - Client-side only; passphrase never sent to server

#### 2. **WalletGen Page** (`src/pages/WalletGen.jsx`)
**New Workflow:**
1. User clicks "🔑 Generate New Keypair"
2. Passphrase modal appears (min 8 characters)
3. User confirms passphrase (must match twice)
4. Keypair generated using Ed25519 (tweetnacl)
5. **Private key encrypted with AES-256** and saved to localStorage:
   - `wallet_private_key_encrypted` — encrypted private key blob
   - `wallet_public_key` — public key (not encrypted, used as wallet ID)
   - `wallet_id` — derived wallet identifier
6. Display shows:
   - Public key (plaintext, for registration)
   - Private key (decrypted, in memory only, shown once)
   - Encryption status ("🔒 encrypted")
7. **Download Backup** button — exports JSON with public key, encrypted private key, wallet ID, and timestamp
8. **Register Public Key** button — registers wallet on blockchain

**Security Features:**
- Private key never stored plaintext
- Passphrase validated (min 8 chars, must match confirmation)
- Error messages if validation fails
- Encrypted status clearly displayed
- Warning about keeping backup safe

#### 3. **UnlockWallet Modal** (`src/components/UnlockWallet.jsx`)
**Purpose:** Decrypt private key on-demand for signing

**Triggered by:**
- Clicking "Send Transaction" in SendMoney when wallet is encrypted

**Behavior:**
1. Modal prompts for passphrase
2. On submit, attempts to decrypt `wallet_private_key_encrypted`
3. If successful, returns decrypted key to parent component
4. If failed, displays error ("invalid passphrase or corrupted data")
5. Modal disappears after successful unlock

**Features:**
- Overlay modal with professional styling
- Passphrase input field (type=password)
- Submit on Enter key
- Cancel button
- Security message explaining passphrase never sent to server
- Loading state during decryption

#### 4. **SendMoney Page** (`src/pages/SendMoney.jsx`)
**Updated Workflow for Encrypted Keys:**
1. User fills in receiver, amount, note
2. Clicks "🔓 Unlock & Send" (if wallet is encrypted)
3. UnlockWallet modal appears
4. User enters passphrase
5. On successful unlock:
   - Decrypted key stored in component state (`decryptedKey`)
   - Button changes to "💳 Send Transaction"
   - User clicks Send to sign and broadcast transaction
6. After transaction is sent, `decryptedKey` is cleared from memory

**Key Logic:**
- Checks for `wallet_private_key_encrypted` in localStorage
- If encrypted and no decrypted key in state → show modal
- Uses decrypted key for signing (stays in memory, never persisted)
- Supports legacy plaintext keys (fallback to `wallet_private_key`)

**UI Improvements:**
- Gradient header (purple theme)
- Better form layout with validation
- UTXOs displayed as list at bottom
- Clear status messages (success, error)
- Balance shown prominently
- Security warning about reversibility

#### 5. **Profile Page** (`src/pages/Profile.jsx`)
**New Feature: Cloud Backup Option**
- Detects if encrypted wallet exists locally
- Checkbox: "Backup encrypted private key to cloud"
- When enabled and profile is saved:
  - Encrypted private key is synced to backend `users` doc
  - Can be used to restore wallet on another device
  - Still requires passphrase to decrypt (server never sees plaintext)

**Benefit:** Multi-device support without compromising security

## Storage Details

### localStorage Keys
```
wallet_private_key_encrypted → "base64-encoded AES-encrypted private key"
wallet_public_key → "base64-encoded public key"
wallet_id → "unique wallet identifier"
```

### Backend Storage (Optional)
When synced via Profile:
```json
{
  "id": "user-uid",
  "name": "User Name",
  "cnic": "...",
  "beneficiaries": ["..."],
  "encrypted_private_key": "base64-encoded AES-encrypted private key"
}
```

## Security Analysis

### Strengths
✓ **Client-side encryption** — passphrase never sent to server
✓ **AES-256** — industry-standard symmetric encryption
✓ **Passphrase validation** — min 8 chars, confirmation required
✓ **On-demand decryption** — keys only decrypted when needed for signing
✓ **Memory clearing** — decrypted key cleared after transaction
✓ **No plaintext persistence** — encrypted in storage, decrypted in memory only
✓ **Backup option** — users can export encrypted backup locally

### Considerations
- **Passphrase strength:** Relies on user choosing strong passphrase
  - Mitigation: Min 8 chars; recommend longer passphrases in UI
- **localStorage access:** If device compromised, encrypted blobs can be stolen
  - Mitigation: Passphrase still required to decrypt; advise device security
- **Memory attacks:** Decrypted key in memory during signing
  - Mitigation: Cleared after use; short window; typical for client-side crypto
- **Backup files:** Downloaded JSON backup contains encrypted key
  - Mitigation: Passphrase required to use; user advised to keep backup safe

### Recommendations for Future
1. Use Web Crypto API (native browser crypto) instead of crypto-js for smaller bundle
2. Implement biometric unlock (WebAuthn) as alternative to passphrase
3. Add passphrase strength meter during generation
4. Clear decrypted key from memory after 5 min inactivity
5. Add 2FA or recovery codes for account recovery

## User Flows

### New Wallet Generation
```
User → Click "Generate New Keypair"
    → Enter & confirm passphrase
    → Keypair generated
    → Private key encrypted
    → Keys displayed (public visible, private shown once)
    → Download backup optional
    → Register on blockchain
    → Stored: encrypted in localStorage
```

### Sending Money with Encrypted Key
```
User → Navigate to Send
    → Fill in receiver, amount, note
    → Click "Unlock & Send"
    → UnlockWallet modal opens
    → Enter passphrase
    → Key decrypted, modal closes
    → Click "Send Transaction"
    → Transaction signed & broadcast
    → Decrypted key cleared from memory
```

### Restoring from Backup (Future)
```
User → Import backup JSON file
    → System detects encrypted_private_key
    → Passphrase prompt
    → Key decrypted & stored encrypted in localStorage
    → Wallet ready to use
```

## Testing Checklist

- [ ] Generate new wallet with passphrase
- [ ] Verify encryption status displayed correctly
- [ ] Download backup file (verify JSON format)
- [ ] Attempt send without unlocking (should show modal)
- [ ] Enter wrong passphrase (should show error)
- [ ] Enter correct passphrase (should unlock)
- [ ] Send transaction after unlock
- [ ] Verify decrypted key cleared after send
- [ ] Check Profile page shows encryption option
- [ ] Sync encrypted key to backend, verify in DB
- [ ] Reload page, verify wallet still accessible with passphrase
- [ ] Legacy plaintext wallet fallback still works

## Performance Notes
- Encryption/decryption: ~10-50ms (imperceptible to user)
- Bundle size impact: crypto-js adds ~60KB (already in dependencies)
- No network overhead for encryption (all client-side)

---

**Last Updated:** December 6, 2025
