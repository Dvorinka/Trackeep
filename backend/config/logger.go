package config

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Logger *zap.Logger

// InitLogger initializes the Zap logger
func InitLogger() {
	// Get log level from environment
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	// Parse log level
	var level zapcore.Level
	switch logLevel {
	case "debug":
		level = zapcore.DebugLevel
	case "info":
		level = zapcore.InfoLevel
	case "warn":
		level = zapcore.WarnLevel
	case "error":
		level = zapcore.ErrorLevel
	default:
		level = zapcore.InfoLevel
	}

	// Check if we're in production mode
	isProduction := os.Getenv("GIN_MODE") == "release"

	// Configure encoder
	var encoder zapcore.Encoder
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "timestamp"
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

	if isProduction {
		encoder = zapcore.NewJSONEncoder(encoderConfig)
	} else {
		encoder = zapcore.NewConsoleEncoder(encoderConfig)
	}

	// Configure output
	writeSyncer := zapcore.AddSync(os.Stdout)

	// Create core
	core := zapcore.NewCore(encoder, writeSyncer, level)

	// Create logger
	Logger = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	// Replace global logger
	zap.ReplaceGlobals(Logger)

	Logger.Info("Logger initialized",
		zap.String("level", logLevel),
		zap.Bool("production", isProduction),
	)
}

// GetLogger returns the configured logger instance
func GetLogger() *zap.Logger {
	if Logger == nil {
		// Fallback to default logger if not initialized
		logger, _ := zap.NewProduction()
		return logger
	}
	return Logger
}

// SyncLogger flushes any buffered log entries
func SyncLogger() {
	if Logger != nil {
		_ = Logger.Sync()
	}
}
