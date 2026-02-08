package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"os"
)

// GetEncryptionKey returns the encryption key from environment
func GetEncryptionKey() ([]byte, error) {
	key := os.Getenv("ENCRYPTION_KEY")
	if key == "" {
		return nil, fmt.Errorf("ENCRYPTION_KEY environment variable not set")
	}

	// Hash the key to ensure it's exactly 32 bytes for AES-256
	hash := sha256.Sum256([]byte(key))
	return hash[:], nil
}

// Encrypt encrypts plaintext using AES-GCM
func Encrypt(plaintext string) (string, error) {
	key, err := GetEncryptionKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-GCM
func Decrypt(ciphertext string) (string, error) {
	key, err := GetEncryptionKey()
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext_bytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext_bytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// EncryptFile encrypts file content and returns the encrypted data
func EncryptFile(content []byte) ([]byte, error) {
	key, err := GetEncryptionKey()
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Prepend nonce to encrypted content
	encrypted := gcm.Seal(nonce, nonce, content, nil)
	return encrypted, nil
}

// DecryptFile decrypts file content
func DecryptFile(encryptedContent []byte) ([]byte, error) {
	key, err := GetEncryptionKey()
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(encryptedContent) < nonceSize {
		return nil, fmt.Errorf("encrypted content too short")
	}

	nonce, ciphertext := encryptedContent[:nonceSize], encryptedContent[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

// IsEncrypted checks if content appears to be encrypted (base64 encoded)
func IsEncrypted(content string) bool {
	// Simple check: try to base64 decode and see if it looks like encrypted content
	_, err := base64.StdEncoding.DecodeString(content)
	return err == nil && len(content) > 32 // Encrypted content should be longer than 32 chars
}

// GenerateEncryptionKey generates a new random encryption key
func GenerateEncryptionKey() (string, error) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(key), nil
}
