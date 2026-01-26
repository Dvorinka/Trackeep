package main

import (
	"log"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// SeedData creates initial data for testing
func SeedData() {
	db := config.GetDB()

	// Create a demo user
	user := models.User{
		Email:    "demo@trackeep.com",
		Username: "demo",
		Password: "hashed_password_here", // In production, this would be properly hashed
		FullName: "Demo User",
		Theme:    "dark",
	}

	if err := db.Where("email = ?", user.Email).FirstOrCreate(&user).Error; err != nil {
		log.Printf("Failed to create demo user: %v", err)
		return
	}

	// Create some demo tags
	tags := []models.Tag{
		{Name: "development", Color: "#39b9ff", UserID: user.ID},
		{Name: "learning", Color: "#ff6b6b", UserID: user.ID},
		{Name: "productivity", Color: "#51cf66", UserID: user.ID},
		{Name: "golang", Color: "#845ef7", UserID: user.ID},
		{Name: "javascript", Color: "#f76707", UserID: user.ID},
	}

	for _, tag := range tags {
		if err := db.Where("name = ? AND user_id = ?", tag.Name, tag.UserID).FirstOrCreate(&tag).Error; err != nil {
			log.Printf("Failed to create tag %s: %v", tag.Name, err)
		}
	}

	// Create some demo bookmarks
	bookmarks := []models.Bookmark{
		{
			UserID:      user.ID,
			Title:       "Golang Official Documentation",
			URL:         "https://golang.org/doc/",
			Description: "Official Go programming language documentation",
			IsRead:      false,
			IsFavorite:  true,
		},
		{
			UserID:      user.ID,
			Title:       "SolidJS Documentation",
			URL:         "https://www.solidjs.com/docs",
			Description: "Reactive JavaScript library documentation",
			IsRead:      true,
			IsFavorite:  false,
		},
		{
			UserID:      user.ID,
			Title:       "Gin Web Framework",
			URL:         "https://gin-gonic.com/",
			Description: "HTTP web framework written in Go",
			IsRead:      false,
			IsFavorite:  true,
		},
	}

	for _, bookmark := range bookmarks {
		if err := db.Where("url = ? AND user_id = ?", bookmark.URL, bookmark.UserID).FirstOrCreate(&bookmark).Error; err != nil {
			log.Printf("Failed to create bookmark %s: %v", bookmark.Title, err)
		}
	}

	// Create some demo tasks
	tasks := []models.Task{
		{
			UserID:     user.ID,
			Title:      "Complete Trackeep backend API",
			Status:     models.TaskStatusInProgress,
			Priority:   models.TaskPriorityHigh,
			Progress:   75,
		},
		{
			UserID:     user.ID,
			Title:      "Implement authentication system",
			Status:     models.TaskStatusPending,
			Priority:   models.TaskPriorityHigh,
			Progress:   0,
		},
		{
			UserID:     user.ID,
			Title:      "Add file upload functionality",
			Status:     models.TaskStatusPending,
			Priority:   models.TaskPriorityMedium,
			Progress:   0,
		},
		{
			UserID:     user.ID,
			Title:      "Write unit tests for API endpoints",
			Status:     models.TaskStatusPending,
			Priority:   models.TaskPriorityLow,
			Progress:   0,
		},
	}

	for _, task := range tasks {
		if err := db.Where("title = ? AND user_id = ?", task.Title, task.UserID).FirstOrCreate(&task).Error; err != nil {
			log.Printf("Failed to create task %s: %v", task.Title, err)
		}
	}

	// Create some demo notes
	notes := []models.Note{
		{
			UserID:      user.ID,
			Title:       "Trackeep Project Notes",
			Content:     "# Trackeep Project\n\nA self-hosted productivity and knowledge hub built with Go backend and SolidJS frontend.",
			ContentType: "markdown",
			IsPinned:    true,
		},
		{
			UserID:      user.ID,
			Title:       "API Design Principles",
			Content:     "## RESTful API Design\n\n- Use proper HTTP methods\n- Implement proper error handling\n- Add authentication and authorization",
			ContentType: "markdown",
			IsPinned:    false,
		},
	}

	for _, note := range notes {
		if err := db.Where("title = ? AND user_id = ?", note.Title, note.UserID).FirstOrCreate(&note).Error; err != nil {
			log.Printf("Failed to create note %s: %v", note.Title, err)
		}
	}

	log.Println("Demo data seeded successfully")
}
