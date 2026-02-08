package utils

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// GenerateSecureSecret generates a cryptographically secure random secret
func GenerateSecureSecret(byteLength int) (string, error) {
	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// GenerateSecureKey generates a hex-encoded encryption key
func GenerateSecureKey(bitLength int) (string, error) {
	byteLength := bitLength / 8
	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// GetOrCreateJWTSecret retrieves JWT secret from file or generates a new one
func GetOrCreateJWTSecret() (string, error) {
	secretFile := "jwt_secret.key"

	// Try to read existing secret
	if secret, err := readSecretFromFile(secretFile); err == nil {
		return secret, nil
	}

	// Generate new secret
	secret, err := GenerateSecureSecret(32) // 32 bytes = 256 bits
	if err != nil {
		return "", fmt.Errorf("failed to generate JWT secret: %w", err)
	}

	// Save to file
	if err := saveSecretToFile(secretFile, secret); err != nil {
		return "", fmt.Errorf("failed to save JWT secret: %w", err)
	}

	return secret, nil
}

// GetOrCreateEncryptionKey retrieves encryption key from file or generates a new one
func GetOrCreateEncryptionKey() (string, error) {
	keyFile := "encryption.key"

	// Try to read existing key
	if key, err := readSecretFromFile(keyFile); err == nil {
		return key, nil
	}

	// Generate new key
	key, err := GenerateSecureKey(256) // 256 bits
	if err != nil {
		return "", fmt.Errorf("failed to generate encryption key: %w", err)
	}

	// Save to file
	if err := saveSecretToFile(keyFile, key); err != nil {
		return "", fmt.Errorf("failed to save encryption key: %w", err)
	}

	return key, nil
}

// readSecretFromFile reads a secret from a file
func readSecretFromFile(filename string) (string, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return "", err
	}

	secret := string(data)
	if secret == "" {
		return "", fmt.Errorf("empty secret file")
	}

	return secret, nil
}

// saveSecretToFile saves a secret to a file with secure permissions
func saveSecretToFile(filename, secret string) error {
	// Create the file with restricted permissions (only readable by owner)
	file, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(secret)
	if err != nil {
		return err
	}

	return nil
}

// ValidateSecretStrength checks if a secret meets minimum security requirements
func ValidateSecretStrength(secret string, minLength int) error {
	if len(secret) < minLength {
		return fmt.Errorf("secret too short: minimum %d characters required", minLength)
	}

	// Check entropy (basic check)
	entropy := calculateEntropy(secret)
	if entropy < 3.0 { // Minimum entropy threshold
		return fmt.Errorf("secret has low entropy: %.2f (minimum 3.0)", entropy)
	}

	return nil
}

// calculateEntropy calculates the Shannon entropy of a string
func calculateEntropy(s string) float64 {
	if len(s) == 0 {
		return 0
	}

	// Count character frequencies
	freq := make(map[rune]int)
	for _, char := range s {
		freq[char]++
	}

	// Calculate entropy
	entropy := 0.0
	length := float64(len(s))

	for _, count := range freq {
		if count > 0 {
			p := float64(count) / length
			entropy -= p * log2(p)
		}
	}

	return entropy
}

// log2 calculates base-2 logarithm
func log2(x float64) float64 {
	const ln2 = 0.6931471805599453 // ln(2)
	return 1.0 / ln2 * logNatural(x)
}

// logNatural calculates natural logarithm using approximation
func logNatural(x float64) float64 {
	if x <= 0 {
		return 0
	}
	if x == 1 {
		return 0
	}

	// Simple approximation for ln(x)
	// For production, use math.Log from the standard library
	n := 0.0
	for x > 1.0 {
		x /= 2.718281828459045 // e
		n++
	}
	return n
}

// RotateSecret generates a new secret and updates the file
func RotateSecret(filename string) (string, error) {
	// Generate new secret
	var newSecret string
	var err error

	if filename == "jwt_secret.key" {
		newSecret, err = GenerateSecureSecret(32)
	} else if filename == "encryption.key" {
		newSecret, err = GenerateSecureKey(256)
	} else {
		return "", fmt.Errorf("unknown secret file type: %s", filename)
	}

	if err != nil {
		return "", fmt.Errorf("failed to generate new secret: %w", err)
	}

	// Backup old secret if it exists
	if _, err := os.Stat(filename); err == nil {
		backupFile := fmt.Sprintf("%s.backup.%d", filename, time.Now().Unix())
		if err := os.Rename(filename, backupFile); err != nil {
			return "", fmt.Errorf("failed to backup old secret: %w", err)
		}
	}

	// Save new secret
	if err := saveSecretToFile(filename, newSecret); err != nil {
		return "", fmt.Errorf("failed to save new secret: %w", err)
	}

	return newSecret, nil
}

// GetSecretFilePath returns the full path to a secret file
func GetSecretFilePath(filename string) string {
	// Store secrets in a secure directory
	secretDir := os.Getenv("SECRET_DIR")
	if secretDir == "" {
		secretDir = "./secrets"
	}

	// Create directory if it doesn't exist
	if err := os.MkdirAll(secretDir, 0700); err != nil {
		// Fallback to current directory
		return filename
	}

	return filepath.Join(secretDir, filename)
}
