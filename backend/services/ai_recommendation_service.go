package services

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// AIRecommendationService provides AI-powered recommendations
type AIRecommendationService struct {
	db *gorm.DB
}

// NewAIRecommendationService creates a new AI recommendation service
func NewAIRecommendationService(db *gorm.DB) *AIRecommendationService {
	return &AIRecommendationService{db: db}
}

// RecommendationRequest represents a request for recommendations
type RecommendationRequest struct {
	UserID             uint    `json:"user_id"`
	RecommendationType string  `json:"recommendation_type"` // content, task, learning, connection
	Limit              int     `json:"limit"`               // Max recommendations to return
	MinConfidence      float64 `json:"min_confidence"`      // Minimum confidence threshold
	IncludeDismissed   bool    `json:"include_dismissed"`   // Include previously dismissed items
	Context            string  `json:"context"`             // Current user context
}

// RecommendationScore represents a scored recommendation
type RecommendationScore struct {
	Recommendation models.AIRecommendation
	Score          float64
	Reason         string
}

// GetRecommendations generates personalized recommendations for a user
func (s *AIRecommendationService) GetRecommendations(req RecommendationRequest) ([]models.AIRecommendation, error) {
	// Get user preferences
	var prefs models.UserPreference
	if err := s.db.Where("user_id = ?", req.UserID).First(&prefs).Error; err != nil {
		// Create default preferences if not found
		prefs = models.UserPreference{
			UserID:                   req.UserID,
			EnableRecommendations:    true,
			MinConfidenceThreshold:   0.6,
			MaxRecommendationsPerDay: 5,
			MaxAgeHours:              168,
		}
		s.db.Create(&prefs)
	}

	if !prefs.EnableRecommendations {
		return []models.AIRecommendation{}, nil
	}

	// Check daily limit
	today := time.Now().Format("2006-01-02")
	var todayCount int64
	s.db.Model(&models.AIRecommendation{}).
		Where("user_id = ? AND DATE(created_at) = ?", req.UserID, today).
		Count(&todayCount)

	if int(todayCount) >= prefs.MaxRecommendationsPerDay {
		return []models.AIRecommendation{}, nil
	}

	// Generate recommendations based on type
	var scoredRecommendations []RecommendationScore

	switch req.RecommendationType {
	case "content":
		scoredRecommendations = s.generateContentRecommendations(req.UserID, &prefs)
	case "task":
		scoredRecommendations = s.generateTaskRecommendations(req.UserID, &prefs)
	case "learning":
		scoredRecommendations = s.generateLearningRecommendations(req.UserID, &prefs)
	case "connection":
		scoredRecommendations = s.generateConnectionRecommendations(req.UserID, &prefs)
	default:
		// Generate mixed recommendations
		scoredRecommendations = s.generateMixedRecommendations(req.UserID, &prefs)
	}

	// Filter by confidence and dismissed status
	minConf := req.MinConfidence
	if minConf == 0 {
		minConf = prefs.MinConfidenceThreshold
	}

	var filtered []RecommendationScore
	for _, rec := range scoredRecommendations {
		if rec.Score >= minConf && (req.IncludeDismissed || !rec.Recommendation.Dismissed) {
			// Check if not expired
			if rec.Recommendation.ExpiresAt == nil || rec.Recommendation.ExpiresAt.After(time.Now()) {
				filtered = append(filtered, rec)
			}
		}
	}

	// Sort by score
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Score > filtered[j].Score
	})

	// Apply limit
	limit := req.Limit
	if limit == 0 {
		limit = 5
	}
	if limit > len(filtered) {
		limit = len(filtered)
	}

	// Save recommendations to database
	var recommendations []models.AIRecommendation
	for i := 0; i < limit; i++ {
		rec := filtered[i].Recommendation
		rec.Confidence = filtered[i].Score

		// Check if already exists
		var existing models.AIRecommendation
		err := s.db.Where("user_id = ? AND content_type = ? AND content_id = ?",
			rec.UserID, rec.ContentType, rec.ContentID).First(&existing).Error

		if err == gorm.ErrRecordNotFound {
			// Create new recommendation
			if err := s.db.Create(&rec).Error; err != nil {
				continue
			}
			recommendations = append(recommendations, rec)
		} else {
			// Update existing recommendation
			existing.Confidence = rec.Confidence
			existing.Reasoning = filtered[i].Reason
			existing.UpdatedAt = time.Now()
			s.db.Save(&existing)
			recommendations = append(recommendations, existing)
		}
	}

	return recommendations, nil
}

