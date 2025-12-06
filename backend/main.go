package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/student/decentralized-wallet/internal/api"
	"github.com/student/decentralized-wallet/internal/db"
)

// initFirestoreFromEnv decodes FIREBASE_JSON_B64 and sets GOOGLE_APPLICATION_CREDENTIALS for Fly.io deployment
func initFirestoreFromEnv() error {
	fbJsonB64 := os.Getenv("FIREBASE_JSON_B64")
	if fbJsonB64 == "" {
		// dev mode or file-based credentials (GOOGLE_APPLICATION_CREDENTIALS already set)
		return nil
	}
	data, err := base64.StdEncoding.DecodeString(fbJsonB64)
	if err != nil {
		return fmt.Errorf("failed to decode FIREBASE_JSON_B64: %w", err)
	}
	tmpFile := filepath.Join(os.TempDir(), "firebase.json")
	if err := os.WriteFile(tmpFile, data, 0600); err != nil {
		return fmt.Errorf("failed to write firebase.json: %w", err)
	}
	os.Setenv("GOOGLE_APPLICATION_CREDENTIALS", tmpFile)
	return nil
}

func main() {
	// Decode Firebase credentials if provided via Fly.io secret
	if err := initFirestoreFromEnv(); err != nil {
		log.Printf("Firebase env setup warning: %v -- trying default credentials", err)
	}

	addr := ":8080"
	if v := os.Getenv("PORT"); v != "" {
		addr = ":" + v
	}

	// initialize Firebase / Firestore if credentials are provided
	if err := db.InitFirebase(); err != nil {
		log.Printf("Firestore init warning: %v -- continuing with in-memory stores", err)
	} else {
		// ensure firestore client closed on exit
		defer func() {
			if db.FSClient != nil {
				_ = db.FSClient.Close()
			}
		}()
	}

	handler := api.NewRouter()
	// start zakat scheduler (daily check) in background
	go func() {
		for {
			// check once per day
			now := time.Now().UTC()
			// run on 1st of month at 00:00 UTC (if close enough)
			if now.Day() == 1 && now.Hour() == 0 {
				// trigger zakat via admin handler logic directly
				zakatPool := os.Getenv("ZAKAT_POOL_WALLET_ID")
				if zakatPool != "" {
					// call compute for each wallet
					wallets, err := db.ListAllWalletIDs()
					if err == nil {
						for _, w := range wallets {
							_, _ = api.ComputeZakatForWallet(w, zakatPool)
						}
					}
				}
				// sleep longer after processing
				time.Sleep(6 * time.Hour)
			}
			time.Sleep(1 * time.Hour)
		}
	}()
	log.Printf("Starting backend server on %s\n", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}
