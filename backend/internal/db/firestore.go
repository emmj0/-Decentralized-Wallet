package db

import (
    "context"
    "errors"
    "fmt"
    "os"
    "strconv"
    "sync"
    "time"

    firebase "firebase.google.com/go/v4"
    "firebase.google.com/go/v4/auth"
    "cloud.google.com/go/firestore"
    "google.golang.org/api/option"

    "github.com/student/decentralized-wallet/internal/utxo"
)

var (
    App        *firebase.App
    AuthClient *auth.Client
    FSClient   *firestore.Client
    ctx        context.Context
)

// Logs: in-memory fallback and helpers for server-side logging
type LogRecord struct {
    ID        string                 `json:"id"`
    Level     string                 `json:"level"`
    Message   string                 `json:"message"`
    Meta      map[string]interface{} `json:"meta"`
    CreatedAt time.Time              `json:"created_at"`
}

var (
    logsMu sync.RWMutex
    Logs   = []*LogRecord{}
)

// InitFirebase initializes Firebase app, Auth client and Firestore client.
// It reads service account from env `GOOGLE_APPLICATION_CREDENTIALS` or uses default credentials.
func InitFirebase() error {
    ctx = context.Background()
    var opt option.ClientOption
    // Support either a path via GOOGLE_APPLICATION_CREDENTIALS or raw JSON via SERVICE_ACCOUNT_JSON.
    credPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
    credJSON := os.Getenv("SERVICE_ACCOUNT_JSON")
    if credJSON != "" {
        opt = option.WithCredentialsJSON([]byte(credJSON))
    } else if credPath != "" {
        opt = option.WithCredentialsFile(credPath)
    } else {
        return errors.New("set GOOGLE_APPLICATION_CREDENTIALS (path) or SERVICE_ACCOUNT_JSON (raw JSON) environment variable")
    }

    app, err := firebase.NewApp(ctx, nil, opt)
    if err != nil {
        return fmt.Errorf("failed to create firebase app: %w", err)
    }
    App = app

    authClient, err := app.Auth(ctx)
    if err != nil {
        return fmt.Errorf("failed to init auth client: %w", err)
    }
    AuthClient = authClient

    fs, err := app.Firestore(ctx)
    if err != nil {
        return fmt.Errorf("failed to init firestore client: %w", err)
    }
    FSClient = fs

    // use a long-lived background context for Firestore operations
    ctx = context.Background()
    return nil
}

// RegisterWallet persists a wallet public key to Firestore.
func RegisterWallet(walletID, publicKeyB64 string) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    _, err := FSClient.Collection("wallets").Doc(walletID).Set(ctx, map[string]interface{}{
        "wallet_id": walletID,
        "public_key": publicKeyB64,
        "created_at": time.Now().UTC(),
    })
    return err
}

// CreateUTXO stores a UTXO document in Firestore.
func CreateUTXO(u *utxo.UTXO) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    _, err := FSClient.Collection("utxos").Doc(u.ID).Set(ctx, map[string]interface{}{
        "tx_id": u.TxID,
        "index": u.Index,
        "wallet_id": u.WalletID,
        "amount": u.Amount,
        "spent": u.Spent,
        "created_at": u.CreatedAt,
    })
    return err
}

// GetUnspentUTXOsByWallet returns unspent UTXOs for a wallet.
func GetUnspentUTXOsByWallet(walletID string) ([]utxo.UTXO, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    q := FSClient.Collection("utxos").Where("wallet_id", "==", walletID).Where("spent", "==", false)
    docs, err := q.Documents(ctx).GetAll()
    if err != nil {
        return nil, err
    }
    var res []utxo.UTXO
    for _, d := range docs {
        m := d.Data()
        u := utxo.UTXO{}
        // best-effort mapping with type assertions
        if v, ok := m["tx_id"].(string); ok { u.TxID = v }
        if v, ok := m["index"].(int64); ok { u.Index = int(v) }
        if v, ok := m["wallet_id"].(string); ok { u.WalletID = v }
        if v, ok := m["amount"].(int64); ok { u.Amount = v }
        if v, ok := m["spent"].(bool); ok { u.Spent = v }
        u.ID = d.Ref.ID
        res = append(res, u)
    }
    return res, nil
}

// MarkUTXOSpent updates the spent flag for a utxo doc.
func MarkUTXOSpent(id string) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    _, err := FSClient.Collection("utxos").Doc(id).Update(ctx, []firestore.Update{{Path: "spent", Value: true}})
    return err
}

// GetUTXOByID fetches a utxo document by ID.
func GetUTXOByID(id string) (*utxo.UTXO, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    doc, err := FSClient.Collection("utxos").Doc(id).Get(ctx)
    if err != nil {
        return nil, err
    }
    m := doc.Data()
    u := &utxo.UTXO{
        ID: doc.Ref.ID,
        TxID: m["tx_id"].(string),
        Index: int(m["index"].(int64)),
        WalletID: m["wallet_id"].(string),
        Amount: m["amount"].(int64),
        Spent: m["spent"].(bool),
    }
    return u, nil
}