// generateContentRecommendations generates content-based recommendations
func (s *AIRecommendationService) generateContentRecommendations(userID uint, prefs *models.UserPreference) []RecommendationScore {
	var recommendations []RecommendationScore

	// Get user's recent activity and interests
	userTags := s.getUserInterests(userID)
	userCategories := s.getUserCategories(userID)

	// Find similar content from other users
	var similarContent []struct {
		ContentType string
		ContentID   uint
		Title       string
		URL         string
		Preview     string
		Author      string
		Tags        string
		Score       float64
	}

	// Query for popular content among similar users
	query := `
		SELECT 
			b.content_type,
			b.content_id,
			b.title,
			b.url,
			SUBSTRING(b.content, 1, 200) as preview,
			u.full_name as author,
			b.tags,
			COUNT(*) as interaction_count
		FROM bookmarks b
		INNER JOIN users u ON b.user_id = u.id
		WHERE b.user_id != ? 
		AND b.created_at > ?
		AND (b.tags ?| array[?] OR b.content_type = ANY(?))
		GROUP BY b.content_type, b.content_id, b.title, b.url, b.content, u.full_name, b.tags
		HAVING COUNT(*) > 1
		ORDER BY interaction_count DESC
		LIMIT 20
	`

	// This is a simplified version - in practice you'd use more sophisticated similarity algorithms
	s.db.Raw(query, userID, time.Now().AddDate(0, -3, 0), userTags, prefs.PreferredContentTypes).Scan(&similarContent)

	for _, content := range similarContent {
		score := s.calculateContentScore(content, userTags, userCategories, prefs)

		expiresAt := time.Now().Add(time.Hour * 24 * 7)

		recommendation := models.AIRecommendation{
			UserID:             userID,
			RecommendationType: "content",
			ContentType:        content.ContentType,
			ContentID:          &content.ContentID,
			Title:              content.Title,
			Description:        fmt.Sprintf("Recommended based on your interests in %s", strings.Join(userTags, ", ")),
			ContentTitle:       content.Title,
			ContentURL:         content.URL,
			ContentPreview:     content.Preview,
			AuthorName:         content.Author,
			Tags:               content.Tags,
			Priority:           s.getPriorityFromScore(score),
			ExpiresAt:          &expiresAt,
			SourceModel:        "collaborative_filtering_v1",
		}

		recommendations = append(recommendations, RecommendationScore{
			Recommendation: recommendation,
			Score:          score,
			Reason:         fmt.Sprintf("Similar users with interests in %s also liked this", strings.Join(userTags[:2], ", ")),
		})
	}

	return recommendations
}

// generateTaskRecommendations generates task-based recommendations
func (s *AIRecommendationService) generateTaskRecommendations(userID uint, prefs *models.UserPreference) []RecommendationScore {
	var recommendations []RecommendationScore

	// Get user's task patterns and upcoming deadlines
	var userTasks []models.Task
	s.db.Where("user_id = ? AND status != 'completed'", userID).Find(&userTasks)

	// Get calendar events for context
	var upcomingEvents []models.CalendarEvent
	s.db.Where("user_id = ? AND start_time BETWEEN ? AND ?",
		userID, time.Now(), time.Now().AddDate(0, 0, 7)).Find(&upcomingEvents)

	// Analyze patterns and suggest tasks
	for _, task := range userTasks {
		if string(task.Priority) == "high" && task.DueDate != nil && task.DueDate.Before(time.Now().AddDate(0, 0, 3)) {
			// High priority task due soon
			score := 0.9

			// Convert tags to string
			var tagStr string
			for i, tag := range task.Tags {
				if i > 0 {
					tagStr += ","
				}
				tagStr += tag.Name
			}

			expiresAt := task.DueDate

			recommendation := models.AIRecommendation{
				UserID:             userID,
				RecommendationType: "task",
				ContentType:        "task",
				ContentID:          &task.ID,
				Title:              fmt.Sprintf("Focus on: %s", task.Title),
				Description:        fmt.Sprintf("This high-priority task is due on %s", task.DueDate.Format("Jan 2")),
				ContentTitle:       task.Title,
				ContentPreview:     task.Description,
				Tags:               tagStr,
				Priority:           "high",
				Confidence:         score,
				ExpiresAt:          expiresAt,
				SourceModel:        "deadline_priority_v1",
			}

			recommendations = append(recommendations, RecommendationScore{
				Recommendation: recommendation,
				Score:          score,
			})
		}
	}

	return recommendations
}

