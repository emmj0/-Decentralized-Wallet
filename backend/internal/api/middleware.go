package api

import (
    "context"
    "net/http"
    "strings"
    "os"

    "github.com/student/decentralized-wallet/internal/db"
)

// RequireAuth is a middleware that validates Firebase ID token from Authorization header.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "authorization required", http.StatusUnauthorized)
            return
        }
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
            http.Error(w, "invalid authorization header", http.StatusUnauthorized)
            return
        }
        idToken := parts[1]
        // verify via firebase auth client
        if db.AuthClient == nil {
            // if not initialized, allow through for local testing (no uid available)
            next.ServeHTTP(w, r)
            return
        }
        token, err := db.AuthClient.VerifyIDToken(context.Background(), idToken)
        if err != nil {
            http.Error(w, "invalid id token", http.StatusUnauthorized)
            return
        }
        // attach uid to request context for downstream handlers
        ctxWithUID := context.WithValue(r.Context(), "uid", token.UID)
        // also attach token claims if available for role checks
        ctxWithClaims := context.WithValue(ctxWithUID, "claims", token.Claims)
        next.ServeHTTP(w, r.WithContext(ctxWithClaims))
    }
}

// RequireAdmin ensures the authenticated user has an admin claim or matches ADMIN_UID env var.
func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // allow through in dev when AuthClient is not configured? Deny by default to be safe.
        if db.AuthClient == nil {
            // if ADMIN_UID is set and matches empty uid, deny
        }
        // extract claims from context
        if claims, ok := r.Context().Value("claims").(map[string]interface{}); ok {
            if adminVal, ok := claims["admin"].(bool); ok && adminVal {
                next.ServeHTTP(w, r)
                return
            }
        }
        // fallback: compare uid to ADMIN_UID env var
        uid, _ := r.Context().Value("uid").(string)
        if uid != "" {
            if adminUID := os.Getenv("ADMIN_UID"); adminUID != "" && adminUID == uid {
                next.ServeHTTP(w, r)
                return
            }
        }
        http.Error(w, "admin required", http.StatusForbidden)
    }
}
