package utils

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// GracefulShutdown handles graceful shutdown of the server
type GracefulShutdown struct {
	server          *http.Server
	shutdownTimeout time.Duration
	cleanupFuncs    []func() error
}

// NewGracefulShutdown creates a new graceful shutdown handler
func NewGracefulShutdown(server *http.Server, timeout time.Duration) *GracefulShutdown {
	return &GracefulShutdown{
		server:          server,
		shutdownTimeout: timeout,
		cleanupFuncs:    make([]func() error, 0),
	}
}

// AddCleanupFunc adds a cleanup function to be called during shutdown
func (gs *GracefulShutdown) AddCleanupFunc(fn func() error) {
	gs.cleanupFuncs = append(gs.cleanupFuncs, fn)
}

// Wait waits for shutdown signal and performs graceful shutdown
func (gs *GracefulShutdown) Wait() {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Run cleanup functions
	for i, fn := range gs.cleanupFuncs {
		if err := fn(); err != nil {
			log.Printf("Cleanup function %d failed: %v", i, err)
		}
	}

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), gs.shutdownTimeout)
	defer cancel()

	// Attempt graceful shutdown
	if err := gs.server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	} else {
		log.Println("Server shutdown complete")
	}
}
