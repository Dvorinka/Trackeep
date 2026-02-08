package handlers

import (
	"fmt"
	"strconv"

	"github.com/trackeep/backend/models"
)

// UserContext represents the contextual data available to the AI
type UserContext struct {
	Bookmarks []models.Bookmark
	Tasks     []models.Task
	Files     []models.File
	Notes     []models.Note
}

// buildUserContext gathers user data based on session configuration
func buildUserContext(userID uint, session models.ChatSession) (*UserContext, error) {
	context := &UserContext{}

	// Get bookmarks
	if session.IncludeBookmarks {
		var bookmarks []models.Bookmark
		models.DB.Where("user_id = ?", userID).Limit(20).Order("updated_at desc").Find(&bookmarks)
		context.Bookmarks = bookmarks
	}

	// Get tasks
	if session.IncludeTasks {
		var tasks []models.Task
		models.DB.Where("user_id = ?", userID).Limit(20).Order("updated_at desc").Find(&tasks)
		context.Tasks = tasks
	}

	// Get files
	if session.IncludeFiles {
		var files []models.File
		models.DB.Where("user_id = ?", userID).Limit(20).Order("updated_at desc").Find(&files)
		context.Files = files
	}

	// Get notes
	if session.IncludeNotes {
		var notes []models.Note
		models.DB.Where("user_id = ?", userID).Limit(20).Order("updated_at desc").Find(&notes)
		context.Notes = notes
	}

	return context, nil
}

// buildSystemPrompt creates a system prompt with user context
func buildSystemPrompt(context *UserContext) string {
	prompt := `You are a helpful AI assistant for Trackeep, a personal productivity and knowledge management platform. 
You have access to the user's personal data including bookmarks, tasks, files, and notes. 
Your role is to help them organize, find information, and manage their digital life effectively.

Key capabilities:
- Help find specific bookmarks, tasks, or notes
- Suggest organization strategies
- Answer questions about their saved content
- Help with task planning and prioritization
- Assist with learning progress tracking

Be helpful, concise, and actionable. If you reference specific items, mention their titles or key details.

--- USER DATA ---`

	// Add bookmarks context
	if len(context.Bookmarks) > 0 {
		prompt += "\n\nBOOKMARKS:\n"
		for i, bookmark := range context.Bookmarks {
			if i >= 10 { // Limit to prevent token overflow
				prompt += "... and " + strconv.Itoa(len(context.Bookmarks)-10) + " more bookmarks\n"
				break
			}
			prompt += fmt.Sprintf("- %s: %s", bookmark.Title, bookmark.URL)
			if bookmark.Description != "" {
				prompt += " (" + bookmark.Description + ")"
			}
			if bookmark.IsFavorite {
				prompt += " ⭐"
			}
			prompt += "\n"
		}
	}

	// Add tasks context
	if len(context.Tasks) > 0 {
		prompt += "\n\nTASKS:\n"
		for i, task := range context.Tasks {
			if i >= 10 {
				prompt += "... and " + strconv.Itoa(len(context.Tasks)-10) + " more tasks\n"
				break
			}
			status := string(task.Status)
			priority := string(task.Priority)
			prompt += fmt.Sprintf("- [%s] %s (Priority: %s)", status, task.Title, priority)
			if task.DueDate != nil {
				prompt += " Due: " + task.DueDate.Format("Jan 2")
			}
			prompt += "\n"
		}
	}

	// Add files context
	if len(context.Files) > 0 {
		prompt += "\n\nFILES:\n"
		for i, file := range context.Files {
			if i >= 10 {
				prompt += "... and " + strconv.Itoa(len(context.Files)-10) + " more files\n"
				break
			}
			prompt += fmt.Sprintf("- %s (%s, %s)", file.OriginalName, file.FileType, formatFileSize(file.FileSize))
			if file.Description != "" {
				prompt += " - " + file.Description
			}
			prompt += "\n"
		}
	}

	// Add notes context
	if len(context.Notes) > 0 {
		prompt += "\n\nNOTES:\n"
		for i, note := range context.Notes {
			if i >= 10 {
				prompt += "... and " + strconv.Itoa(len(context.Notes)-10) + " more notes\n"
				break
			}
			prompt += fmt.Sprintf("- %s", note.Title)
			if note.Description != "" {
				prompt += " - " + note.Description
			}
			if note.IsPinned {
				prompt += " 📌"
			}
			prompt += "\n"
		}
	}

	prompt += "\n--- END USER DATA ---\n\nNow respond to the user's message based on this context."
	return prompt
}

// getContextItemIDs extracts IDs from context for tracking
func getContextItemIDs(context *UserContext) []string {
	var ids []string

	for _, bookmark := range context.Bookmarks {
		ids = append(ids, "bookmark:"+strconv.Itoa(int(bookmark.ID)))
	}

	for _, task := range context.Tasks {
		ids = append(ids, "task:"+strconv.Itoa(int(task.ID)))
	}

	for _, file := range context.Files {
		ids = append(ids, "file:"+strconv.Itoa(int(file.ID)))
	}

	for _, note := range context.Notes {
		ids = append(ids, "note:"+strconv.Itoa(int(note.ID)))
	}

	return ids
}

// formatFileSize formats file size in human readable format
func formatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
