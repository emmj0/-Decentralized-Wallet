package api

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io/ioutil"
    "net/http"
    "strconv"
    "strings"
    "time"

    "github.com/student/decentralized-wallet/internal/crypto"
    "github.com/student/decentralized-wallet/internal/db"
    "github.com/student/decentralized-wallet/internal/utxo"
)

type registerReq struct {
    PublicKey string `json:"public_key"` // base64
    WalletID  string `json:"wallet_id,omitempty"`
}

func registerWalletHandler(w http.ResponseWriter, r *http.Request) {
    var req registerReq
    body, _ := ioutil.ReadAll(r.Body)
    json.Unmarshal(body, &req)
    pub := strings.TrimSpace(req.PublicKey)
    var walletID string
    if req.WalletID != "" {
        walletID = req.WalletID
    } else {
        // wallet id = sha256(pubkey)
        h := sha256.Sum256([]byte(pub))
        walletID = hex.EncodeToString(h[:])
    }
    // persist in Firestore (and keep in-memory for quick tests)
    utxo.RegisterWallet(walletID, pub)
    _ = db.RegisterWallet(walletID, pub)
    json.NewEncoder(w).Encode(map[string]string{"wallet_id": walletID})
}

type sendTxReq struct {
    Sender          string   `json:"sender"`
    Receiver        string   `json:"receiver"`
    Amount          int64    `json:"amount"`
    Note            string   `json:"note"`
    Timestamp       string   `json:"timestamp"`
    SenderPublicKey string   `json:"sender_public_key"`
    Signature       string   `json:"signature"` // base64
    Inputs          []string `json:"inputs"`
}

func sendTxHandler(w http.ResponseWriter, r *http.Request) {
    var req sendTxReq
    body, _ := ioutil.ReadAll(r.Body)
    if err := json.Unmarshal(body, &req); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }

    // validate wallet exists
    // fetch public key from firestore if available, otherwise from in-memory
    pub, err := db.GetWalletPublicKey(req.Sender)
    if err != nil {
        // fallback to in-memory
        p, ok := utxo.GetWalletPublicKey(req.Sender)
        if !ok {
            http.Error(w, "sender wallet not registered", http.StatusBadRequest)
            return
        }
        pub = p
    }

    // verify signature over payload sender+receiver+amount+timestamp+note
    msg := strings.Join([]string{req.Sender, req.Receiver, strconv.FormatInt(req.Amount, 10), req.Timestamp, req.Note}, "|")
    okSig, err := crypto.VerifyEd25519Signature(pub, []byte(msg), req.Signature)
    if err != nil || !okSig {
        http.Error(w, "invalid signature", http.StatusBadRequest)
        return
    }

    // validate inputs exist and unspent
    var totalIn int64
    for _, id := range req.Inputs {
        // try firestore first
        uDoc, err := db.GetUTXOByID(id)
        if err != nil {
            // fallback to in-memory
            u, exists := utxo.GetUTXO(id)
            if !exists || u.Spent || u.WalletID != req.Sender {
                http.Error(w, "invalid or spent input: "+id, http.StatusBadRequest)
                return
            }
            totalIn += u.Amount
        } else {
            if uDoc.Spent || uDoc.WalletID != req.Sender {
                http.Error(w, "invalid or spent input: "+id, http.StatusBadRequest)
                return
            }
            totalIn += uDoc.Amount
        }
    }
    if totalIn < req.Amount {
        http.Error(w, "insufficient funds", http.StatusBadRequest)
        return
    }

    // create tx id
    h := sha256.New()
    h.Write([]byte(req.Sender))
    h.Write([]byte(req.Receiver))
    h.Write([]byte(strconv.FormatInt(req.Amount, 10)))
    h.Write([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
    txid := hex.EncodeToString(h.Sum(nil))

    // mark inputs spent and create outputs (receiver + change)
    change := totalIn - req.Amount

    // Prepare outputs (in-memory objects)
    outIndex := 0
    u1 := utxo.CreateUTXO(txid, outIndex, req.Receiver, req.Amount)
    outIndex++
    var outputs []*utxo.UTXO
    outputs = append(outputs, u1)
    if change > 0 {
        u2 := utxo.CreateUTXO(txid, outIndex, req.Sender, change)
        outputs = append(outputs, u2)
    }

    txObj := &utxo.Transaction{
        ID:              txid,
        Sender:          req.Sender,
        Receiver:        req.Receiver,
        Amount:          req.Amount,
        Note:            req.Note,
        Timestamp:       time.Now().UTC(),
        SenderPublicKey: req.SenderPublicKey,
        Signature:       []byte(req.Signature),
        Inputs:          req.Inputs,
        Outputs:         []utxo.TxOutput{{Recipient: req.Receiver, Amount: req.Amount}},
    }

    // If Firestore is configured, perform the create/write inside a Firestore transaction
    if db.FSClient != nil {
        if err := db.CreatePendingTxAtomic(txObj, req.Inputs, outputs); err != nil {
            // rollback in-memory creations we made above
            for _, o := range outputs {
                // remove from in-memory UTXO set if present
                // simple removal by marking spent or deleting
                // safest: mark as spent so it won't be used
                _ = utxo.MarkUTXOSpent(o.ID)
            }
            http.Error(w, "failed to persist transaction atomically: "+err.Error(), http.StatusInternalServerError)
            return
        }
        // persist succeeded in Firestore; also update in-memory pending pool and ensure inputs marked
        for _, id := range req.Inputs {
            _ = utxo.MarkUTXOSpent(id)
        }
        utxo.AddPendingTx(txObj)
        json.NewEncoder(w).Encode(map[string]string{"tx_id": txid})
        return
    }

    // Firestore not initialized: fallback to best-effort in-memory + non-transactional persistence
    for _, id := range req.Inputs {
        success := utxo.MarkUTXOSpent(id)
        if !success {
            http.Error(w, "failed to mark input spent: "+id, http.StatusInternalServerError)
            return
        }
    }

    // create outputs in firestore best-effort
    for _, o := range outputs {
        _ = db.CreateUTXO(o)
    }

    utxo.AddPendingTx(txObj)
    _ = db.AddPendingTx(txObj)

    json.NewEncoder(w).Encode(map[string]string{"tx_id": txid})
}

// extend router in server.go to include these handlers
func init() {
    // nothing here; router registration happens in server.NewRouter
}
