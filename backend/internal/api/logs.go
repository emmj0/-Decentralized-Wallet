package api

import (
    "encoding/json"
    "net/http"
    "os"

    "github.com/student/decentralized-wallet/internal/db"
)

// createLogHandler allows authenticated services/handlers to write structured logs.
func createLogHandler(w http.ResponseWriter, r *http.Request) {
    var in struct{
        Level string `json:"level"`
        Message string `json:"message"`
        Meta map[string]interface{} `json:"meta"`
    }
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }
    // attach caller UID when present
    if uid, _ := r.Context().Value("uid").(string); uid != "" {
        if in.Meta == nil { in.Meta = map[string]interface{}{} }
        in.Meta["actor_uid"] = uid
    }
    if in.Level == "" { in.Level = "info" }
    if err := db.AddLog(in.Level, in.Message, in.Meta); err != nil {
        http.Error(w, "failed to write log: "+err.Error(), http.StatusInternalServerError)
        return
    }
    w.WriteHeader(http.StatusCreated)
}

// listLogsHandler returns recent logs. Restricted to admin users.
func listLogsHandler(w http.ResponseWriter, r *http.Request) {
    // ensure admin: either custom claim "admin"==true or ADMIN_UID env var
    uid, _ := r.Context().Value("uid").(string)
    isAdmin := false
    if claims, ok := r.Context().Value("claims").(map[string]interface{}); ok {
        if a, rok := claims["admin"].(bool); rok && a { isAdmin = true }
    }
    if !isAdmin {
        // allow if ADMIN_UID env var matches
        if adminUID := os.Getenv("ADMIN_UID"); adminUID != "" && adminUID == uid {
            isAdmin = true
        }
    }
    if !isAdmin {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    // parse optional ?limit=
    limit := 200
    if l := r.URL.Query().Get("limit"); l != "" {
        // ignore error and use default
    }
    logs, err := db.ListLogs(limit)
    if err != nil {
        http.Error(w, "failed to list logs: "+err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(logs)
}