// generateLearningRecommendations generates learning-based recommendations
func (s *AIRecommendationService) generateLearningRecommendations(userID uint, prefs *models.UserPreference) []RecommendationScore {
	var recommendations []RecommendationScore

	// Get user's learning progress and interests
	var enrollments []models.Enrollment
	s.db.Preload("Course").Preload("LearningPath").Where("user_id = ?", userID).Find(&enrollments)

	var completedCategories []string
	var inProgressCategories []string
	for _, enrollment := range enrollments {
		if enrollment.Progress >= 100 {
			if enrollment.CourseID != nil && enrollment.Course != nil {
				completedCategories = append(completedCategories, enrollment.Course.Category)
			} else if enrollment.LearningPathID != 0 {
				completedCategories = append(completedCategories, enrollment.LearningPath.Category)
			}
		} else {
			if enrollment.CourseID != nil && enrollment.Course != nil {
				inProgressCategories = append(inProgressCategories, enrollment.Course.Category)
			} else if enrollment.LearningPathID != 0 {
				inProgressCategories = append(inProgressCategories, enrollment.LearningPath.Category)
			}
		}
	}

	// Recommend next courses based on completed ones
	for _, category := range completedCategories {
		var nextCourses []models.Course
		s.db.Where("category = ? AND level != ?", category, "beginner").Limit(3).Find(&nextCourses)

		for _, course := range nextCourses {
			score := 0.8

			// Convert topics to tags string
			var tagsStr string
			for i, topic := range course.Topics {
				if i > 0 {
					tagsStr += ","
				}
				tagsStr += topic
			}

			expiresAt := time.Now().Add(time.Hour * 24 * 14)

			recommendation := models.AIRecommendation{
				UserID:             userID,
				RecommendationType: "learning",
				ContentType:        "course",
				ContentID:          &course.ID,
				Title:              fmt.Sprintf("Continue learning: %s", course.Title),
				Description:        fmt.Sprintf("Based on your completion of %s courses", category),
				ContentTitle:       course.Title,
				ContentPreview:     course.Description,
				Tags:               tagsStr,
				Priority:           "medium",
				Confidence:         score,
				ExpiresAt:          &expiresAt,
				SourceModel:        "learning_path_v1",
			}

			recommendations = append(recommendations, RecommendationScore{
				Recommendation: recommendation,
				Score:          score,
			})
		}
	}

	return recommendations
}

// generateConnectionRecommendations generates user connection recommendations
func (s *AIRecommendationService) generateConnectionRecommendations(userID uint, prefs *models.UserPreference) []RecommendationScore {
	var recommendations []RecommendationScore

	if !prefs.ConnectionRecommendations {
		return recommendations
	}

	// Get user's skills and interests
	var user models.User
	s.db.Preload("Skills").Where("id = ?", userID).First(&user)

	// Find similar users
	var similarUsers []models.User
	s.db.Where("id != ? AND (skills ?| array[?] OR location = ?)",
		userID, s.getSkillNames(user.Skills), user.Location).Limit(5).Find(&similarUsers)

	for _, similarUser := range similarUsers {
		score := s.calculateUserSimilarity(&user, &similarUser)

		if score > 0.6 {
			expiresAt := time.Now().Add(time.Hour * 24 * 30)

			recommendation := models.AIRecommendation{
				UserID:             userID,
				RecommendationType: "connection",
				ContentType:        "user",
				ContentID:          &similarUser.ID,
				Title:              fmt.Sprintf("Connect with %s", similarUser.FullName),
				Description:        fmt.Sprintf("Similar interests in %s", s.getSharedInterests(&user, &similarUser)),
				ContentTitle:       similarUser.FullName,
				ContentPreview:     similarUser.Bio,
				AuthorName:         similarUser.JobTitle,
				Priority:           "low",
				Confidence:         score,
				ExpiresAt:          &expiresAt,
				SourceModel:        "user_similarity_v1",
			}

			recommendations = append(recommendations, RecommendationScore{
				Recommendation: recommendation,
				Score:          score,
			})
		}
	}

	return recommendations
}