// AddPendingTx stores a pending transaction.
func AddPendingTx(t *utxo.Transaction) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    _, err := FSClient.Collection("pending_txs").Doc(t.ID).Set(ctx, map[string]interface{}{
        "sender": t.Sender,
        "receiver": t.Receiver,
        "amount": t.Amount,
        "note": t.Note,
        "timestamp": t.Timestamp,
        "sender_public_key": t.SenderPublicKey,
        "inputs": t.Inputs,
        "outputs": t.Outputs,
    })
    return err
}

// CreatePendingTxAtomic performs an atomic transaction that:
// - verifies that each input UTXO exists, is unspent, and belongs to the expected wallet
// - marks each input as spent
// - creates output UTXO documents
// - writes the pending transaction document
// This prevents double-spend races when multiple senders try to spend the same inputs.
func CreatePendingTxAtomic(t *utxo.Transaction, inputIDs []string, outputs []*utxo.UTXO) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }

    // use a background context for the transaction (caller may pass short-lived ctx)
    return FSClient.RunTransaction(context.Background(), func(ctx context.Context, tx *firestore.Transaction) error {
        // 1) Verify and mark inputs spent
        for _, id := range inputIDs {
            docRef := FSClient.Collection("utxos").Doc(id)
            docSnap, err := tx.Get(docRef)
            if err != nil {
                return fmt.Errorf("input utxo not found: %s: %w", id, err)
            }
            m := docSnap.Data()
            // validate wallet ownership and spent flag
            wid, _ := m["wallet_id"].(string)
            spent, _ := m["spent"].(bool)
            if spent {
                return fmt.Errorf("input utxo already spent: %s", id)
            }
            if wid != t.Sender {
                return fmt.Errorf("input utxo does not belong to sender: %s", id)
            }
            // mark spent
            if err := tx.Update(docRef, []firestore.Update{{Path: "spent", Value: true}}); err != nil {
                return fmt.Errorf("failed to mark utxo spent %s: %w", id, err)
            }
        }

        // 2) Create output UTXOs
        for _, out := range outputs {
            docRef := FSClient.Collection("utxos").Doc(out.ID)
            data := map[string]interface{}{
                "tx_id": out.TxID,
                "index": out.Index,
                "wallet_id": out.WalletID,
                "amount": out.Amount,
                "spent": out.Spent,
                "created_at": out.CreatedAt,
            }
            if err := tx.Set(docRef, data); err != nil {
                return fmt.Errorf("failed to create output utxo %s: %w", out.ID, err)
            }
        }

        // 3) Write pending transaction
        pendingRef := FSClient.Collection("pending_txs").Doc(t.ID)
        outMaps := make([]map[string]interface{}, 0, len(t.Outputs))
        for _, o := range t.Outputs {
            outMaps = append(outMaps, map[string]interface{}{"recipient": o.Recipient, "amount": o.Amount})
        }
        pendingData := map[string]interface{}{
            "sender": t.Sender,
            "receiver": t.Receiver,
            "amount": t.Amount,
            "note": t.Note,
            "timestamp": t.Timestamp,
            "sender_public_key": t.SenderPublicKey,
            "inputs": t.Inputs,
            "outputs": outMaps,
        }
        if err := tx.Set(pendingRef, pendingData); err != nil {
            return fmt.Errorf("failed to write pending tx: %w", err)
        }

        return nil
    })
}

// GetWalletPublicKey retrieves a wallet's public key from Firestore.
func GetWalletPublicKey(walletID string) (string, error) {
    if FSClient == nil {
        return "", errors.New("firestore not initialized")
    }
    doc, err := FSClient.Collection("wallets").Doc(walletID).Get(ctx)
    if err != nil {
        return "", err
    }
    m := doc.Data()
    pk, ok := m["public_key"].(string)
    if !ok {
        return "", errors.New("public_key missing or invalid")
    }
    return pk, nil
}

// GetAllPendingTxIDs returns the IDs of all pending transactions.
func GetAllPendingTxIDs() ([]string, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    docs, err := FSClient.Collection("pending_txs").Documents(ctx).GetAll()
    if err != nil {
        return nil, err
    }
    ids := make([]string, 0, len(docs))
    for _, d := range docs {
        ids = append(ids, d.Ref.ID)
    }
    return ids, nil
}

// ListAllWalletIDs returns all wallet document IDs in the wallets collection.
func ListAllWalletIDs() ([]string, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    docs, err := FSClient.Collection("wallets").Documents(ctx).GetAll()
    if err != nil {
        return nil, err
    }
    ids := make([]string, 0, len(docs))
    for _, d := range docs {
        ids = append(ids, d.Ref.ID)
    }
    return ids, nil
}

