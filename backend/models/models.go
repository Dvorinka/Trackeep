package models

import (
	"github.com/trackeep/backend/config"
	"gorm.io/gorm"
)

// DB is the global database instance
var DB *gorm.DB

// InitDB initializes the global database variable
func InitDB() {
	DB = config.GetDB()
}

// AutoMigrate runs database migrations for all models
func AutoMigrate() {
	db := config.GetDB()

	// Auto migrate all models
	db.AutoMigrate(
		&User{},
		&Tag{},
		&Bookmark{},
		&Task{},
		&File{},
		&Note{},
		&TimeEntry{},
		&FileAnalysis{},
		&ChatSession{},
		&ChatMessage{},
		&LearningPath{},
		&LearningModule{},
		&ModuleResource{},
		&Enrollment{},
		&Progress{},
		&Course{},
		&LearningPathCourse{},
		&CalendarEvent{},
		&RecurrenceRule{},
		&CalendarSettings{},
		// Search models
		&ContentEmbedding{},
		&SavedSearch{},
		&SavedSearchTag{},
		&SearchAnalytics{},
		&SearchSuggestion{},
		// AI Feature models
		&AISummary{},
		&AITaskSuggestion{},
		&UserAISettings{},
		&AITagSuggestion{},
		&AIContentGeneration{},
		&AICodeReview{},
		&AILearningRecommendation{},
		// Advanced AI Recommendation models
		&AIRecommendation{},
		&UserPreference{},
		&RecommendationInteraction{},
		// Integration models
		&Integration{},
		&SyncLog{},
		&WebhookEvent{},
		// Analytics models
		&Analytics{},
		&ProductivityMetrics{},
		&LearningAnalytics{},
		&ContentAnalytics{},
		&GitHubAnalytics{},
		&HabitAnalytics{},
		&Goal{},
		&Milestone{},
		&AnalyticsReport{},
		// Social features models
		&Skill{},
		&Project{},
		&ProjectTag{},
		&SocialLink{},
		&Follow{},
		// Team workspace models
		&Team{},
		&TeamMember{},
		&TeamInvitation{},
		&TeamProject{},
		&TeamProjectTag{},
		&TeamBookmark{},
		&TeamNote{},
		&TeamTask{},
		&TeamFile{},
		&TeamActivity{},
		// Security models
		&AuditLog{},
		// Marketplace models
		&MarketplaceItem{},
		&MarketplaceTag{},
		&MarketplaceReview{},
		&MarketplacePurchase{},
		&ContentShare{},
		// Community models
		&Challenge{},
		&ChallengeParticipant{},
		&ChallengeTeam{},
		&ChallengeMilestone{},
		&ChallengeMilestoneCompletion{},
		&ChallengeResource{},
		&ChallengeTag{},
		&Mentorship{},
		&MentorshipSession{},
		&MentorshipReview{},
		&MentorshipMilestone{},
		&MentorshipRequest{},
		// YouTube cache models
		&YouTubeChannelCache{},
		// Video bookmark models
		&VideoBookmark{},
		// Messaging models
		&Conversation{},
		&ConversationMember{},
		&Message{},
		&MessageAttachment{},
		&MessageReference{},
		&MessageSuggestion{},
		&MessageReaction{},
		&PasswordVaultItem{},
		&PasswordVaultShare{},
	)
}
