package crypto

import (
    "crypto/ed25519"
    "encoding/base64"
)

// VerifyEd25519Signature verifies an Ed25519 signature where the public key and signature
// are provided as base64-encoded strings. Message is raw bytes.
func VerifyEd25519Signature(pubKeyB64 string, message []byte, sigB64 string) (bool, error) {
    pub, err := base64.StdEncoding.DecodeString(pubKeyB64)
    if err != nil {
        return false, err
    }
    sig, err := base64.StdEncoding.DecodeString(sigB64)
    if err != nil {
        return false, err
    }
    if len(pub) != ed25519.PublicKeySize {
        return false, nil
    }
    ok := ed25519.Verify(ed25519.PublicKey(pub), message, sig)
    return ok, nil
}
