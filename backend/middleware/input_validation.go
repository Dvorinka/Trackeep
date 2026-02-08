package middleware

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
)

// InputValidationMiddleware provides comprehensive input validation
func InputValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate query parameters
		for key, values := range c.Request.URL.Query() {
			for i, value := range values {
				if containsMaliciousContent(value) {
					c.JSON(http.StatusBadRequest, gin.H{
						"error":     "Invalid input detected",
						"message":   "Query parameter contains potentially malicious content",
						"parameter": key,
					})
					c.Abort()
					return
				}
				// Sanitize query parameters
				values[i] = sanitizeInput(value)
			}
		}

		// For POST/PUT requests, we'll validate the body in the handler
		// since we need to know the expected structure

		c.Next()
	}
}

// ValidateRequestBody validates JSON request bodies against common attack patterns
func ValidateRequestBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "GET" || c.Request.Method == "DELETE" {
			c.Next()
			return
		}

		// Read and validate the body
		bodyBytes, err := c.GetRawData()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			c.Abort()
			return
		}

		bodyString := string(bodyBytes)

		// Check for common injection patterns
		if containsMaliciousContent(bodyString) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid input detected",
				"message": "Request body contains potentially malicious content",
			})
			c.Abort()
			return
		}

		// Restore the body for subsequent handlers
		c.Request.Body = &requestBody{body: bodyBytes}
		c.Next()
	}
}

// requestBody is a custom type to restore the request body
type requestBody struct {
	body []byte
	pos  int
}

func (rb *requestBody) Read(p []byte) (int, error) {
	if rb.pos >= len(rb.body) {
		return 0, nil
	}
	n := copy(p, rb.body[rb.pos:])
	rb.pos += n
	return n, nil
}

func (rb *requestBody) Close() error {
	return nil
}

// containsMaliciousContent checks for common attack patterns
func containsMaliciousContent(input string) bool {
	// Convert to lowercase for case-insensitive matching
	lowerInput := strings.ToLower(input)

	// SQL injection patterns
	sqlPatterns := []string{
		"union select",
		"drop table",
		"insert into",
		"delete from",
		"update set",
		"exec(",
		"execute(",
		"sp_executesql",
		"xp_cmdshell",
		"'--",
		"/*",
		"*/",
		"char(",
		"ascii(",
		"concat(",
		"substring(",
		"waitfor delay",
		"benchmark(",
		"sleep(",
		"pg_sleep(",
	}

	for _, pattern := range sqlPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	// XSS patterns
	xssPatterns := []string{
		"<script",
		"</script>",
		"javascript:",
		"vbscript:",
		"onload=",
		"onerror=",
		"onclick=",
		"onmouseover=",
		"onfocus=",
		"onblur=",
		"onchange=",
		"onsubmit=",
		"<iframe",
		"<object",
		"<embed",
		"<form",
		"<input",
		"<link",
		"<meta",
		"<style",
		"eval(",
		"alert(",
		"confirm(",
		"prompt(",
		"document.cookie",
		"document.write",
		"window.location",
	}

	for _, pattern := range xssPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	// Command injection patterns
	cmdPatterns := []string{
		"; rm",
		"; cat",
		"; ls",
		"; ps",
		"; kill",
		"; chmod",
		"; chown",
		"; wget",
		"; curl",
		"; nc",
		"; netcat",
		"| rm",
		"| cat",
		"| ls",
		"| ps",
		"& rm",
		"& cat",
		"& ls",
		"&& rm",
		"&& cat",
		"&& ls",
		"`rm",
		"`cat",
		"`ls",
		"$(rm",
		"$(cat",
		"$(ls",
	}

	for _, pattern := range cmdPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	// Path traversal patterns
	pathPatterns := []string{
		"../",
		"..\\",
		"%2e%2e%2f",
		"%2e%2e\\",
		"..%2f",
		"..%5c",
		"%2e%2e/",
		"%2e%2e\\",
		"/etc/passwd",
		"/etc/shadow",
		"/etc/hosts",
		"windows/system32",
		"\\windows\\system32",
	}

	for _, pattern := range pathPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	// LDAP injection patterns
	ldapPatterns := []string{
		"*)(",
		"*}",
		"*)",
		"*(|",
		"*(|",
		"*)(",
	}

	for _, pattern := range ldapPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	// NoSQL injection patterns
	nosqlPatterns := []string{
		"$where",
		"$ne",
		"$gt",
		"$lt",
		"$regex",
		"$expr",
		"$json",
		"$or",
		"$and",
		"$not",
	}

	for _, pattern := range nosqlPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	return false
}

// sanitizeInput cleans input by removing potentially dangerous characters
func sanitizeInput(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")

	// Remove control characters except newline, tab, and carriage return
	var result []rune
	for _, r := range input {
		if unicode.IsControl(r) && r != '\n' && r != '\t' && r != '\r' {
			continue
		}
		result = append(result, r)
	}

	// Trim whitespace
	input = strings.TrimSpace(string(result))

	return input
}

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// ValidatePassword validates password strength
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return gin.Error{
			Err:  http.ErrBodyNotAllowed,
			Type: gin.ErrorTypeBind,
			Meta: "Password must be at least 8 characters long",
		}
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit || !hasSpecial {
		return gin.Error{
			Err:  http.ErrBodyNotAllowed,
			Type: gin.ErrorTypeBind,
			Meta: "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
		}
	}

	return nil
}

// ValidateUsername validates username format
func ValidateUsername(username string) error {
	if len(username) < 3 || len(username) > 30 {
		return gin.Error{
			Err:  http.ErrBodyNotAllowed,
			Type: gin.ErrorTypeBind,
			Meta: "Username must be between 3 and 30 characters long",
		}
	}

	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !usernameRegex.MatchString(username) {
		return gin.Error{
			Err:  http.ErrBodyNotAllowed,
			Type: gin.ErrorTypeBind,
			Meta: "Username can only contain letters, numbers, underscores, and hyphens",
		}
	}

	return nil
}

// ValidateID validates that ID is a positive integer
func ValidateID(id string) error {
	idRegex := regexp.MustCompile(`^[1-9]\d*$`)
	if !idRegex.MatchString(id) {
		return gin.Error{
			Err:  http.ErrBodyNotAllowed,
			Type: gin.ErrorTypeBind,
			Meta: "Invalid ID format",
		}
	}

	return nil
}

// ValidatePagination validates pagination parameters
func ValidatePagination(page, limit string) (int, int, error) {
	pageInt := 1
	limitInt := 20

	if page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			pageInt = p
		}
	}

	if limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			limitInt = l
		}
	}

	return pageInt, limitInt, nil
}
