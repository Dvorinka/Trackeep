package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/handlers"
	"github.com/trackeep/backend/middleware"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/services"
	"github.com/trackeep/backend/utils"
)

// IsDemoMode checks if demo mode is enabled
func IsDemoMode() bool {
	return os.Getenv("VITE_DEMO_MODE") == "true"
}

// initializeSecuritySecrets sets up JWT and encryption secrets on startup
func initializeSecuritySecrets() error {
	// Initialize JWT secret
	jwtSecret, err := utils.GetOrCreateJWTSecret()
	if err != nil {
		return fmt.Errorf("failed to initialize JWT secret: %w", err)
	}
	os.Setenv("JWT_SECRET", jwtSecret)
	log.Println("JWT secret initialized successfully")

	// Initialize encryption key
	encryptionKey, err := utils.GetOrCreateEncryptionKey()
	if err != nil {
		return fmt.Errorf("failed to initialize encryption key: %w", err)
	}
	os.Setenv("ENCRYPTION_KEY", encryptionKey)
	log.Println("Encryption key initialized successfully")

	return nil
}

var startTime = time.Now()

func main() {
	// Set application version
	os.Setenv("APP_VERSION", "1.0.0")

	// Load environment variables from multiple possible locations
	envPaths := []string{".env", "../.env", "/app/.env"}
	envLoaded := false

	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("Loaded .env from: %s", path)
			envLoaded = true
			break
		}
	}

	if !envLoaded {
		log.Println("No .env file found, using environment variables only")
	}

	// Initialize database (skip in demo mode)
	if !IsDemoMode() {
		config.InitDatabase()
		models.InitDB()
		models.AutoMigrate()
	} else {
		log.Println("Demo mode enabled, skipping database initialization")
	}

	// Initialize security secrets
	if err := initializeSecuritySecrets(); err != nil {
		log.Fatal("Failed to initialize security secrets:", err)
	}

	// Initialize session store
	middleware.InitSessionStore()
	log.Println("Session store initialized successfully")

	// Seed demo data in background
	// go func() {
	//	SeedData()
	// }()

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize router
	r := gin.Default()

	// Middleware
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.SessionMiddleware()) // Add session middleware
	r.Use(middleware.AuditMiddleware())
	r.Use(middleware.InputValidationMiddleware())

	// Initialize rate limiters
	rateLimitConfig := middleware.DefaultRateLimitConfig()
	rateLimiters := middleware.RateLimit(rateLimitConfig)

	// Apply general rate limiting to all endpoints
	r.Use(middleware.GeneralRateLimit(rateLimiters["general"]))

	// CORS middleware - environment-aware
	r.Use(func(c *gin.Context) {
		allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
		ginMode := os.Getenv("GIN_MODE")

		// Default origins based on environment
		if allowedOrigins == "" {
			if ginMode == "release" {
				// Production: no default origins - must be explicitly set
				c.JSON(http.StatusForbidden, gin.H{
					"error":   "CORS not configured for production",
					"message": "Please set CORS_ALLOWED_ORIGINS environment variable",
				})
				c.Abort()
				return
			} else {
				// Development: allow localhost origins
				allowedOrigins = "http://localhost:5173,http://localhost:3000,http://localhost:8080"
			}
		}

		origin := c.Request.Header.Get("Origin")
		allowed := false

		// Handle wildcard origin
		if allowedOrigins == "*" {
			allowed = true
		} else {
			for _, allowedOrigin := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowedOrigin) == origin {
					allowed = true
					break
				}
			}
		}

		if allowed {
			if allowedOrigins == "*" {
				c.Header("Access-Control-Allow-Origin", "*")
			} else {
				c.Header("Access-Control-Allow-Origin", origin)
			}
		}

		// Set other CORS headers
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400") // 24 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Enhanced health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database connection
		db := config.GetDB()
		dbStatus := "connected"
		var dbPingTime time.Duration = 0

		if db == nil {
			dbStatus = "disconnected"
		} else {
			sqlDB, err := db.DB()
			if err != nil {
				dbStatus = "error"
			} else {
				start := time.Now()
				if err := sqlDB.Ping(); err != nil {
					dbStatus = "error"
				} else {
					dbPingTime = time.Since(start)
				}
			}
		}

		// Check session store
		sessionStatus := "ok"
		// Since sessionStore is package-private in middleware, we assume it's initialized
		// if we've reached this point in the code execution

		// Get system stats
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		uptime := time.Since(startTime)

		health := gin.H{
			"status":  "ok",
			"message": "Trackeep API is running",
			"version": "1.0.0",
			"uptime":  uptime.String(),
			"database": gin.H{
				"status":    dbStatus,
				"ping_time": dbPingTime.String(),
			},
			"sessions": gin.H{
				"status": sessionStatus,
			},
			"system": gin.H{
				"goroutines": runtime.NumGoroutine(),
				"memory": gin.H{
					"alloc_mb":       memStats.Alloc / 1024 / 1024,
					"total_alloc_mb": memStats.TotalAlloc / 1024 / 1024,
					"sys_mb":         memStats.Sys / 1024 / 1024,
				},
			},
			"timestamp": gin.H{
				"human": time.Now().Format(time.RFC3339),
				"unix":  time.Now().Unix(),
			},
		}

		// Determine overall health status
		overallStatus := "healthy"
		if dbStatus != "connected" {
			overallStatus = "degraded"
			health["status"] = "degraded"
		}
		if sessionStatus != "ok" {
			overallStatus = "degraded"
			health["status"] = "degraded"
		}

		statusCode := 200
		if overallStatus == "degraded" {
			statusCode = 503
		}

		c.JSON(statusCode, health)
	})

	// Readiness probe endpoint (for Kubernetes/container orchestration)
	r.GET("/ready", func(c *gin.Context) {
		db := config.GetDB()
		if db == nil {
			c.JSON(503, gin.H{"status": "not_ready", "reason": "database_not_connected"})
			return
		}

		sqlDB, err := db.DB()
		if err != nil || sqlDB.Ping() != nil {
			c.JSON(503, gin.H{"status": "not_ready", "reason": "database_ping_failed"})
			return
		}

		// Assume session store is initialized if we're running
		c.JSON(200, gin.H{"status": "ready"})
	})

	// API configuration endpoint for frontend
	r.GET("/api/v1/config", func(c *gin.Context) {
		// Get the current request info to determine base URL
		scheme := "http"
		if c.Request.TLS != nil {
			scheme = "https"
		}

		host := c.Request.Host
		if host == "" {
			// Fallback to environment or localhost
			host = os.Getenv("HOST")
			if host == "" {
				host = "localhost:8080"
			}
		}

		apiURL := fmt.Sprintf("%s://%s/api/v1", scheme, host)

		c.JSON(http.StatusOK, gin.H{
			"api_url":   apiURL,
			"demo_mode": os.Getenv("VITE_DEMO_MODE") == "true",
			"version":   "1.0.0",
		})
	})

	// Liveness probe endpoint (for Kubernetes/container orchestration)
	r.GET("/live", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "alive", "timestamp": time.Now().Unix()})
	})

	// Demo status endpoint
	r.GET("/api/demo/status", handlers.DemoStatus)

	// Update endpoints
	r.GET("/api/updates/check", handlers.CheckForUpdates)
	r.POST("/api/updates/install", handlers.InstallUpdate)
	r.GET("/api/updates/progress", handlers.GetUpdateProgress)
	r.GET("/api/updates/ws", handlers.UpdateProgressWebSocket)

	// Serve static files (frontend)
	r.Static("/assets", "../frontend/dist/assets")
	r.StaticFile("/", "../frontend/dist/index.html")
	r.NoRoute(func(c *gin.Context) {
		c.File("../frontend/dist/index.html")
	})

	// Initialize handlers
	memberHandler := handlers.NewMemberHandler(config.GetDB())
	timeEntryHandler := handlers.NewTimeEntryHandler(config.GetDB())
	calendarHandler := handlers.NewCalendarHandler(config.GetDB())
	integrationHandler := handlers.NewIntegrationHandler(config.GetDB())
	analyticsHandler := handlers.NewAnalyticsHandler(config.GetDB())
	learningProgressHandler := handlers.NewLearningProgressHandler(config.GetDB())
	webScrapingHandler := handlers.NewWebScrapingHandler(config.GetDB())
	knowledgeBaseHandler := handlers.NewKnowledgeBaseHandler(config.GetDB())
	goalsHabitsHandler := handlers.NewGoalsHabitsHandler(config.GetDB())
	socialHandler := handlers.NewSocialHandler(config.GetDB())
	teamsHandler := handlers.NewTeamsHandler(config.GetDB())
	aiRecommendationHandler := handlers.NewAIRecommendationHandler(config.GetDB())
	marketplaceHandler := handlers.NewMarketplaceHandler(config.GetDB())
	communityHandler := handlers.NewCommunityHandler(config.GetDB())
	performanceHandler := handlers.NewPerformanceHandler(config.GetDB())

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Auth routes
		auth := v1.Group("/auth")
		auth.Use(middleware.AuthRateLimit(rateLimiters["auth"]))
		{
			auth.GET("/check-users", handlers.CheckUsers)
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/login-totp", handlers.LoginWithTOTP)
			auth.POST("/logout", handlers.Logout)
			auth.GET("/me", handlers.GetCurrentUserWithGitHub)
			auth.POST("/password-reset", handlers.RequestPasswordReset)
			auth.POST("/password-reset/confirm", handlers.ConfirmPasswordReset)

			// GitHub OAuth routes
			auth.GET("/github", handlers.GitHubLogin)
			auth.GET("/github/callback", handlers.GitHubCallback)
			auth.GET("/oauth/callback", handlers.HandleOAuthCallback)
		}

		// GitHub routes (protected)
		github := v1.Group("/github")
		github.Use(handlers.AuthMiddleware())
		{
			github.GET("/repos", handlers.GetGitHubRepos)
		}

		// Public YouTube search test endpoint (no auth required for testing)
		v1.POST("/youtube-search-test", func(c *gin.Context) {
			var req struct {
				Query      string `json:"query" binding:"required"`
				MaxResults int    `json:"max_results"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			if req.MaxResults <= 0 {
				req.MaxResults = 5
			}

			// Search videos using the YouTube service
			response, err := services.SearchYouTubeVideos(req.Query, req.MaxResults, "")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to search YouTube videos",
					"details": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    response,
			})
		})

		// Protected auth routes (with demo mode protection)
		authProtected := v1.Group("/auth")
		authProtected.Use(handlers.AuthMiddleware())
		authProtected.Use(middleware.DemoModeMiddleware())
		{
			authProtected.PUT("/profile", handlers.UpdateProfile)
			authProtected.PUT("/password", handlers.ChangePassword)

			// 2FA routes
			authProtected.POST("/2fa/setup", handlers.SetupTOTP)
			authProtected.POST("/2fa/verify", handlers.VerifyTOTP)
			authProtected.POST("/2fa/enable", handlers.EnableTOTP)
			authProtected.POST("/2fa/disable", handlers.DisableTOTP)
			authProtected.GET("/2fa/status", handlers.GetTOTPStatus)
			authProtected.POST("/2fa/backup-codes/verify", handlers.VerifyBackupCode)
			authProtected.POST("/2fa/backup-codes/regenerate", handlers.RegenerateBackupCodes)

			// Encryption routes
			authProtected.POST("/encrypt/content", handlers.EncryptNoteContent)
			authProtected.POST("/decrypt/content", handlers.DecryptNoteContent)
			authProtected.GET("/encryption/status", handlers.GetEncryptionStatus)

			// AI Settings routes
			authProtected.GET("/ai/settings", handlers.GetAISettings)
			authProtected.PUT("/ai/settings", handlers.UpdateAISettings)
			authProtected.POST("/ai/test-connection", handlers.TestAIConnection)
		}

		// Test AI settings without auth
		v1.GET("/test-ai-settings", handlers.GetAISettings)

		// Dashboard routes (protected)
		dashboard := v1.Group("/dashboard")
		dashboard.Use(handlers.AuthMiddleware())
		{
			dashboard.GET("/stats", handlers.GetDashboardStats)
		}

		// Bookmark routes (protected)
		bookmarks := v1.Group("/bookmarks")
		bookmarks.Use(handlers.AuthMiddleware())
		bookmarks.Use(middleware.DemoModeMiddleware())
		{
			bookmarks.GET("", handlers.GetBookmarks)
			bookmarks.POST("", handlers.CreateBookmark)
			bookmarks.GET("/:id", handlers.GetBookmark)
			bookmarks.PUT("/:id", handlers.UpdateBookmark)
			bookmarks.DELETE("/:id", handlers.DeleteBookmark)
			bookmarks.POST("/:id/refresh-metadata", handlers.RefreshBookmarkMetadata)
			bookmarks.POST("/metadata", handlers.GetBookmarkMetadata)
			bookmarks.POST("/content", handlers.GetBookmarkContent)
		}

		// Task routes (protected)
		tasks := v1.Group("/tasks")
		tasks.Use(handlers.AuthMiddleware())
		tasks.Use(middleware.DemoModeMiddleware())
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
		files.Use(middleware.DemoModeMiddleware())
		{
			files.GET("", handlers.GetFiles)
			files.POST("/upload", handlers.UploadFile)
			files.GET("/:id", handlers.GetFile)
			files.GET("/:id/download", handlers.DownloadFile)
			files.DELETE("/:id", handlers.DeleteFile)

			// Encrypted files
			files.POST("/upload/encrypted", handlers.UploadEncryptedFile)
			files.GET("/:id/download/encrypted", handlers.DownloadEncryptedFile)
		}

		// Admin routes (admin only)
		admin := v1.Group("/admin")
		admin.Use(handlers.AuthMiddleware())
		admin.Use(handlers.AdminMiddleware())
		{
			// Learning paths management
			admin.GET("/learning-paths", handlers.AdminGetAllLearningPaths)
			admin.PUT("/learning-paths/:id/review", handlers.AdminReviewLearningPath)
			admin.DELETE("/learning-paths/:id", handlers.AdminDeleteLearningPath)

			// User management
			admin.GET("/users", handlers.AdminGetUsers)
			admin.PUT("/users/:id/role", handlers.AdminUpdateUserRole)

			// Admin stats
			admin.GET("/stats", handlers.AdminGetStats)

			// Audit logs
			admin.GET("/audit-logs", handlers.GetAuditLogs)
			admin.GET("/audit-logs/stats", handlers.GetAuditLogStats)
			admin.GET("/audit-logs/:id", handlers.GetAuditLog)
			admin.GET("/audit-logs/export", handlers.ExportAuditLogs)
			admin.DELETE("/audit-logs/cleanup", handlers.CleanupAuditLogs)
		}

		// Learning paths categories endpoint (public)
		v1.GET("/learning-paths/categories", handlers.GetLearningPathCategories)

		// Learning paths routes (protected)
		learningPaths := v1.Group("/learning-paths")
		learningPaths.Use(middleware.DemoModeMiddleware())
		learningPaths.Use(handlers.AuthMiddleware())
		{
			learningPaths.GET("", handlers.GetLearningPaths)
			learningPaths.POST("", handlers.CreateLearningPath)
			learningPaths.GET("/:id", handlers.GetLearningPath)
			learningPaths.PUT("/:id", handlers.UpdateLearningPath)
			learningPaths.DELETE("/:id", handlers.DeleteLearningPath)
			learningPaths.POST("/:id/enroll", handlers.EnrollInLearningPath)
			learningPaths.GET("/:id/courses", handlers.GetLearningPathCourses)
		}

		// Courses routes (protected)
		courses := v1.Group("/courses")
		courses.Use(handlers.AuthMiddleware())
		{
			courses.GET("", handlers.GetCourses)
			courses.GET("/featured", handlers.GetFeaturedCourses)
			courses.GET("/ztm", handlers.GetZTMCourses)
			courses.GET("/categories", handlers.GetCourseCategories)
			courses.POST("/search", handlers.SearchCourses)
			courses.GET("/:id", handlers.GetCourse)
			courses.GET("/slug/:slug", handlers.GetCourseBySlug)
		}

		// Enrollments routes (protected)
		enrollments := v1.Group("/enrollments")
		enrollments.Use(handlers.AuthMiddleware())
		{
			enrollments.GET("", handlers.GetUserEnrollments)
			enrollments.PUT("/:id/progress", handlers.UpdateProgress)
			enrollments.POST("/:id/rate", handlers.RateLearningPath)
		}

		// Notes routes (protected)
		notes := v1.Group("/notes")
		notes.Use(handlers.AuthMiddleware())
		notes.Use(middleware.DemoModeMiddleware())
		{
			notes.GET("", handlers.GetNotes)
			notes.POST("", handlers.CreateNote)
			notes.GET("/:id", handlers.GetNote)
			notes.PUT("/:id", handlers.UpdateNote)
			notes.DELETE("/:id", handlers.DeleteNote)
			notes.GET("/stats", handlers.GetNoteStats)

			// Encrypted notes
			notes.POST("/encrypted", handlers.CreateEncryptedNote)
			notes.GET("/:id/encrypted", handlers.GetEncryptedNote)
		}

		// Chat routes (protected)
		chat := v1.Group("/chat")
		chat.Use(handlers.AuthMiddleware())
		{
			chat.POST("/send", handlers.SendMessage)
			chat.GET("/sessions", handlers.GetSessions)
			chat.GET("/sessions/:id/messages", handlers.GetSessionMessages)
			chat.DELETE("/sessions/:id", handlers.DeleteSession)
		}

		// Member routes (protected)
		members := v1.Group("/members")
		members.Use(handlers.AuthMiddleware())
		{
			members.GET("", memberHandler.GetMembers)
			members.GET("/stats", memberHandler.GetMemberStats)
		}

		// YouTube routes (protected)
		youtube := v1.Group("/youtube")
		youtube.Use(handlers.AuthMiddleware())
		{
			youtube.POST("/search", handlers.SearchYouTube)
			youtube.POST("/video-details", handlers.GetYouTubeVideoDetails)
			youtube.POST("/channel-videos", handlers.GetYouTubeChannelVideos)
			youtube.POST("/channel-from-url", handlers.GetYouTubeChannelVideosFromURL)
			youtube.GET("/trending", handlers.GetYouTubeTrending)
			youtube.GET("/predefined-channels", handlers.GetPredefinedChannelVideos)

			// YouTube Channel routes
			youtube.GET("/fireship", handlers.GetFireshipVideos)
			youtube.GET("/network-chuck", handlers.GetNetworkChuckVideos)
			youtube.POST("/channel", handlers.GetChannelVideos)
		}

		videoBookmarks := v1.Group("/video-bookmarks")
		videoBookmarks.Use(handlers.AuthMiddleware())
		{
			videoBookmarkHandler := handlers.NewVideoBookmarkHandler()
			videoBookmarks.POST("", videoBookmarkHandler.SaveVideoBookmark)
			videoBookmarks.GET("", videoBookmarkHandler.GetUserBookmarks)
			videoBookmarks.GET("/search", videoBookmarkHandler.SearchBookmarks)
			videoBookmarks.GET("/stats", videoBookmarkHandler.GetBookmarkStats)
			videoBookmarks.GET("/:id", videoBookmarkHandler.GetBookmarkByID)
			videoBookmarks.PUT("/:id", videoBookmarkHandler.UpdateBookmark)
			videoBookmarks.DELETE("/:id", videoBookmarkHandler.DeleteBookmark)
			videoBookmarks.POST("/:id/toggle-watched", videoBookmarkHandler.ToggleWatched)
			videoBookmarks.POST("/:id/toggle-favorite", videoBookmarkHandler.ToggleFavorite)
		}

		// Search routes (protected)
		search := v1.Group("/search")
		search.Use(handlers.AuthMiddleware())
		{
			search.POST("/web", handlers.SearchWeb)
			search.POST("/news", handlers.SearchNews)
			search.GET("/suggestions", handlers.GetSearchSuggestions)

			// Enhanced search features
			search.POST("/enhanced", handlers.EnhancedSearch)
			search.POST("/save", handlers.SaveSearch)
			search.GET("/analytics", handlers.GetSearchAnalytics)

			// Saved searches management
			savedSearches := search.Group("/saved")
			{
				savedSearches.POST("", handlers.CreateSavedSearch)
				savedSearches.GET("", handlers.GetUserSavedSearches)
				savedSearches.GET("/:id", handlers.GetSavedSearch)
				savedSearches.PUT("/:id", handlers.UpdateSavedSearch)
				savedSearches.DELETE("/:id", handlers.DeleteSavedSearch)
				savedSearches.POST("/:id/run", handlers.RunSavedSearch)
				savedSearches.GET("/tags", handlers.GetSavedSearchTags)
			}

			// Semantic search features
			search.POST("/semantic", handlers.SemanticSearch)
			search.POST("/embeddings/generate", handlers.GenerateEmbedding)
			search.POST("/reindex", handlers.ReindexContent)
		}

		// Time tracking routes (protected)
		timeEntries := v1.Group("/time-entries")
		timeEntries.Use(handlers.AuthMiddleware())
		timeEntries.Use(middleware.DemoModeMiddleware())
		{
			timeEntries.GET("", timeEntryHandler.GetTimeEntries)
			timeEntries.POST("", timeEntryHandler.CreateTimeEntry)
			timeEntries.GET("/stats", timeEntryHandler.GetTimeStats)
			timeEntries.GET("/:id", timeEntryHandler.GetTimeEntry)
			timeEntries.PUT("/:id", timeEntryHandler.UpdateTimeEntry)
			timeEntries.POST("/:id/stop", timeEntryHandler.StopTimeEntry)
			timeEntries.DELETE("/:id", timeEntryHandler.DeleteTimeEntry)
		}

		// Calendar routes (protected)
		calendar := v1.Group("/calendar")
		calendar.Use(handlers.AuthMiddleware())
		{
			calendar.GET("", calendarHandler.GetEvents)
			calendar.GET("/:id", calendarHandler.GetEvent)
			calendar.POST("", calendarHandler.CreateEvent)
			calendar.PUT("/:id", calendarHandler.UpdateEvent)
			calendar.DELETE("/:id", calendarHandler.DeleteEvent)
			calendar.GET("/upcoming", calendarHandler.GetUpcomingEvents)
			calendar.GET("/today", calendarHandler.GetTodayEvents)
			calendar.GET("/deadlines", calendarHandler.GetDeadlines)
			calendar.PUT("/:id/toggle-complete", calendarHandler.ToggleEventCompletion)
		}

		// AI Features routes (protected)
		ai := v1.Group("/ai")
		ai.Use(handlers.AuthMiddleware())
		{
			// AI providers
			ai.GET("/providers", handlers.GetAIProviders)

			// Content summarization
			ai.POST("/summarize", handlers.SummarizeContent)
			ai.GET("/summaries", handlers.GetAISummaries)

			// Task suggestions
			ai.POST("/tasks/suggest", handlers.GetTaskSuggestions)
			ai.GET("/tasks/suggestions", handlers.GetTaskSuggestionsList)
			ai.POST("/tasks/suggestions/:id/accept", handlers.AcceptTaskSuggestion)
			ai.POST("/tasks/suggestions/:id/dismiss", handlers.DismissTaskSuggestion)

			// Tag suggestions
			ai.POST("/tags/suggest", handlers.GenerateTagSuggestions)

			// Content generation
			ai.POST("/content/generate", handlers.GenerateContent)
		}

		// Integration routes (protected)
		integrations := v1.Group("/integrations")
		integrations.Use(handlers.AuthMiddleware())
		{
			integrations.GET("", integrationHandler.GetIntegrations)
			integrations.POST("", integrationHandler.CreateIntegration)
			integrations.GET("/:id", integrationHandler.GetIntegration)
			integrations.PUT("/:id", integrationHandler.UpdateIntegration)
			integrations.DELETE("/:id", integrationHandler.DeleteIntegration)
			integrations.POST("/:id/authorize", integrationHandler.AuthorizeIntegration)
			integrations.POST("/:id/sync", integrationHandler.SyncIntegration)
			integrations.GET("/:id/sync-logs", integrationHandler.GetSyncLogs)
		}

		// OAuth callback route (public)
		v1.GET("/integrations/oauth/callback", integrationHandler.OAuthCallback)

		// Analytics routes (protected)
		analytics := v1.Group("/analytics")
		analytics.Use(handlers.AuthMiddleware())
		{
			analytics.GET("/dashboard", analyticsHandler.GetDashboardAnalytics)
			analytics.GET("/productivity", analyticsHandler.GetProductivityMetrics)
			analytics.GET("/learning", analyticsHandler.GetLearningAnalytics)
			analytics.GET("/content", analyticsHandler.GetContentAnalytics)
			analytics.GET("/github", analyticsHandler.GetGitHubAnalytics)
			analytics.GET("/goals", analyticsHandler.GetGoals)
			analytics.POST("/goals", analyticsHandler.CreateGoal)
			analytics.PUT("/goals/:id", analyticsHandler.UpdateGoal)
			analytics.DELETE("/goals/:id", analyticsHandler.DeleteGoal)
			analytics.POST("/reports", analyticsHandler.GenerateAnalyticsReport)
			analytics.POST("/generate-daily", analyticsHandler.GenerateDailyAnalytics)
		}

		// Learning progress routes (protected)
		learning := v1.Group("/learning")
		learning.Use(handlers.AuthMiddleware())
		{
			learning.POST("/progress", learningProgressHandler.UpdateLearningProgress)
			learning.GET("/progress", learningProgressHandler.GetLearningProgress)
			learning.GET("/progress/:courseId", learningProgressHandler.GetCourseProgress)
			learning.POST("/progress/:courseId/complete", learningProgressHandler.MarkCourseCompleted)
		}

		// Web scraping routes (protected)
		webScraping := v1.Group("/web-scraping")
		webScraping.Use(handlers.AuthMiddleware())
		{
			// Scraping jobs
			webScraping.POST("/jobs", webScrapingHandler.CreateScrapingJob)
			webScraping.GET("/jobs", webScrapingHandler.GetScrapingJobs)
			webScraping.GET("/jobs/:id", webScrapingHandler.GetScrapingJob)
			webScraping.DELETE("/jobs/:id", webScrapingHandler.DeleteScrapingJob)

			// Scraped content
			webScraping.GET("/content", webScrapingHandler.GetScrapedContentList)
			webScraping.GET("/content/:id", webScrapingHandler.GetScrapedContent)
			webScraping.DELETE("/content/:id", webScrapingHandler.DeleteScrapedContent)
			webScraping.GET("/search", webScrapingHandler.SearchScrapedContent)
		}

		// Knowledge base routes (protected)
		knowledgeBase := v1.Group("/knowledge-base")
		knowledgeBase.Use(handlers.AuthMiddleware())
		{
			// Wiki pages
			knowledgeBase.POST("/pages", knowledgeBaseHandler.CreateWikiPage)
			knowledgeBase.GET("/pages", knowledgeBaseHandler.GetWikiPages)
			knowledgeBase.GET("/pages/search", knowledgeBaseHandler.SearchWikiPages)
			knowledgeBase.GET("/pages/:id", knowledgeBaseHandler.GetWikiPage)
			knowledgeBase.PUT("/pages/:id", knowledgeBaseHandler.UpdateWikiPage)
			knowledgeBase.DELETE("/pages/:id", knowledgeBaseHandler.DeleteWikiPage)

			// Categories
			knowledgeBase.POST("/categories", knowledgeBaseHandler.CreateCategory)
			knowledgeBase.GET("/categories", knowledgeBaseHandler.GetCategories)
		}

		// Goals and habits routes (protected)
		goalsHabits := v1.Group("/goals-habits")
		goalsHabits.Use(handlers.AuthMiddleware())
		{
			// Goals
			goalsHabits.POST("/goals", goalsHabitsHandler.CreateGoal)
			goalsHabits.GET("/goals", goalsHabitsHandler.GetGoals)
			goalsHabits.GET("/goals/:id", goalsHabitsHandler.GetGoal)
			goalsHabits.PUT("/goals/:id", goalsHabitsHandler.UpdateGoal)
			goalsHabits.DELETE("/goals/:id", goalsHabitsHandler.DeleteGoal)

			// Habits
			goalsHabits.POST("/habits", goalsHabitsHandler.CreateHabit)
			goalsHabits.GET("/habits", goalsHabitsHandler.GetHabits)
			goalsHabits.GET("/habits/:id", goalsHabitsHandler.GetHabit)
			goalsHabits.PUT("/habits/:id", goalsHabitsHandler.UpdateHabit)
			goalsHabits.DELETE("/habits/:id", goalsHabitsHandler.DeleteHabit)

			// Habit entries
			goalsHabits.POST("/habit-entries", goalsHabitsHandler.CreateHabitEntry)
			goalsHabits.GET("/habits/:id/entries", goalsHabitsHandler.GetHabitEntries)

			// Dashboard stats
			goalsHabits.GET("/dashboard/stats", goalsHabitsHandler.GetDashboardStats)
		}

		// Social features routes (protected)
		social := v1.Group("/social")
		social.Use(handlers.AuthMiddleware())
		{
			// User profiles
			social.GET("/users/:id", socialHandler.GetProfile)
			social.PUT("/profile", socialHandler.UpdateProfile)
			social.GET("/users/search", socialHandler.SearchUsers)

			// Following system
			social.POST("/users/:id/follow", socialHandler.FollowUser)
			social.GET("/users/:id/followers", socialHandler.GetFollowers)
			social.GET("/users/:id/following", socialHandler.GetFollowing)
		}

		// Team workspaces routes (protected)
		teams := v1.Group("/teams")
		teams.Use(handlers.AuthMiddleware())
		{
			// Team management
			teams.GET("", teamsHandler.GetTeams)
			teams.POST("", teamsHandler.CreateTeam)
			teams.GET("/:id", teamsHandler.GetTeam)
			teams.PUT("/:id", teamsHandler.UpdateTeam)
			teams.DELETE("/:id", teamsHandler.DeleteTeam)

			// Team members
			teams.GET("/:id/members", teamsHandler.GetTeamMembers)
			teams.DELETE("/:id/members/:memberId", teamsHandler.RemoveMember)

			// Team invitations
			teams.POST("/:id/invite", teamsHandler.InviteMember)
			teams.POST("/invitations/:token/accept", teamsHandler.AcceptInvitation)

			// Team activity and stats
			teams.GET("/:id/activity", teamsHandler.GetTeamActivity)
			teams.GET("/:id/stats", teamsHandler.GetTeamStats)
		}

		// AI Recommendations routes (protected)
		recommendations := v1.Group("/recommendations")
		recommendations.Use(handlers.AuthMiddleware())
		{
			recommendations.GET("", aiRecommendationHandler.GetRecommendations)
			recommendations.GET("/stats", aiRecommendationHandler.GetRecommendationStats)
			recommendations.PUT("/preferences", aiRecommendationHandler.UpdatePreferences)
			recommendations.GET("/history", aiRecommendationHandler.GetRecommendationHistory)
			recommendations.GET("/insights", aiRecommendationHandler.GetInsights)
			recommendations.POST("/:id/interaction", aiRecommendationHandler.RecordInteraction)
			recommendations.DELETE("/:id", aiRecommendationHandler.DeleteRecommendation)
		}

		// Marketplace routes (protected)
		marketplace := v1.Group("/marketplace")
		marketplace.Use(handlers.AuthMiddleware())
		{
			// Public marketplace items
			marketplace.GET("/items", marketplaceHandler.GetMarketplaceItems)
			marketplace.GET("/items/:id", marketplaceHandler.GetMarketplaceItem)
			marketplace.GET("/items/:id/reviews", marketplaceHandler.GetMarketplaceReviews)
			marketplace.GET("/stats", marketplaceHandler.GetMarketplaceStats)

			// User's marketplace items
			marketplace.GET("/my-items", marketplaceHandler.GetMyMarketplaceItems)
			marketplace.POST("/items", marketplaceHandler.CreateMarketplaceItem)
			marketplace.PUT("/items/:id", marketplaceHandler.UpdateMarketplaceItem)
			marketplace.DELETE("/items/:id", marketplaceHandler.DeleteMarketplaceItem)

			// Reviews
			marketplace.POST("/items/:id/reviews", marketplaceHandler.CreateMarketplaceReview)

			// Content sharing
			marketplace.GET("/shares", marketplaceHandler.GetMyContentShares)
			marketplace.POST("/shares", marketplaceHandler.CreateContentShare)
			marketplace.DELETE("/shares/:id", marketplaceHandler.DeleteContentShare)
		}

		// Public content sharing routes (no auth required)
		v1.GET("/shared/:token", marketplaceHandler.GetContentShare)

		// Community routes (protected)
		community := v1.Group("/community")
		community.Use(handlers.AuthMiddleware())
		{
			// Challenges
			community.GET("/challenges", communityHandler.GetChallenges)
			community.GET("/challenges/:id", communityHandler.GetChallenge)
			community.POST("/challenges", communityHandler.CreateChallenge)
			community.POST("/challenges/:id/join", communityHandler.JoinChallenge)
			community.PUT("/challenges/:id/progress", communityHandler.UpdateChallengeProgress)
			community.GET("/my-challenges", communityHandler.GetMyChallenges)

			// Mentorship
			community.GET("/mentorship/requests", communityHandler.GetMentorshipRequests)
			community.POST("/mentorship/requests", communityHandler.CreateMentorshipRequest)
			community.PUT("/mentorship/requests/:id/respond", communityHandler.RespondToMentorshipRequest)
			community.GET("/mentorship/my-mentorships", communityHandler.GetMyMentorships)
			community.POST("/mentorship/:id/sessions", communityHandler.CreateMentorshipSession)
			community.GET("/mentorship/:id/sessions", communityHandler.GetMentorshipSessions)

			// Community stats
			community.GET("/stats", communityHandler.GetCommunityStats)
		}

		// Performance routes (admin only)
		performance := v1.Group("/performance")
		performance.Use(handlers.AuthMiddleware())
		performance.Use(handlers.AdminMiddleware())
		{
			performance.GET("/stats", performanceHandler.GetDatabaseStats)
			performance.GET("/monitor", performanceHandler.MonitorPerformance)
			performance.POST("/optimize", performanceHandler.OptimizeDatabase)
			performance.POST("/cleanup-audit-logs", performanceHandler.CleanupOldAuditLogs)
		}
	}

	// Start server with graceful shutdown
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create HTTP server with custom configuration
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Cleanup sessions
	middleware.CleanupSessionsOnShutdown()
	log.Println("Sessions cleaned up")

	// Create a deadline for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	} else {
		log.Println("Server shutdown complete")
	}
}
