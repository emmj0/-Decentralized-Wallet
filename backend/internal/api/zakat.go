package api

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "net/http"
    "os"
    "strconv"
    "time"

    "github.com/student/decentralized-wallet/internal/db"
    "github.com/student/decentralized-wallet/internal/utxo"
)

// computeZakatForWallet computes 2.5% of balance (integer minor units) and creates a pending txn to zakat pool if >0.
func computeZakatForWallet(walletID string, zakatPoolID string) (string, error) {
    // fetch unspent utxos from firestore or in-memory
    utxos, err := db.GetUnspentUTXOsByWallet(walletID)
    var total int64
    if err != nil {
        // fallback to in-memory
        total = utxo.WalletBalance(walletID)
    } else {
        for _, u := range utxos {
            total += u.Amount
        }
    }
    zakat := (total * 25) / 1000 // 2.5% = 25/1000
    if zakat <= 0 {
        return "", nil
    }

    // pick inputs greedily (from firestore or in-memory)
    var inputs []string
    var collected int64
    if err == nil {
        for _, u := range utxos {
            inputs = append(inputs, u.ID)
            collected += u.Amount
            if collected >= zakat { break }
        }
    } else {
        // in-memory utxos
        for _, u := range utxo.UTXOSet {
            if u.WalletID == walletID && !u.Spent {
                inputs = append(inputs, u.ID)
                collected += u.Amount
                if collected >= zakat { break }
            }
        }
    }
    if collected < zakat {
        return "", nil // insufficient even after all utxos (shouldn't happen)
    }

    // create tx id
    h := sha256.New()
    h.Write([]byte(walletID))
    h.Write([]byte(zakatPoolID))
    h.Write([]byte(strconv.FormatInt(zakat, 10)))
    h.Write([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
    txid := hex.EncodeToString(h.Sum(nil))

    tx := &utxo.Transaction{
        ID: txid,
        Sender: walletID,
        Receiver: zakatPoolID,
        Amount: zakat,
        Note: "zakat_deduction",
        Timestamp: time.Now().UTC(),
        SenderPublicKey: "", // system tx
        Signature: []byte{},
        Inputs: inputs,
        Outputs: []utxo.TxOutput{{Recipient: zakatPoolID, Amount: zakat}},
    }

    // mark inputs spent (try firestore then in-memory)
    for _, id := range inputs {
        if err := db.MarkUTXOSpent(id); err != nil {
            utxo.MarkUTXOSpent(id)
        }
    }
    // create output UTXO record for zakat pool
    out := utxo.CreateUTXO(txid, 0, zakatPoolID, zakat)
    _ = db.CreateUTXO(out)

    // persist pending tx (in-memory)
    utxo.AddPendingTx(tx)
    _ = db.AddPendingTx(tx)
    _ = db.AddZakatRecord(walletID, zakat, txid)

    return txid, nil
}

// admin trigger for zakat (manual)
func adminZakatHandler(w http.ResponseWriter, r *http.Request) {
    zakatPool := os.Getenv("ZAKAT_POOL_WALLET_ID")
    if zakatPool == "" {
        http.Error(w, "ZAKAT_POOL_WALLET_ID not configured", http.StatusInternalServerError)
        return
    }
    wallets, err := db.ListAllWalletIDs()
    if err != nil {
        http.Error(w, "failed to list wallets: "+err.Error(), http.StatusInternalServerError)
        return
    }
    var created []string
    for _, wID := range wallets {
        txid, err := computeZakatForWallet(wID, zakatPool)
        if err == nil && txid != "" {
            created = append(created, txid)
        }
    }
    json.NewEncoder(w).Encode(map[string]interface{}{"created_tx_ids": created})
}

// exported wrapper so main.go can call zakat logic without HTTP
// ComputeZakatForWallet is an exported wrapper so main.go can call zakat logic directly.
func ComputeZakatForWallet(walletID, zakatPool string) (string, error) {
    return computeZakatForWallet(walletID, zakatPool)
}
