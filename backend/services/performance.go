package services

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

type PerformanceService struct {
	db *gorm.DB
}

func NewPerformanceService(db *gorm.DB) *PerformanceService {
	return &PerformanceService{
		db: db,
	}
}

// OptimizeDatabase performs database optimizations
func (s *PerformanceService) OptimizeDatabase() error {
	// Create indexes for frequently queried fields
	indexes := []string{
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_id ON notes(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_is_public ON notes(is_public)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_id ON files(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_created_at ON files(created_at)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_items_category ON marketplace_items(category)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenges_status ON challenges(status)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenges_start_date ON challenges(start_date)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorships_status ON mentorships(status)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorships_mentor_id ON mentorships(mentor_id)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorships_mentee_id ON mentorships(mentee_id)",
	}

	for _, indexSQL := range indexes {
		if err := s.db.Exec(indexSQL).Error; err != nil {
			// Log error but continue with other indexes
			fmt.Printf("Failed to create index: %s, error: %v\n", indexSQL, err)
		}
	}

	// Analyze tables to update statistics
	tables := []string{
		"users", "bookmarks", "tasks", "notes", "files",
		"time_entries", "audit_logs", "marketplace_items",
		"challenges", "challenge_participants", "mentorships",
	}

	for _, table := range tables {
		if err := s.db.Exec(fmt.Sprintf("ANALYZE %s", table)).Error; err != nil {
			fmt.Printf("Failed to analyze table %s: %v\n", table, err)
		}
	}

	return nil
}

// CleanupOldAuditLogs removes old audit logs to maintain performance
func (s *PerformanceService) CleanupOldAuditLogs(retentionDays int) error {
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)

	result := s.db.Where("created_at < ?", cutoffDate).Delete(&struct{}{})
	if result.Error != nil {
		return result.Error
	}

	fmt.Printf("Cleaned up %d old audit log entries\n", result.RowsAffected)
	return nil
}

// GetDatabaseStats returns database performance statistics
func (s *PerformanceService) GetDatabaseStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Get table sizes
	var tableStats []struct {
		TableName string `json:"table_name"`
		RowCount  int64  `json:"row_count"`
	}

	query := `
		SELECT 
			table_name as table_name,
			n_tup_ins - n_tup_del as row_count
		FROM pg_stat_user_tables
		ORDER BY n_tup_ins - n_tup_del DESC
		LIMIT 10
	`

	if err := s.db.Raw(query).Scan(&tableStats).Error; err != nil {
		return nil, err
	}
	stats["table_sizes"] = tableStats

	// Get slow queries (if pg_stat_statements is available)
	var slowQueries []struct {
		Query     string  `json:"query"`
		Calls     int64   `json:"calls"`
		TotalTime float64 `json:"total_time"`
		MeanTime  float64 `json:"mean_time"`
	}

	slowQuerySQL := `
		SELECT 
			query,
			calls,
			total_time,
			mean_time
		FROM pg_stat_statements
		ORDER BY mean_time DESC
		LIMIT 10
	`

	if err := s.db.Raw(slowQuerySQL).Scan(&slowQueries).Error; err == nil {
		stats["slow_queries"] = slowQueries
	}

	// Get cache hit ratio
	var cacheStats struct {
		HitRatio float64 `json:"hit_ratio"`
	}

	cacheSQL := `
		SELECT 
			ROUND(sum(heap_blks_hit)::numeric / 
				  (sum(heap_blks_hit) + sum(heap_blks_read)), 4) as hit_ratio
		FROM pg_statio_user_tables
	`

	if err := s.db.Raw(cacheSQL).Scan(&cacheStats).Error; err == nil {
		stats["cache_hit_ratio"] = cacheStats.HitRatio
	}

	return stats, nil
}

// OptimizeQueries optimizes common query patterns
func (s *PerformanceService) OptimizeQueries() error {
	// Enable query plan caching
	if err := s.db.Exec("SET plan_cache_mode = force_generic_plan").Error; err != nil {
		fmt.Printf("Failed to set plan cache mode: %v\n", err)
	}

	// Set appropriate work_mem for sorting operations
	if err := s.db.Exec("SET work_mem = '16MB'").Error; err != nil {
		fmt.Printf("Failed to set work_mem: %v\n", err)
	}

	// Set maintenance_work_mem for index creation
	if err := s.db.Exec("SET maintenance_work_mem = '64MB'").Error; err != nil {
		fmt.Printf("Failed to set maintenance_work_mem: %v\n", err)
	}

	// Enable parallel query processing
	if err := s.db.Exec("SET max_parallel_workers_per_gather = 2").Error; err != nil {
		fmt.Printf("Failed to set max_parallel_workers_per_gather: %v\n", err)
	}

	return nil
}

// MonitorPerformance monitors system performance
func (s *PerformanceService) MonitorPerformance() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Database connections
	var dbStats struct {
		ActiveConnections int `json:"active_connections"`
		MaxConnections    int `json:"max_connections"`
	}

	if err := s.db.Raw("SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'").Scan(&dbStats.ActiveConnections).Error; err == nil {
		s.db.Raw("SHOW max_connections").Scan(&dbStats.MaxConnections)
		stats["database_connections"] = dbStats
	}

	// Redis stats (if available) - currently not implemented
	stats["redis_info"] = "Redis not configured"

	// Memory usage
	var memoryStats struct {
		TotalMemory int64 `json:"total_memory"`
		UsedMemory  int64 `json:"used_memory"`
	}

	if err := s.db.Raw("SELECT setting::int * 1024 * 1024 as total_memory FROM pg_settings WHERE name = 'shared_buffers'").Scan(&memoryStats.TotalMemory).Error; err == nil {
		stats["memory_usage"] = memoryStats
	}

	return stats, nil
}

// WarmupCache preloads frequently accessed data into cache
// Currently not implemented - requires Redis or other caching solution
func (s *PerformanceService) WarmupCache() error {
	// TODO: Implement caching when Redis is added
	return nil
}

// ClearCache clears all cache entries
// Currently not implemented - requires Redis or other caching solution
func (s *PerformanceService) ClearCache() error {
	// TODO: Implement cache clearing when Redis is added
	return nil
}

// GetCacheStats returns cache performance statistics
// Currently not implemented - requires Redis or other caching solution
func (s *PerformanceService) GetCacheStats() (map[string]interface{}, error) {
	return map[string]interface{}{"status": "cache_not_implemented"}, nil
}
