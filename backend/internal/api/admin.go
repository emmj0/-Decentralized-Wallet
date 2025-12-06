package api

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "net/http"
    "os"
    "strconv"
    "strings"
    "time"

    "github.com/student/decentralized-wallet/internal/blockchain"
    "github.com/student/decentralized-wallet/internal/db"
    "github.com/student/decentralized-wallet/internal/utxo"
)

// makeAdminHandler sets the `admin: true` custom claim for a given UID when provided the
// correct INITIAL_ADMIN_TOKEN. This is intended as a one-time bootstrap to create an admin user.
// Request body: { "uid": "<user-uid>", "token": "<initial-token>" }
func makeAdminHandler(w http.ResponseWriter, r *http.Request) {
    var in struct {
        UID   string `json:"uid"`
        Token string `json:"token"`
    }
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }
    if in.UID == "" || in.Token == "" {
        http.Error(w, "uid and token required", http.StatusBadRequest)
        return
    }
    expected := os.Getenv("INITIAL_ADMIN_TOKEN")
    if expected == "" {
        http.Error(w, "initial admin token not configured on server", http.StatusForbidden)
        return
    }
    if in.Token != expected {
        http.Error(w, "invalid token", http.StatusUnauthorized)
        return
    }
    if db.AuthClient == nil {
        http.Error(w, "auth client not configured", http.StatusServiceUnavailable)
        return
    }
    // set custom claims
    if err := db.AuthClient.SetCustomUserClaims(context.Background(), in.UID, map[string]interface{}{"admin": true}); err != nil {
        http.Error(w, "failed to set admin claim: "+err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "ok", "uid": in.UID})
}


type mineReq struct {
    Difficulty int `json:"difficulty"`
}

func adminMineHandler(w http.ResponseWriter, r *http.Request) {
    // collect pending tx ids
    txIDs, err := db.GetAllPendingTxIDs()
    if err != nil {
        http.Error(w, "failed to fetch pending txs: "+err.Error(), http.StatusInternalServerError)
        return
    }
    if len(txIDs) == 0 {
        json.NewEncoder(w).Encode(map[string]string{"status": "no pending txs"})
        return
    }

    // determine difficulty
    diff := 5
    if v := os.Getenv("POW_DIFFICULTY"); v != "" {
        if d, err := strconv.Atoi(v); err == nil {
            diff = d
        }
    }

    // get latest block index and previous hash from DB (if available)
    prevHash := ""
    var index int64 = 1
    if db.FSClient != nil {
        if idx, h, err := db.GetLatestBlock(); err == nil {
            if idx > 0 {
                index = idx + 1
                prevHash = h
            }
        }
    }

    block := blockchain.CreateBlock(index, prevHash, txIDs, diff)

    // persist block
    err = db.AddBlock(block.Index, block.Timestamp, block.PreviousHash, block.Hash, block.MerkleRoot, txIDs)
    if err != nil {
        http.Error(w, "failed to persist block: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // move pending txs to mined transactions
    if err := db.MovePendingToMined(txIDs, block.Hash, block.Index); err != nil {
        http.Error(w, "failed to move pending txs: "+err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(map[string]interface{}{"status": "mined", "block_index": block.Index, "block_hash": block.Hash})
}

type fundReq struct {
    WalletID string `json:"wallet_id"`
    Amount   int64  `json:"amount"`
}

// helper: check admin claim or dev secret
func isAdminRequest(r *http.Request) bool {
    // if no auth client configured, allow when ADMIN_SECRET header matches env (dev)
    if db.AuthClient == nil {
        secret := os.Getenv("ADMIN_SECRET")
        if secret == "" {
            // no admin secret configured, allow by default in dev
            return true
        }
        if r.Header.Get("X-ADMIN-SECRET") == secret {
            return true
        }
        return false
    }
    // verify id token and check custom claims
    authHeader := r.Header.Get("Authorization")
    parts := strings.SplitN(authHeader, " ", 2)
    if len(parts) != 2 {
        return false
    }
    idToken := parts[1]
    tok, err := db.AuthClient.VerifyIDToken(r.Context(), idToken)
    if err != nil {
        return false
    }
    if v, ok := tok.Claims["admin"].(bool); ok && v {
        return true
    }
    return false
}

func adminFundHandler(w http.ResponseWriter, r *http.Request) {
    if !isAdminRequest(r) {
        http.Error(w, "admin only", http.StatusForbidden)
        return
    }
    var fr fundReq
    if err := json.NewDecoder(r.Body).Decode(&fr); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }
    if fr.WalletID == "" || fr.Amount <= 0 {
        http.Error(w, "wallet_id and positive amount required", http.StatusBadRequest)
        return
    }

    // create tx id
    h := sha256.New()
    h.Write([]byte(fr.WalletID))
    h.Write([]byte(strconv.FormatInt(fr.Amount, 10)))
    h.Write([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
    txid := hex.EncodeToString(h.Sum(nil))

    // create UTXO (index 0)
    u := utxo.CreateUTXO(txid, 0, fr.WalletID, fr.Amount)
    // persist utxo
    _ = db.CreateUTXO(u)

    // create a transaction record (system fund)
    t := &utxo.Transaction{
        ID:        txid,
        Sender:    "system",
        Receiver:  fr.WalletID,
        Amount:    fr.Amount,
        Note:      "admin_funding",
        Timestamp: time.Now().UTC(),
        Inputs:    []string{},
        Outputs:   []utxo.TxOutput{{Recipient: fr.WalletID, Amount: fr.Amount}},
    }
    // persist transaction record (blockless, block_index=0)
    _ = db.AddTransactionRecord(t, "", 0)

    json.NewEncoder(w).Encode(map[string]string{"status": "ok", "tx_id": txid, "utxo_id": u.ID})
}
