package api

import (
    "encoding/json"
    "net/http"
    "time"

    "github.com/gorilla/mux"
    "github.com/student/decentralized-wallet/internal/db"
)

// userProfile represents the shape persisted for a user profile.
type userProfile struct {
    ID           string   `json:"id"`
    Name         string   `json:"name"`
    CNIC         string   `json:"cnic"`
    Beneficiaries []string `json:"beneficiaries"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

// createUserHandler creates or replaces the authenticated user's profile.
func createUserHandler(w http.ResponseWriter, r *http.Request) {
    // expect authenticated uid in context
    uid, _ := r.Context().Value("uid").(string)
    // For local dev when auth is not configured, allow client-provided id
    if uid == "" {
        // try to accept an id in the body
        var tmp struct{ ID string `json:"id"` }
        _ = json.NewDecoder(r.Body).Decode(&tmp)
        uid = tmp.ID
    }
    if uid == "" {
        http.Error(w, "uid required", http.StatusUnauthorized)
        return
    }
    var in struct{
        Name string `json:"name"`
        CNIC string `json:"cnic"`
        Beneficiaries []string `json:"beneficiaries"`
    }
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }
    u := db.User{
        ID: uid,
        Name: in.Name,
        CNIC: in.CNIC,
        Beneficiaries: in.Beneficiaries,
        CreatedAt: time.Now().UTC(),
        UpdatedAt: time.Now().UTC(),
    }
    if err := db.CreateUser(&u); err != nil {
        http.Error(w, "failed to create user: "+err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(u)
}

// getUserHandler returns a user's profile by id. Only the user themselves may view their profile in this implementation.
func getUserHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    uid, _ := r.Context().Value("uid").(string)
    if uid == "" && db.AuthClient == nil {
        // allow dev access
    } else if uid != id {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    u, err := db.GetUser(id)
    if err != nil {
        http.Error(w, "user not found: "+err.Error(), http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(u)
}

// updateUserHandler updates the authenticated user's profile.
func updateUserHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    uid, _ := r.Context().Value("uid").(string)
    if uid == "" && db.AuthClient == nil {
        // dev mode: allow
    } else if uid != id {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    var in struct{
        Name string `json:"name"`
        CNIC string `json:"cnic"`
        Beneficiaries []string `json:"beneficiaries"`
    }
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }
    u, err := db.GetUser(id)
    if err != nil {
        http.Error(w, "user not found: "+err.Error(), http.StatusNotFound)
        return
    }
    if in.Name != "" { u.Name = in.Name }
    if in.CNIC != "" { u.CNIC = in.CNIC }
    if in.Beneficiaries != nil { u.Beneficiaries = in.Beneficiaries }
    u.UpdatedAt = time.Now().UTC()
    if err := db.UpdateUser(u); err != nil {
        http.Error(w, "failed to update user: "+err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(u)
}

// addBeneficiaryHandler adds a beneficiary wallet ID to the user's list
func addBeneficiaryHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    uid, _ := r.Context().Value("uid").(string)
    if uid == "" && db.AuthClient == nil {
        // dev mode: allow
    } else if uid != id {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    var in struct {
        BeneficiaryWalletID string `json:"beneficiary_wallet_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }
    if in.BeneficiaryWalletID == "" {
        http.Error(w, "beneficiary_wallet_id required", http.StatusBadRequest)
        return
    }
    
    u, err := db.GetUser(id)
    if err != nil {
        http.Error(w, "user not found: "+err.Error(), http.StatusNotFound)
        return
    }
    
    // Check if already in list
    for _, b := range u.Beneficiaries {
        if b == in.BeneficiaryWalletID {
            http.Error(w, "beneficiary already exists", http.StatusBadRequest)
            return
        }
    }
    
    u.Beneficiaries = append(u.Beneficiaries, in.BeneficiaryWalletID)
    u.UpdatedAt = time.Now().UTC()
    if err := db.UpdateUser(u); err != nil {
        http.Error(w, "failed to update user: "+err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "message": "beneficiary added",
        "beneficiaries": u.Beneficiaries,
    })
}

// listBeneficiariesHandler returns the user's beneficiary list
func listBeneficiariesHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    uid, _ := r.Context().Value("uid").(string)
    if uid == "" && db.AuthClient == nil {
        // dev mode: allow
    } else if uid != id {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    
    u, err := db.GetUser(id)
    if err != nil {
        http.Error(w, "user not found: "+err.Error(), http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "beneficiaries": u.Beneficiaries,
    })
}

// removeBeneficiaryHandler removes a beneficiary from the user's list
func removeBeneficiaryHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    uid, _ := r.Context().Value("uid").(string)
    if uid == "" && db.AuthClient == nil {
        // dev mode: allow
    } else if uid != id {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    var in struct {
        BeneficiaryWalletID string `json:"beneficiary_wallet_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }
    if in.BeneficiaryWalletID == "" {
        http.Error(w, "beneficiary_wallet_id required", http.StatusBadRequest)
        return
    }
    
    u, err := db.GetUser(id)
    if err != nil {
        http.Error(w, "user not found: "+err.Error(), http.StatusNotFound)
        return
    }
    
    // Remove beneficiary from list
    newList := []string{}
    found := false
    for _, b := range u.Beneficiaries {
        if b == in.BeneficiaryWalletID {
            found = true
            continue
        }
        newList = append(newList, b)
    }
    
    if !found {
        http.Error(w, "beneficiary not found", http.StatusNotFound)
        return
    }
    
    u.Beneficiaries = newList
    u.UpdatedAt = time.Now().UTC()
    if err := db.UpdateUser(u); err != nil {
        http.Error(w, "failed to update user: "+err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "message": "beneficiary removed",
        "beneficiaries": u.Beneficiaries,
    })
}
