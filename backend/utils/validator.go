package utils

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Validator provides common validation functions
type Validator struct {
	errors map[string]string
}

// NewValidator creates a new validator instance
func NewValidator() *Validator {
	return &Validator{
		errors: make(map[string]string),
	}
}

// Required checks if a field is not empty
func (v *Validator) Required(field, value string) *Validator {
	if strings.TrimSpace(value) == "" {
		v.errors[field] = fmt.Sprintf("%s is required", field)
	}
	return v
}

// MinLength checks if a field meets minimum length
func (v *Validator) MinLength(field, value string, min int) *Validator {
	if utf8.RuneCountInString(value) < min {
		v.errors[field] = fmt.Sprintf("%s must be at least %d characters", field, min)
	}
	return v
}

// MaxLength checks if a field exceeds maximum length
func (v *Validator) MaxLength(field, value string, max int) *Validator {
	if utf8.RuneCountInString(value) > max {
		v.errors[field] = fmt.Sprintf("%s must be at most %d characters", field, max)
	}
	return v
}

// Email checks if a field is a valid email
func (v *Validator) Email(field, value string) *Validator {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(value) {
		v.errors[field] = fmt.Sprintf("%s must be a valid email address", field)
	}
	return v
}

// URL checks if a field is a valid URL
func (v *Validator) URL(field, value string) *Validator {
	urlRegex := regexp.MustCompile(`^https?://[^\s/$.?#].[^\s]*$`)
	if !urlRegex.MatchString(value) {
		v.errors[field] = fmt.Sprintf("%s must be a valid URL", field)
	}
	return v
}

// Match checks if a field matches a regex pattern
func (v *Validator) Match(field, value, pattern, message string) *Validator {
	regex := regexp.MustCompile(pattern)
	if !regex.MatchString(value) {
		v.errors[field] = message
	}
	return v
}

// In checks if a field value is in the allowed values
func (v *Validator) In(field, value string, allowed []string) *Validator {
	for _, allowedValue := range allowed {
		if value == allowedValue {
			return v
		}
	}
	v.errors[field] = fmt.Sprintf("%s must be one of: %s", field, strings.Join(allowed, ", "))
	return v
}

// HasErrors returns true if there are validation errors
func (v *Validator) HasErrors() bool {
	return len(v.errors) > 0
}

// GetErrors returns all validation errors
func (v *Validator) GetErrors() map[string]string {
	return v.errors
}

// GetError returns a specific field error
func (v *Validator) GetError(field string) string {
	return v.errors[field]
}

// Clear clears all validation errors
func (v *Validator) Clear() *Validator {
	v.errors = make(map[string]string)
	return v
}

// ValidatePassword checks password strength
func (v *Validator) ValidatePassword(field, password string) *Validator {
	if len(password) < 8 {
		v.errors[field] = "Password must be at least 8 characters long"
		return v
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)

	errorCount := 0
	if !hasUpper {
		errorCount++
	}
	if !hasLower {
		errorCount++
	}
	if !hasNumber {
		errorCount++
	}
	if !hasSpecial {
		errorCount++
	}

	if errorCount > 1 {
		v.errors[field] = "Password must contain at least 3 of: uppercase, lowercase, number, special character"
	}

	return v
}
