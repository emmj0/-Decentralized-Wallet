package utxo

import (
    "crypto/sha256"
    "encoding/hex"
    "sync"
    "time"
)

// Amounts are stored as integer minor units (e.g., cents) to avoid floating point issues.
type UTXO struct {
    ID        string `json:"id"`
    TxID      string `json:"tx_id"`
    Index     int    `json:"index"`
    WalletID  string `json:"wallet_id"`
    Amount    int64  `json:"amount"`
    Spent     bool   `json:"spent"`
    CreatedAt time.Time `json:"created_at"`
}

type TxOutput struct {
    Recipient string `json:"recipient"`
    Amount    int64  `json:"amount"`
}

type Transaction struct {
    ID              string     `json:"id"`
    Sender          string     `json:"sender"`
    Receiver        string     `json:"receiver"`
    Amount          int64      `json:"amount"`
    Note            string     `json:"note"`
    Timestamp       time.Time  `json:"timestamp"`
    SenderPublicKey string     `json:"sender_public_key"`
    Signature       []byte     `json:"signature"`
    Inputs          []string   `json:"inputs"` // UTXO IDs
    Outputs         []TxOutput `json:"outputs"`
}

// In-memory stores for quick testing before DB integration.
var (
    mu         sync.RWMutex
    UTXOSet    = map[string]*UTXO{}
    PendingTxs = map[string]*Transaction{}
    Wallets    = map[string]string{} // walletID -> publicKey (base64)
)

func calcUTXOID(txid string, index int) string {
    h := sha256.New()
    h.Write([]byte(txid))
    h.Write([]byte{byte(index)})
    return hex.EncodeToString(h.Sum(nil))
}

func CreateUTXO(txid string, index int, walletID string, amount int64) *UTXO {
    id := calcUTXOID(txid, index)
    u := &UTXO{
        ID:       id,
        TxID:     txid,
        Index:    index,
        WalletID: walletID,
        Amount:   amount,
        Spent:    false,
        CreatedAt: time.Now().UTC(),
    }
    mu.Lock()
    defer mu.Unlock()
    UTXOSet[id] = u
    return u
}

func GetUTXO(id string) (*UTXO, bool) {
    mu.RLock()
    defer mu.RUnlock()
    u, ok := UTXOSet[id]
    return u, ok
}

func MarkUTXOSpent(id string) bool {
    mu.Lock()
    defer mu.Unlock()
    u, ok := UTXOSet[id]
    if !ok || u.Spent {
        return false
    }
    u.Spent = true
    return true
}

func WalletBalance(walletID string) int64 {
    mu.RLock()
    defer mu.RUnlock()
    var sum int64
    for _, u := range UTXOSet {
        if u.WalletID == walletID && !u.Spent {
            sum += u.Amount
        }
    }
    return sum
}

// RegisterWallet stores a wallet public key (base64) for a walletID.
func RegisterWallet(walletID, publicKeyB64 string) {
    mu.Lock()
    defer mu.Unlock()
    Wallets[walletID] = publicKeyB64
}

// GetWalletPublicKey returns the registered public key for the wallet.
func GetWalletPublicKey(walletID string) (string, bool) {
    mu.RLock()
    defer mu.RUnlock()
    p, ok := Wallets[walletID]
    return p, ok
}

// AddPendingTx adds a transaction to the pending pool.
func AddPendingTx(tx *Transaction) {
    mu.Lock()
    defer mu.Unlock()
    PendingTxs[tx.ID] = tx
}

// GetPendingTx returns a pending transaction by id.
func GetPendingTx(id string) (*Transaction, bool) {
    mu.RLock()
    defer mu.RUnlock()
    t, ok := PendingTxs[id]
    return t, ok
}

// GetPendingTransactions returns all pending transactions.
func GetPendingTransactions() []*Transaction {
    mu.RLock()
    defer mu.RUnlock()
    result := make([]*Transaction, 0, len(PendingTxs))
    for _, tx := range PendingTxs {
        result = append(result, tx)
    }
    return result
}
