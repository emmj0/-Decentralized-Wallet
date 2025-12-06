package blockchain

import (
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"time"
)

// Block represents a simple block in the chain.
type Block struct {
	Index        int64         `json:"index"`
	Timestamp    time.Time     `json:"timestamp"`
	Transactions []interface{} `json:"transactions"`
	PreviousHash string        `json:"previous_hash"`
	Nonce        int64         `json:"nonce"`
	Hash         string        `json:"hash"`
	MerkleRoot   string        `json:"merkle_root"`
}

// ComputeHash computes SHA-256 of the block header fields.
func (b *Block) ComputeHash() string {
	data := []byte("")
	data = append(data, []byte(b.PreviousHash)...)
	data = append(data, []byte(b.Timestamp.UTC().Format(time.RFC3339Nano))...)
	data = append(data, []byte(b.MerkleRoot)...)
	data = append(data, []byte(strconv.FormatInt(b.Index, 10))...)
	data = append(data, []byte(strconv.FormatInt(b.Nonce, 10))...)
	
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}
