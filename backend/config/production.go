package config

import (
	"time"
)

// ProductionConfig holds production-specific configuration
type ProductionConfig struct {
	// Database connection pooling
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration

	// Rate limiting
	EnableRateLimiting bool
	RateLimitPerMinute int

	// Logging
	LogLevel      string
	EnableMetrics bool

	// Security
	EnableCSRF       bool
	SecureCookies    bool
	HTTPSOnly        bool
	HSTSMaxAge       int
	ContentSecPolicy string

	// Performance
	EnableGzip        bool
	EnableCaching     bool
	CacheTTL          time.Duration
	EnableCompression bool

	// Monitoring
	EnableHealthChecks bool
	HealthCheckPath    string
	MetricsPath        string
}

// DefaultProductionConfig returns default production configuration
func DefaultProductionConfig() ProductionConfig {
	return ProductionConfig{
		// Database
		MaxOpenConns:    25,
		MaxIdleConns:    10,
		ConnMaxLifetime: time.Hour,
		ConnMaxIdleTime: 10 * time.Minute,

		// Rate limiting
		EnableRateLimiting: true,
		RateLimitPerMinute: 60,

		// Logging
		LogLevel:      "info",
		EnableMetrics: true,

		// Security
		EnableCSRF:       true,
		SecureCookies:    true,
		HTTPSOnly:        true,
		HSTSMaxAge:       31536000, // 1 year
		ContentSecPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",

		// Performance
		EnableGzip:        true,
		EnableCaching:     true,
		CacheTTL:          5 * time.Minute,
		EnableCompression: true,

		// Monitoring
		EnableHealthChecks: true,
		HealthCheckPath:    "/health",
		MetricsPath:        "/metrics",
	}
}