// User profile storage (supports Firestore when configured, otherwise in-memory map for dev).
type User struct {
    ID string `json:"id"`
    Name string `json:"name"`
    CNIC string `json:"cnic"`
    Beneficiaries []string `json:"beneficiaries"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

var (
    usersMu sync.RWMutex
    Users = map[string]*User{}
)

// CreateUser stores a user profile. Uses Firestore when available.
func CreateUser(u *User) error {
    if FSClient != nil {
        _, err := FSClient.Collection("users").Doc(u.ID).Set(ctx, map[string]interface{}{
            "id": u.ID,
            "name": u.Name,
            "cnic": u.CNIC,
            "beneficiaries": u.Beneficiaries,
            "created_at": u.CreatedAt,
            "updated_at": u.UpdatedAt,
        })
        return err
    }
    usersMu.Lock()
    defer usersMu.Unlock()
    Users[u.ID] = u
    return nil
}

// GetUser retrieves a user profile by id.
func GetUser(id string) (*User, error) {
    if FSClient != nil {
        doc, err := FSClient.Collection("users").Doc(id).Get(ctx)
        if err != nil {
            return nil, err
        }
        m := doc.Data()
        u := &User{ID: id}
        if v, ok := m["name"].(string); ok { u.Name = v }
        if v, ok := m["cnic"].(string); ok { u.CNIC = v }
        if v, ok := m["beneficiaries"].([]interface{}); ok {
            b := make([]string, 0, len(v))
            for _, x := range v {
                if s, ok := x.(string); ok { b = append(b, s) }
            }
            u.Beneficiaries = b
        }
        return u, nil
    }
    usersMu.RLock()
    defer usersMu.RUnlock()
    if u, ok := Users[id]; ok {
        return u, nil
    }
    return nil, errors.New("user not found")
}

// UpdateUser updates an existing user profile.
func UpdateUser(u *User) error {
    if FSClient != nil {
        _, err := FSClient.Collection("users").Doc(u.ID).Set(ctx, map[string]interface{}{
            "id": u.ID,
            "name": u.Name,
            "cnic": u.CNIC,
            "beneficiaries": u.Beneficiaries,
            "updated_at": u.UpdatedAt,
        }, firestore.MergeAll)
        return err
    }
    usersMu.Lock()
    defer usersMu.Unlock()
    Users[u.ID] = u
    return nil
}

// AddZakatRecord stores a zakat deduction record.
func AddZakatRecord(walletID string, amount int64, txID string) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    _, err := FSClient.Collection("zakat_deductions").NewDoc().Set(ctx, map[string]interface{}{
        "wallet_id": walletID,
        "amount": amount,
        "tx_id": txID,
        "created_at": time.Now().UTC(),
    })
    return err
}

// AddLog creates a log record in Firestore when available, otherwise stores in-memory.
func AddLog(level, message string, meta map[string]interface{}) error {
    rec := &LogRecord{
        Level:     level,
        Message:   message,
        Meta:      meta,
        CreatedAt: time.Now().UTC(),
    }
    if FSClient != nil {
        _, _, err := FSClient.Collection("logs").Add(ctx, map[string]interface{}{
            "level": rec.Level,
            "message": rec.Message,
            "meta": rec.Meta,
            "created_at": rec.CreatedAt,
        })
        return err
    }
    logsMu.Lock()
    defer logsMu.Unlock()
    Logs = append(Logs, rec)
    return nil
}

// ListLogs returns recent logs (desc by created_at). Uses Firestore when configured.
func ListLogs(limit int) ([]*LogRecord, error) {
    if limit <= 0 {
        limit = 100
    }
    if FSClient != nil {
        q := FSClient.Collection("logs").OrderBy("created_at", firestore.Desc).Limit(limit)
        docs, err := q.Documents(ctx).GetAll()
        if err != nil {
            return nil, err
        }
        res := make([]*LogRecord, 0, len(docs))
        for _, d := range docs {
            m := d.Data()
            rec := &LogRecord{ID: d.Ref.ID}
            if v, ok := m["level"].(string); ok { rec.Level = v }
            if v, ok := m["message"].(string); ok { rec.Message = v }
            if v, ok := m["meta"].(map[string]interface{}); ok { rec.Meta = v }
            if v, ok := m["created_at"].(time.Time); ok { rec.CreatedAt = v }
            res = append(res, rec)
        }
        return res, nil
    }
    logsMu.RLock()
    defer logsMu.RUnlock()
    n := len(Logs)
    if limit > n { limit = n }
    res := make([]*LogRecord, 0, limit)
    for i := n-1; i >= 0 && len(res) < limit; i-- {
        res = append(res, Logs[i])
    }
    return res, nil
}

// MovePendingToMined moves pending transaction docs into `transactions` collection and deletes pending docs.
func MovePendingToMined(txIDs []string, blockHash string, blockIndex int64) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    for _, id := range txIDs {
        doc, err := FSClient.Collection("pending_txs").Doc(id).Get(ctx)
        if err != nil {
            return err
        }
        data := doc.Data()
        data["block_hash"] = blockHash
        data["block_index"] = blockIndex
        _, err = FSClient.Collection("transactions").Doc(id).Set(ctx, data)
        if err != nil {
            return err
        }
        // delete pending
        _, err = FSClient.Collection("pending_txs").Doc(id).Delete(ctx)
        if err != nil {
            return err
        }
    }
    return nil
}

// AddBlock persists a mined block in Firestore.
func AddBlock(index int64, timestamp time.Time, prevHash, hash, merkle string, txIDs []string) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    _, err := FSClient.Collection("blocks").Doc(strconv.FormatInt(index, 10)).Set(ctx, map[string]interface{}{
        "index": index,
        "timestamp": timestamp,
        "previous_hash": prevHash,
        "hash": hash,
        "merkle_root": merkle,
        // nonce will be added by caller if available
        // store as int64 when provided
        // leaving unset is acceptable
        "transactions": txIDs,
    })
    return err
}

// GetLatestBlock returns the highest-index block stored in Firestore (index and hash).
// If no blocks exist, returns (0, "", nil).
func GetLatestBlock() (int64, string, error) {
    if FSClient == nil {
        return 0, "", errors.New("firestore not initialized")
    }
    // query blocks ordered by index descending, limit 1
    q := FSClient.Collection("blocks").OrderBy("index", firestore.Desc).Limit(1)
    docs, err := q.Documents(ctx).GetAll()
    if err != nil {
        return 0, "", err
    }
    if len(docs) == 0 {
        return 0, "", nil
    }
    m := docs[0].Data()
    // Firestore may store numeric fields as int64 or float64 depending on client library
    var idx int64
    switch v := m["index"].(type) {
    case int64:
        idx = v
    case int:
        idx = int64(v)
    case float64:
        idx = int64(v)
    }
    h, _ := m["hash"].(string)
    return idx, h, nil
}

// GetBlockByIndex retrieves a block document by its index.
func GetBlockByIndex(index int64) (map[string]interface{}, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    doc, err := FSClient.Collection("blocks").Doc(strconv.FormatInt(index, 10)).Get(ctx)
    if err != nil {
        return nil, err
    }
    return doc.Data(), nil
}

// ListBlocks returns recent blocks ordered by index descending limited by `limit`.
func ListBlocks(limit int) ([]map[string]interface{}, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    if limit <= 0 {
        limit = 20
    }
    // Use a request-scoped context with timeout to avoid using a possibly canceled package-level ctx.
    ctxLocal, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    q := FSClient.Collection("blocks").OrderBy("index", firestore.Desc).Limit(limit)
    docs, err := q.Documents(ctxLocal).GetAll()
    if err != nil {
        return nil, err
    }
    res := make([]map[string]interface{}, 0, len(docs))
    for _, d := range docs {
        res = append(res, d.Data())
    }
    return res, nil
}

// GetTransactionByID fetches a mined transaction by ID from `transactions` collection.
func GetTransactionByID(id string) (map[string]interface{}, error) {
    if FSClient == nil {
        return nil, errors.New("firestore not initialized")
    }
    doc, err := FSClient.Collection("transactions").Doc(id).Get(ctx)
    if err != nil {
        return nil, err
    }
    return doc.Data(), nil
}

// AddTransactionRecord persists a transaction document into `transactions` collection.
func AddTransactionRecord(t *utxo.Transaction, blockHash string, blockIndex int64) error {
    if FSClient == nil {
        return errors.New("firestore not initialized")
    }
    data := map[string]interface{}{
        "id": t.ID,
        "sender": t.Sender,
        "receiver": t.Receiver,
        "amount": t.Amount,
        "note": t.Note,
        "timestamp": t.Timestamp,
        "sender_public_key": t.SenderPublicKey,
        "inputs": t.Inputs,
        "outputs": t.Outputs,
        "block_hash": blockHash,
        "block_index": blockIndex,
    }
    _, err := FSClient.Collection("transactions").Doc(t.ID).Set(ctx, data)
    return err
}

// GetAllTransactions fetches all transactions from the transactions collection.
func GetAllTransactions() ([]interface{}, error) {
    if FSClient == nil {
        return []interface{}{}, nil
    }
    docs, err := FSClient.Collection("transactions").Documents(ctx).GetAll()
    if err != nil {
        return nil, err
    }
    result := make([]interface{}, 0, len(docs))
    for _, doc := range docs {
        result = append(result, doc.Data())
    }
    return result, nil
}
