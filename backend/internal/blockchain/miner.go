package blockchain

import (
    "crypto/sha256"
    "encoding/hex"
    "strings"
    "time"
)

// DifficultyPrefix returns the target prefix for the hash based on difficulty (number of leading zeros)
func DifficultyPrefix(d int) string {
    return strings.Repeat("0", d)
}

// MineBlock runs a simple PoW loop trying nonces until hash has the required prefix.
// It returns the mined block with Hash and Nonce set.
func MineBlock(b *Block, difficulty int) *Block {
    prefix := DifficultyPrefix(difficulty)
    var nonce int64 = 0
    for {
        b.Nonce = nonce
        b.Timestamp = time.Now().UTC()
        h := b.ComputeHash()
        if strings.HasPrefix(h, prefix) {
            b.Hash = h
            return b
        }
        nonce++
    }
}

// ComputeMerkleRoot placeholder: for now compute hash over concatenated tx IDs
func ComputeMerkleRoot(txIDs []string) string {
    h := sha256.New()
    for _, id := range txIDs {
        h.Write([]byte(id))
    }
    return hex.EncodeToString(h.Sum(nil))
}

// CreateBlock builds a new Block from previous hash and transactions
func CreateBlock(index int64, prevHash string, txIDs []string, difficulty int) *Block {
    b := &Block{
        Index:        index,
        PreviousHash: prevHash,
        Transactions: make([]interface{}, 0),
        MerkleRoot:   ComputeMerkleRoot(txIDs),
    }
    // set transactions as txIDs for now
    for _, t := range txIDs {
        b.Transactions = append(b.Transactions, t)
    }
    return MineBlock(b, difficulty)
}
