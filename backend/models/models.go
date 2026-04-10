package models

import (
	"fmt"
	"log"

	"github.com/trackeep/backend/config"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// DB is the global database instance
var DB *gorm.DB

// InitDB initializes the global database variable
func InitDB() {
	DB = config.GetDB()
}

func tableHasColumn(db *gorm.DB, tableName, columnName string) (bool, error) {
	var count int64
	err := db.Raw(
		`SELECT count(*)
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = ?
		  AND column_name = ?`,
		tableName,
		columnName,
	).Scan(&count).Error
	return count > 0, err
}

func tableExists(db *gorm.DB, tableName string) (bool, error) {
	var count int64
	err := db.Raw(
		`SELECT count(*)
		FROM information_schema.tables
		WHERE table_schema = current_schema()
		  AND table_name = ?`,
		tableName,
	).Scan(&count).Error
	return count > 0, err
}

func repairLegacyBootstrapSchema(db *gorm.DB) error {
	if db == nil {
		return nil
	}

	usersTableExists, err := tableExists(db, "users")
	if err != nil {
		return err
	}
	if !usersTableExists {
		return nil
	}

	hasLegacyPasswordHash, err := tableHasColumn(db, "users", "password_hash")
	if err != nil {
		return err
	}
	if !hasLegacyPasswordHash {
		return nil
	}

	hasCurrentPasswordColumn, err := tableHasColumn(db, "users", "password")
	if err != nil {
		return err
	}
	if hasCurrentPasswordColumn {
		return nil
	}

	var userCount int64
	if err := db.Table("users").Count(&userCount).Error; err != nil {
		return err
	}
	if userCount > 0 {
		return fmt.Errorf("legacy bootstrap schema detected with %d existing users; manual migration is required", userCount)
	}

	log.Println("Legacy bootstrap schema detected with no users; dropping stale UUID-based tables before auto-migration")
	return db.Exec(`DROP TABLE IF EXISTS
		file_tags,
		note_tags,
		task_tags,
		bookmark_tags,
		audit_logs,
		files,
		notes,
		tasks,
		bookmarks,
		tags,
		users
		CASCADE`).Error
}

// AutoMigrate runs database migrations for all models
func AutoMigrate() error {
	db := config.GetDB()
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	if err := repairLegacyBootstrapSchema(db); err != nil {
		return err
	}

	// The pgx simple-protocol path used by GORM's PostgreSQL migrator can fail
	// schema introspection (`SELECT * ... LIMIT 1`) with "insufficient arguments".
	// Running migrations with prepared statements enabled avoids that path and
	// allows startup migrations to create missing production tables reliably.
	migrationDB := db.Session(&gorm.Session{PrepareStmt: true})

	models := []struct {
		name  string
		model interface{}
	}{
		{name: "User", model: &User{}},
		{name: "Tag", model: &Tag{}},
		{name: "Bookmark", model: &Bookmark{}},
		{name: "Task", model: &Task{}},
		{name: "File", model: &File{}},
		{name: "Note", model: &Note{}},
		{name: "APIKey", model: &APIKey{}},
		{name: "BrowserExtension", model: &BrowserExtension{}},
		{name: "TimeEntry", model: &TimeEntry{}},
		{name: "FileAnalysis", model: &FileAnalysis{}},
		{name: "ChatSession", model: &ChatSession{}},
		{name: "ChatMessage", model: &ChatMessage{}},
		{name: "LearningPath", model: &LearningPath{}},
		{name: "LearningModule", model: &LearningModule{}},
		{name: "ModuleResource", model: &ModuleResource{}},
		{name: "Enrollment", model: &Enrollment{}},
		{name: "Progress", model: &Progress{}},
		{name: "Course", model: &Course{}},
		{name: "LearningPathCourse", model: &LearningPathCourse{}},
		{name: "CalendarEvent", model: &CalendarEvent{}},
		{name: "RecurrenceRule", model: &RecurrenceRule{}},
		{name: "CalendarSettings", model: &CalendarSettings{}},
		{name: "ContentEmbedding", model: &ContentEmbedding{}},
		{name: "SavedSearch", model: &SavedSearch{}},
		{name: "SavedSearchTag", model: &SavedSearchTag{}},
		{name: "SearchAnalytics", model: &SearchAnalytics{}},
		{name: "SearchSuggestion", model: &SearchSuggestion{}},
		{name: "AISummary", model: &AISummary{}},
		{name: "AITaskSuggestion", model: &AITaskSuggestion{}},
		{name: "UserAISettings", model: &UserAISettings{}},
		{name: "UserSearchSettings", model: &UserSearchSettings{}},
		{name: "UserUpdateSettings", model: &UserUpdateSettings{}},
		{name: "AITagSuggestion", model: &AITagSuggestion{}},
		{name: "AIContentGeneration", model: &AIContentGeneration{}},
		{name: "AICodeReview", model: &AICodeReview{}},
		{name: "AILearningRecommendation", model: &AILearningRecommendation{}},
		{name: "AIRecommendation", model: &AIRecommendation{}},
		{name: "UserPreference", model: &UserPreference{}},
		{name: "RecommendationInteraction", model: &RecommendationInteraction{}},
		{name: "Integration", model: &Integration{}},
		{name: "SyncLog", model: &SyncLog{}},
		{name: "WebhookEvent", model: &WebhookEvent{}},
		{name: "ControlServiceSession", model: &ControlServiceSession{}},
		{name: "GitHubUserAuth", model: &GitHubUserAuth{}},
		{name: "GitHubAppInstallState", model: &GitHubAppInstallState{}},
		{name: "GitHubAppInstallation", model: &GitHubAppInstallation{}},
		{name: "GitHubRepoBackup", model: &GitHubRepoBackup{}},
		{name: "Analytics", model: &Analytics{}},
		{name: "ProductivityMetrics", model: &ProductivityMetrics{}},
		{name: "LearningAnalytics", model: &LearningAnalytics{}},
		{name: "ContentAnalytics", model: &ContentAnalytics{}},
		{name: "GitHubAnalytics", model: &GitHubAnalytics{}},
		{name: "HabitAnalytics", model: &HabitAnalytics{}},
		{name: "Goal", model: &Goal{}},
		{name: "Milestone", model: &Milestone{}},
		{name: "AnalyticsReport", model: &AnalyticsReport{}},
		{name: "Skill", model: &Skill{}},
		{name: "Project", model: &Project{}},
		{name: "ProjectTag", model: &ProjectTag{}},
		{name: "SocialLink", model: &SocialLink{}},
		{name: "Follow", model: &Follow{}},
		{name: "Team", model: &Team{}},
		{name: "TeamMember", model: &TeamMember{}},
		{name: "TeamInvitation", model: &TeamInvitation{}},
		{name: "TeamProject", model: &TeamProject{}},
		{name: "TeamProjectTag", model: &TeamProjectTag{}},
		{name: "TeamBookmark", model: &TeamBookmark{}},
		{name: "TeamNote", model: &TeamNote{}},
		{name: "TeamTask", model: &TeamTask{}},
		{name: "TeamFile", model: &TeamFile{}},
		{name: "TeamActivity", model: &TeamActivity{}},
		{name: "AuditLog", model: &AuditLog{}},
		{name: "MarketplaceItem", model: &MarketplaceItem{}},
		{name: "MarketplaceTag", model: &MarketplaceTag{}},
		{name: "MarketplaceReview", model: &MarketplaceReview{}},
		{name: "MarketplacePurchase", model: &MarketplacePurchase{}},
		{name: "ContentShare", model: &ContentShare{}},
		{name: "Challenge", model: &Challenge{}},
		{name: "ChallengeParticipant", model: &ChallengeParticipant{}},
		{name: "ChallengeTeam", model: &ChallengeTeam{}},
		{name: "ChallengeMilestone", model: &ChallengeMilestone{}},
		{name: "ChallengeMilestoneCompletion", model: &ChallengeMilestoneCompletion{}},
		{name: "ChallengeResource", model: &ChallengeResource{}},
		{name: "ChallengeTag", model: &ChallengeTag{}},
		{name: "Mentorship", model: &Mentorship{}},
		{name: "MentorshipSession", model: &MentorshipSession{}},
		{name: "MentorshipReview", model: &MentorshipReview{}},
		{name: "MentorshipMilestone", model: &MentorshipMilestone{}},
		{name: "MentorshipRequest", model: &MentorshipRequest{}},
		{name: "YouTubeChannelCache", model: &YouTubeChannelCache{}},
		{name: "VideoBookmark", model: &VideoBookmark{}},
		{name: "Conversation", model: &Conversation{}},
		{name: "ConversationMember", model: &ConversationMember{}},
		{name: "Message", model: &Message{}},
		{name: "MessageAttachment", model: &MessageAttachment{}},
		{name: "MessageReference", model: &MessageReference{}},
		{name: "MessageSuggestion", model: &MessageSuggestion{}},
		{name: "MessageReaction", model: &MessageReaction{}},
		{name: "PasswordVaultItem", model: &PasswordVaultItem{}},
		{name: "PasswordVaultShare", model: &PasswordVaultShare{}},
	}

	criticalModels := map[string]bool{
		"User":                  true,
		"ControlServiceSession": true,
		"GitHubUserAuth":        true,
		"GitHubAppInstallState": true,
		"GitHubAppInstallation": true,
		"GitHubRepoBackup":      true,
		"AuditLog":              true,
	}

	for _, entry := range models {
		if err := migrationDB.Omit(clause.Associations).AutoMigrate(entry.model); err != nil {
			if criticalModels[entry.name] {
				return fmt.Errorf("auto-migrate %s: %w", entry.name, err)
			}
			log.Printf("Warning: skipping auto-migrate for %s: %v", entry.name, err)
		}
	}

	return nil
}