// generateMixedRecommendations generates a mix of all recommendation types
func (s *AIRecommendationService) generateMixedRecommendations(userID uint, prefs *models.UserPreference) []RecommendationScore {
	var allRecommendations []RecommendationScore

	// Get recommendations from all types
	contentRecs := s.generateContentRecommendations(userID, prefs)
	taskRecs := s.generateTaskRecommendations(userID, prefs)
	learningRecs := s.generateLearningRecommendations(userID, prefs)
	connectionRecs := s.generateConnectionRecommendations(userID, prefs)

	allRecommendations = append(allRecommendations, contentRecs...)
	allRecommendations = append(allRecommendations, taskRecs...)
	allRecommendations = append(allRecommendations, learningRecs...)
	allRecommendations = append(allRecommendations, connectionRecs...)

	// Ensure diverse mix by limiting each type
	maxPerType := 2
	typeCounts := make(map[string]int)
	var mixedRecs []RecommendationScore

	for _, rec := range allRecommendations {
		if typeCounts[rec.Recommendation.ContentType] < maxPerType {
			mixedRecs = append(mixedRecs, rec)
			typeCounts[rec.Recommendation.ContentType]++
		}
	}

	return mixedRecs
}

// Helper functions

func (s *AIRecommendationService) getUserInterests(userID uint) []string {
	var tags []string
	s.db.Model(&models.Bookmark{}).
		Select("DISTINCT unnest(string_to_array(tags, ',')) as tag").
		Where("user_id = ?", userID).
		Pluck("tag", &tags)
	return tags
}

func (s *AIRecommendationService) getUserCategories(userID uint) []string {
	var categories []string
	s.db.Model(&models.Course{}).
		Select("DISTINCT category").
		Joins("JOIN enrollments ON courses.id = enrollments.course_id").
		Where("enrollments.user_id = ?", userID).
		Pluck("category", &categories)
	return categories
}

func (s *AIRecommendationService) calculateContentScore(content interface{}, userTags, userCategories []string, prefs *models.UserPreference) float64 {
	// Simplified scoring algorithm
	score := 0.5 // Base score

	// Add points for tag matches
	// In practice, this would be more sophisticated
	score += float64(len(userTags)) * 0.1

	// Ensure score is within bounds
	if score > 1.0 {
		score = 1.0
	}
	if score < 0.0 {
		score = 0.0
	}

	return score
}

func (s *AIRecommendationService) getPriorityFromScore(score float64) string {
	if score >= 0.8 {
		return "high"
	} else if score >= 0.6 {
		return "medium"
	}
	return "low"
}

func (s *AIRecommendationService) getSkillNames(skills []models.Skill) []string {
	var names []string
	for _, skill := range skills {
		names = append(names, skill.Name)
	}
	return names
}

func (s *AIRecommendationService) calculateUserSimilarity(user1, user2 *models.User) float64 {
	// Simplified similarity calculation
	score := 0.0

	// Location match
	if user1.Location == user2.Location && user1.Location != "" {
		score += 0.3
	}

	// Skills overlap (simplified)
	if len(user1.Skills) > 0 && len(user2.Skills) > 0 {
		score += 0.4
	}

	// Random factor for demo
	score += 0.2

	if score > 1.0 {
		score = 1.0
	}

	return score
}

func (s *AIRecommendationService) getSharedInterests(user1, user2 *models.User) string {
	// Simplified - in practice would analyze actual shared interests
	interests := []string{"technology", "productivity", "learning"}
	if len(interests) > 2 {
		return strings.Join(interests[:2], ", ")
	}
	return strings.Join(interests, ", ")
}

// RecordInteraction records user interaction with recommendations
func (s *AIRecommendationService) RecordInteraction(userID, recommendationID uint, interactionType, context string) error {
	interaction := models.RecommendationInteraction{
		UserID:           userID,
		RecommendationID: recommendationID,
		InteractionType:  interactionType,
		Context:          context,
		SessionID:        fmt.Sprintf("session_%d_%d", userID, time.Now().Unix()),
		DeviceType:       "web", // Would be detected from request
	}

	// Update recommendation based on interaction
	var recommendation models.AIRecommendation
	if err := s.db.First(&recommendation, recommendationID).Error; err != nil {
		return err
	}

	switch interactionType {
	case "click":
		recommendation.Clicked = true
		now := time.Now()
		recommendation.ClickedAt = &now
	case "dismiss":
		recommendation.Dismissed = true
		now := time.Now()
		recommendation.DismissedAt = &now
	case "feedback":
		// Additional feedback handling would go here
	}

	s.db.Save(&recommendation)
	return s.db.Create(&interaction).Error
}
