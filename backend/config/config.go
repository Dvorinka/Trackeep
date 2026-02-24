package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	App      AppConfig
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type AppConfig struct {
	Version     string
	DemoMode    bool
	GinMode     string
	JWTSecret   string
	CorsOrigins string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:            getEnvWithDefault("PORT", "8080"),
			ReadTimeout:     getDurationEnv("READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getDurationEnv("WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:     getDurationEnv("IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout: getDurationEnv("SHUTDOWN_TIMEOUT", 30*time.Second),
		},
		Database: DatabaseConfig{
			Host:     getEnvWithDefault("DB_HOST", "localhost"),
			Port:     getEnvWithDefault("DB_PORT", "5432"),
			User:     getEnvWithDefault("DB_USER", "trackeep"),
			Password: os.Getenv("DB_PASSWORD"),
			Name:     getEnvWithDefault("DB_NAME", "trackeep"),
			SSLMode:  getEnvWithDefault("DB_SSL_MODE", "disable"),
		},
		App: AppConfig{
			Version:     getEnvWithDefault("APP_VERSION", "1.0.0"),
			DemoMode:    os.Getenv("VITE_DEMO_MODE") == "true",
			GinMode:     getEnvWithDefault("GIN_MODE", "debug"),
			JWTSecret:   os.Getenv("JWT_SECRET"),
			CorsOrigins: getEnvWithDefault("CORS_ALLOWED_ORIGINS", ""),
		},
	}
}

func (c *Config) Validate() error {
	if c.Database.Password == "" && !c.App.DemoMode {
		return fmt.Errorf("DB_PASSWORD environment variable is required")
	}

	if c.App.GinMode == "release" && c.App.CorsOrigins == "" {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS must be set in production mode")
	}

	if c.App.GinMode == "release" && c.App.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET must be set in production mode")
	}

	return nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		c.Database.Host,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.Port,
		c.Database.SSLMode,
	)
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	seconds, err := strconv.Atoi(value)
	if err != nil {
		duration, err := time.ParseDuration(value)
		if err != nil {
			return defaultValue
		}
		return duration
	}

	return time.Duration(seconds) * time.Second
}
