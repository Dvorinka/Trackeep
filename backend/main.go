package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/handlers"
	"github.com/trackeep/backend/middleware"
	"github.com/trackeep/backend/models"
)

func main() {
	// Load environment variables from root directory
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database
	config.InitDatabase()
	models.InitDB()
	models.AutoMigrate()

	// Seed demo data
	SeedData()

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize router
	r := gin.Default()

	// Middleware
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database connection
		db := config.GetDB()
		dbStatus := "connected"
		if db == nil {
			dbStatus = "disconnected"
		} else {
			sqlDB, err := db.DB()
			if err != nil || sqlDB.Ping() != nil {
				dbStatus = "error"
			}
		}

		c.JSON(200, gin.H{
			"status":   "ok",
			"message":  "Trackeep API is running",
			"version":  "1.0.0",
			"database": dbStatus,
			"timestamp": gin.H{
				"unix":  gin.H{},
				"human": gin.H{},
			},
		})
	})

	// Metrics endpoint (protected)
	r.GET("/metrics", func(c *gin.Context) {
		metrics := middleware.GetMetrics()
		c.JSON(200, metrics)
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/logout", handlers.Logout)
			auth.GET("/me", handlers.GetCurrentUser)
			auth.PUT("/profile", handlers.UpdateProfile)
			auth.PUT("/password", handlers.ChangePassword)
		}

		// Bookmark routes (protected)
		bookmarks := v1.Group("/bookmarks")
		bookmarks.Use(handlers.AuthMiddleware())
		{
			bookmarks.GET("", handlers.GetBookmarks)
			bookmarks.POST("", handlers.CreateBookmark)
			bookmarks.GET("/:id", handlers.GetBookmark)
			bookmarks.PUT("/:id", handlers.UpdateBookmark)
			bookmarks.DELETE("/:id", handlers.DeleteBookmark)
		}

		// Task routes (protected)
		tasks := v1.Group("/tasks")
		tasks.Use(handlers.AuthMiddleware())
		{
			tasks.GET("", handlers.GetTasks)
			tasks.POST("", handlers.CreateTask)
			tasks.GET("/:id", handlers.GetTask)
			tasks.PUT("/:id", handlers.UpdateTask)
			tasks.DELETE("/:id", handlers.DeleteTask)
		}

		// File routes (protected)
		files := v1.Group("/files")
		files.Use(handlers.AuthMiddleware())
		{
			files.GET("", handlers.GetFiles)
			files.POST("/upload", handlers.UploadFile)
			files.GET("/:id", handlers.GetFile)
			files.GET("/:id/download", handlers.DownloadFile)
			files.DELETE("/:id", handlers.DeleteFile)
		}

		// Notes routes (protected)
		notes := v1.Group("/notes")
		notes.Use(handlers.AuthMiddleware())
		{
			notes.GET("", handlers.GetNotes)
			notes.POST("", handlers.CreateNote)
			notes.GET("/:id", handlers.GetNote)
			notes.PUT("/:id", handlers.UpdateNote)
			notes.DELETE("/:id", handlers.DeleteNote)
			notes.GET("/stats", handlers.GetNoteStats)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// Placeholder handlers - will be implemented with database logic
func registerHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func loginHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func logoutHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func getBookmarksHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func createBookmarkHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func getBookmarkHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func updateBookmarkHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func deleteBookmarkHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func getTasksHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func createTaskHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func getTaskHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func updateTaskHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}

func deleteTaskHandler(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented yet"})
}
