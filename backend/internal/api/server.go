package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/student/decentralized-wallet/internal/blockchain"
	"github.com/student/decentralized-wallet/internal/db"
	"github.com/student/decentralized-wallet/internal/utxo"
)

// NewRouter returns an http.Handler with the API routes registered.
func NewRouter() http.Handler {
	r := mux.NewRouter()

	// Simple CORS middleware: allow typical dev origins and handle preflight
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow all origins for dev; in production, lock this down to your domain
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	})
	// OPTIONS preflight handler for any path to avoid mux returning 405 for OPTIONS
	r.HandleFunc("/{any:.*}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusNoContent)
	}).Methods("OPTIONS")

	r.HandleFunc("/api/status", statusHandler).Methods("GET")
	r.HandleFunc("/api/debug/state", debugStateHandler).Methods("GET")
	r.HandleFunc("/api/blocks", blocksHandler).Methods("GET")
	r.HandleFunc("/api/blocks/{index}", blockDetailHandler).Methods("GET")
	r.HandleFunc("/api/txs/{id}", txHandler).Methods("GET")
	r.HandleFunc("/api/wallets/{id}", walletHandler).Methods("GET")
	r.HandleFunc("/api/wallets/register", RequireAuth(registerWalletHandler)).Methods("POST")
	r.HandleFunc("/api/tx/send", RequireAuth(sendTxHandler)).Methods("POST")
	// User profile endpoints
	r.HandleFunc("/api/users", RequireAuth(createUserHandler)).Methods("POST")
	r.HandleFunc("/api/users/{id}", RequireAuth(getUserHandler)).Methods("GET")
	r.HandleFunc("/api/users/{id}", RequireAuth(updateUserHandler)).Methods("PUT")
	// Admin endpoints
	r.HandleFunc("/api/admin/mine", RequireAdmin(adminMineHandler)).Methods("POST")
	r.HandleFunc("/api/admin/zakat", RequireAdmin(adminZakatHandler)).Methods("POST")
	r.HandleFunc("/api/admin/validate_chain", RequireAdmin(validateChainHandler)).Methods("POST")
	r.HandleFunc("/api/admin/fund", RequireAdmin(adminFundHandler)).Methods("POST")
	// One-time bootstrap: set admin claim using server-side INITIAL_ADMIN_TOKEN
	r.HandleFunc("/api/admin/make_admin", makeAdminHandler).Methods("POST")

	// Logs
	r.HandleFunc("/api/logs", RequireAuth(createLogHandler)).Methods("POST")
	r.HandleFunc("/api/admin/logs", RequireAuth(listLogsHandler)).Methods("GET")
	return r
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]interface{}{
		"status":        "ok",
		"time":          time.Now().UTC(),
		"pending_txs":   0,
		"chain_tip":     nil,
		"difficulty":    "00000",
		"firestore_enabled": db.FSClient != nil,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// debugStateHandler returns in-memory UTXO and pending tx state when Firestore is not configured.
// This is a development helper and should not be enabled in production.
func debugStateHandler(w http.ResponseWriter, r *http.Request) {
	if db.FSClient != nil {
		http.Error(w, "firestore configured — debug state unavailable", http.StatusServiceUnavailable)
		return
	}
	// return utxo set and pending txs from in-memory packages
	type debugResp struct{
		UTXOSet interface{} `json:"utxo_set"`
		Pending interface{} `json:"pending_txs"`
	}
	resp := debugResp{
		UTXOSet: utxo.UTXOSet,
		Pending: utxo.PendingTxs,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func blocksHandler(w http.ResponseWriter, r *http.Request) {
	// list recent blocks (limit optional via ?limit)
	limit := 20
	if v := r.URL.Query().Get("limit"); v != "" {
		// best-effort parse
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	if db.FSClient != nil {
		blks, err := db.ListBlocks(limit)
		if err != nil {
			http.Error(w, "failed to list blocks: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(blks)
		return
	}
	// fallback: no persisted blocks
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}

func blockDetailHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idxStr := vars["index"]
	i64, err := strconv.ParseInt(idxStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid index", http.StatusBadRequest)
		return
	}
	if db.FSClient != nil {
		b, err := db.GetBlockByIndex(i64)
		if err != nil {
			http.Error(w, "block not found: "+err.Error(), http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(b)
		return
	}
	http.Error(w, "firestore not configured", http.StatusServiceUnavailable)
}

func txHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if db.FSClient != nil {
		t, err := db.GetTransactionByID(id)
		if err != nil {
			http.Error(w, "tx not found: "+err.Error(), http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(t)
		return
	}
	http.Error(w, "firestore not configured", http.StatusServiceUnavailable)
}

// validateChainHandler runs lightweight validation over stored blocks: merkle root recompute and previous_hash linking.
func validateChainHandler(w http.ResponseWriter, r *http.Request) {
	if db.FSClient == nil {
		http.Error(w, "firestore not configured", http.StatusServiceUnavailable)
		return
	}
	// fetch many blocks (limit 1000 for safety)
	blks, err := db.ListBlocks(1000)
	if err != nil {
		http.Error(w, "failed to fetch blocks: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// blocks returned in desc order; reverse to ascend
	for i, j := 0, len(blks)-1; i < j; i, j = i+1, j-1 {
		blks[i], blks[j] = blks[j], blks[i]
	}
	// iterate and validate links
	var prevHash string
	problems := []string{}
	for _, b := range blks {
		// check merkle root vs recomputed
		txsIface, _ := b["transactions"].([]interface{})
		txIDs := make([]string, 0, len(txsIface))
		for _, t := range txsIface {
			if s, ok := t.(string); ok {
				txIDs = append(txIDs, s)
			}
		}
		recomputed := blockchain.ComputeMerkleRoot(txIDs)
		if mr, _ := b["merkle_root"].(string); mr != recomputed {
			problems = append(problems, "merkle root mismatch for index: "+fmt.Sprint(b["index"]))
		}
		if ph, _ := b["previous_hash"].(string); ph != prevHash && prevHash != "" {
			problems = append(problems, "previous_hash mismatch at index: "+fmt.Sprint(b["index"]))
		}
		if h, _ := b["hash"].(string); h == "" {
			problems = append(problems, "missing hash at index: "+fmt.Sprint(b["index"]))
		}
		prevHash, _ = b["hash"].(string)
	}
	resp := map[string]interface{}{"ok": len(problems) == 0, "problems": problems}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func walletHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	balance := utxo.WalletBalance(id)
	// gather UTXOs
	var list []interface{}
	// quick scan (in-memory)
	for _, u := range utxo.UTXOSet {
		if u.WalletID == id && !u.Spent {
			list = append(list, u)
		}
	}
	resp := map[string]interface{}{
		"wallet_id": id,
		"balance":   balance,
		"utxos":     list,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
