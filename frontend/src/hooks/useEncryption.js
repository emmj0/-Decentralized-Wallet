import { useCallback } from 'react'
import CryptoJS from 'crypto-js'

/**
 * Hook for client-side AES encryption/decryption of sensitive data.
 * Uses a passphrase to derive encryption keys.
 */
export default function useEncryption() {
  /**
   * Encrypt data using AES with a passphrase
   * @param {string} data - The data to encrypt
   * @param {string} passphrase - The passphrase to use for encryption
   * @returns {string} Base64-encoded encrypted data
   */
  const encrypt = useCallback((data, passphrase) => {
    if (!data || !passphrase) {
      throw new Error('Data and passphrase are required for encryption')
    }
    try {
      // Use CryptoJS to encrypt the data
      const encrypted = CryptoJS.AES.encrypt(data, passphrase).toString()
      // Return as base64 for easier storage
      return btoa(encrypted)
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message)
    }
  }, [])

  /**
   * Decrypt data using AES with a passphrase
   * @param {string} encryptedData - Base64-encoded encrypted data
   * @param {string} passphrase - The passphrase to use for decryption
   * @returns {string} The decrypted data
   */
  const decrypt = useCallback((encryptedData, passphrase) => {
    if (!encryptedData || !passphrase) {
      throw new Error('Encrypted data and passphrase are required for decryption')
    }
    try {
      // Decode from base64
      const decoded = atob(encryptedData)
      // Decrypt using CryptoJS
      const decrypted = CryptoJS.AES.decrypt(decoded, passphrase)
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8)
      if (!plaintext) {
        throw new Error('Decryption failed: invalid passphrase or corrupted data')
      }
      return plaintext
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message)
    }
  }, [])

  return { encrypt, decrypt }
}
