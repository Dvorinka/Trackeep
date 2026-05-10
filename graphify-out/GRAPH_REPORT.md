# Graph Report - Trackeep  (2026-04-30)

## Corpus Check
- 330 files · ~395,125 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2549 nodes · 3694 edges · 99 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 562 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 138|Community 138]]

## God Nodes (most connected - your core abstractions)
1. `GetDB()` - 95 edges
2. `New()` - 50 edges
3. `contains()` - 42 edges
4. `main()` - 41 edges
5. `toLower()` - 34 edges
6. `demoFetch()` - 32 edges
7. `Queries` - 28 edges
8. `IntegrationHandler` - 26 edges
9. `setError()` - 25 edges
10. `getAuthUserID()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `createTask()` --calls--> `setError()`  [INFERRED]
  mobile/src/screens/TasksScreen.tsx → desktop/src/main.js
- `toggleTaskStatus()` --calls--> `setError()`  [INFERRED]
  mobile/src/screens/TasksScreen.tsx → desktop/src/main.js
- `deleteTask()` --calls--> `setError()`  [INFERRED]
  mobile/src/screens/TasksScreen.tsx → desktop/src/main.js
- `startEntry()` --calls--> `setError()`  [INFERRED]
  mobile/src/screens/TimeEntriesScreen.tsx → desktop/src/main.js
- `stopEntry()` --calls--> `setError()`  [INFERRED]
  mobile/src/screens/TimeEntriesScreen.tsx → desktop/src/main.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (147): DB, NewDB(), centralizedOAuthUser, buildControlServiceCallbackURL(), buildControlServiceGitHubStartURL(), buildGitHubAppInstallCallbackURL(), clearControlServiceAuthFlowState(), controlServiceClient() (+139 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (74): applySmartSuggestions(), detectAndApplySmartData(), handleQuickSave(), hideMessage(), saveBookmark(), setButtonLoading(), showMessage(), uploadFile() (+66 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (62): handleDemoMode(), ProtectedRoute(), DemoStatus(), Header(), getAuthHeaders(), isDemoMode(), useAuth(), DemoModeApiClient (+54 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (53): initializeDragonflyDB(), main(), AppConfig, Config, getDurationEnv(), getEnvWithDefault(), Load(), DatabaseConfig (+45 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (84): SeedData(), GetDB(), AdminDeleteLearningPath(), AdminGetAllLearningPaths(), AdminGetStats(), AdminGetUsers(), AdminMiddleware(), AdminReviewLearningPath() (+76 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (78): AddConversationMemberRequest, AdminCreateUser(), AttachmentInput, conversationListItem, CreateConversationRequest, CreateMessageRequest, CreateReactionRequest, CreateVaultItemRequest (+70 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (46): AcceptTaskSuggestion(), buildTaskContext(), generateAIContent(), generateAISummary(), GenerateContent(), GenerateTagSuggestions(), generateTaskSuggestions(), GetAIProviders() (+38 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (45): disableTOTP(), enableTOTP(), fetchTOTPStatus(), getAuthHeaders(), regenerateBackupCodes(), setupTOTP(), verifyBackupCode(), verifyTOTPCode() (+37 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (60): Ae(), ar(), at(), Bt(), children(), cr(), Ct(), de() (+52 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (50): GetAISettings(), getDefaultAISettings(), isMasked(), UpdateAISettings(), AISettings, AuthMiddleware(), ChangePassword(), CheckUsers() (+42 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (33): GetChannelVideos(), GetFireshipVideos(), GetNetworkChuckVideos(), GetYouTubeChannelVideosFromURL(), GetYouTubeTrending(), SearchYouTube(), YouTubeSearchTest(), YouTubeChannelRequest (+25 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (27): downloadUpdate(), containsMaliciousContent(), InputValidationMiddleware(), sanitizeInput(), ValidateRequestBody(), generateMemoryCacheKey(), InvalidateMemoryCache(), MemoryCacheInvalidationMiddleware() (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (28): initializeSecuritySecrets(), GenerateAPIKey(), generateRandomString(), createFileShareRequest, buildPublicShareURL(), CreateFileShare(), determineFileType(), generateSecureShareToken() (+20 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (41): getControlServiceTokenForUser(), CreateEncryptedNote(), DecryptNoteContent(), determineFileTypeForEncryption(), DownloadEncryptedFile(), EncryptNoteContent(), generateRandomStringForFile(), GetEncryptedNote() (+33 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (18): InitDatabase(), shouldRunLegacySQLMigrations(), InitLogger(), Logger(), logPerformanceEvent(), logRequestBody(), logSecurityEvent(), PerformanceLogger() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (24): getApiOrigin(), getApiV1BaseUrl(), trimApiSuffix(), trimTrailingSlash(), getAuthCallbackUrl(), startGitHubSignIn(), backupSelectedRepositories(), checkGitHubConnection() (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (12): calculateFocusScore(), NewAnalyticsHandler(), AnalyticsHandler, getIntValue(), getStringValue(), logSearchAnalytics(), min(), performEnhancedSearch() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (23): progressWriter, UpdateRequest, backupUserData(), broadcastProgress(), CheckForUpdates(), checkForUpdatesWithDocker(), checkForUpdatesWithDockerRegistry(), copyDirectory() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.1
Nodes (25): BraveNewsResponse, BraveSearchResponse, BraveSearchResult, SearchNews(), SearchWeb(), getBoolEnvWithDefault(), getDefaultSearchSettings(), getEnvWithDefault() (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (2): DBTX, Queries

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (6): NewAIRecommendationHandler(), AIRecommendationHandler, NewAIRecommendationService(), AIRecommendationService, RecommendationRequest, RecommendationScore

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (10): BoundingBox, ComputerVisionService, DocumentAnalysis, DocumentSection, DocumentTable, FaceDetection, ImageAnalysisRequest, ImageAnalysisResponse (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (6): NewVideoBookmarkHandler(), VideoBookmarkHandler, SaveVideoRequest, NewVideoBookmarkService(), VideoBookmarkService, VideoInfo

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (1): IntegrationHandler

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (5): adaptBookmarkFromApi(), editBookmark(), handleAddBookmark(), handleEditBookmark(), handleSubmit()

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (10): handlePageChange(), stats(), storagePercentage(), taskCompletionRate(), totalPages(), weeklyActivityTotal(), handleRefresh(), loadStats() (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (11): containsString(), GetAllFavicons(), GetFavicon(), NewFaviconFetcher(), BenchmarkFaviconFetch(), TestExtractHeadSection(), TestFaviconFetcher(), TestMakeAbsoluteURL() (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (7): fetchWithAuth(), getAuthToken(), handleBackupSelectedRepos(), handleInstallGitHubApp(), loadFiles(), loadGitHubBackupWorkspace(), parseRepoPayload()

### Community 28 - "Community 28"
Cohesion: 0.1
Nodes (12): Challenge, ChallengeMilestone, ChallengeMilestoneCompletion, ChallengeParticipant, ChallengeResource, ChallengeTag, ChallengeTeam, Mentorship (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (14): getAuthHeaders(), getQuickSearchSuggestions(), searchBrave(), searchNews(), searchWeb(), extractVideoId(), getVideoInfo(), handleKeyPress() (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (3): looksLikeYouTube(), saveBookmark(), submitManualShare()

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (10): hexToHsl(), isChatOpen(), toggleChat(), applyCustomColors(), applyScheme(), resetColors(), toggleDarkMode(), updateSchemesForTheme() (+2 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (9): Analytics, AnalyticsReport, ContentAnalytics, GitHubAnalytics, Goal, HabitAnalytics, LearningAnalytics, Milestone (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (17): GenerateEmbeddingRequest, GenerateEmbeddingResponse, buildSemanticSearchResult(), compactSemanticText(), cosineSimilarity(), findSimilarContent(), GenerateEmbedding(), generateHighlights() (+9 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (16): DiscordConfig, GitHubConfig, GoogleConfig, Integration, IntegrationConfig, IntegrationStatus, IntegrationType, NotionConfig (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (3): calculateMatchScore(), NewCommunityHandler(), CommunityHandler

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (4): Metrics, copyDurationMap(), copyMap(), GetMetrics()

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (6): isSupported(), triggerHaptic(), useHaptics(), Messages(), Profile(), Button()

### Community 38 - "Community 38"
Cohesion: 0.2
Nodes (10): completeSetup(), generateApiKey(), saveSettings(), setButtonLoading(), showConnectionStatus(), showMessage(), showSetupConnectionStatus(), testConnection() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (2): NewGoalsHabitsHandler(), GoalsHabitsHandler

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (2): NewMarketplaceHandler(), MarketplaceHandler

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (8): generateCalendarDays(), getCellClass(), getDateClass(), getDaysInMonth(), getFirstDayOfMonth(), isDateEnd(), isDateInRange(), isDateStart()

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (11): closeCreateWorkspaceModal(), createDefaultWorkspace(), getAuthToken(), getWorkspaceIcon(), handleCreateWorkspace(), handleWorkspaceSelect(), loadWorkspaces(), normalizeWorkspace() (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.27
Nodes (14): cleanupHistory(), detectContentType(), getTrackeepConfig(), getYouTubeHistory(), openPopupWithContext(), parseResponseError(), parseYouTubeVideoMeta(), saveYouTubeBookmark() (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (1): Validator

### Community 45 - "Community 45"
Cohesion: 0.2
Nodes (9): Category, estimateReadingTime(), generateSlug(), Template, TemplateVariable, WikiAttachment, WikiBacklink, WikiPage (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.19
Nodes (6): generateId(), getFileExtension(), handleDrop(), handleFileSelect(), handleUrlImport(), simulateUpload()

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (6): GoalTag, GoalTemplate, GoalTemplateMilestone, Habit, HabitEntry, HabitTag

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (2): canUpload(), isValidUrl()

### Community 49 - "Community 49"
Cohesion: 0.24
Nodes (8): handleHexChange(), handleMouseMove(), handleSavedColorClick(), handleSliderMouseDown(), hexToHSL(), hslToHex(), updateColorFromHue(), updateHueFromPosition()

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (6): fetchSessions(), getProviderFromModel(), getToken(), handleSendMessage(), loadSessionMessages(), scrollToHighlightedMessage()

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (11): Team, TeamActivity, TeamBookmark, TeamFile, TeamInvitation, TeamMember, TeamNote, TeamProject (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (11): AuditLog, Bookmark, BookmarkTag, File, FileTag, Note, NoteTag, Tag (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.2
Nodes (6): ContentShare, generateShareToken(), MarketplaceItem, MarketplacePurchase, MarketplaceReview, MarketplaceTag

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (10): AddTaskTagParams, CreateTaskParams, DeleteTaskParams, GetTaskByIDParams, GetTasksByStatusParams, GetTasksByTagParams, GetTasksByUserParams, RemoveTaskTagParams (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (4): getMockCalendarEvents(), createEvent(), fetchCalendarData(), toggleEventCompletion()

### Community 56 - "Community 56"
Cohesion: 0.2
Nodes (3): CalendarEvent, CalendarSettings, RecurrenceRule

### Community 57 - "Community 57"
Cohesion: 0.2
Nodes (9): AddBookmarkTagParams, CreateBookmarkParams, DeleteBookmarkParams, GetBookmarkByIDParams, GetBookmarksByTagParams, GetBookmarksByUserParams, RemoveBookmarkTagParams, SearchBookmarksParams (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (6): getToken(), handleAddMember(), handleDeleteMember(), loadMembers(), onWorkspaceChanged(), resolveWorkspaceId()

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (4): apiRequest(), getToken(), MessagesRealtimeClient, uploadChatFile()

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (3): AIRecommendation, RecommendationInteraction, UserPreference

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (8): CreateUserParams, CreateUserRow, GetUserByEmailRow, GetUserByIDRow, ListUsersParams, ListUsersRow, UpdateUserParams, UpdateUserRow

### Community 63 - "Community 63"
Cohesion: 0.46
Nodes (7): closePrompt(), detectAndNotify(), escapeHtml(), initDetection(), parseYouTubeVideo(), renderPrompt(), sendMessage()

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (5): ScrapedContent, ScrapedImage, ScrapedLink, ScrapedVideo, ScrapingJob

### Community 66 - "Community 66"
Cohesion: 0.48
Nodes (5): buildShareDraft(), firstCandidateTitleFromText(), firstUrlFromText(), normalizeUrl(), titleFromUrl()

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (1): UserServiceExample

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (6): AICodeReview, AIContentGeneration, AILearningRecommendation, AISummary, AITagSuggestion, AITaskSuggestion

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): Follow, Project, ProjectTag, Skill, SocialLink, UserProfileStats

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (1): TimeEntry

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (5): ContentEmbedding, SavedSearch, SavedSearchTag, SearchAnalytics, SearchSuggestion

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (2): importData(), ExportImport()

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (2): callAIAPI(), handleSendMessage()

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (5): Enrollment, LearningModule, LearningPath, ModuleResource, Progress

### Community 79 - "Community 79"
Cohesion: 0.53
Nodes (4): addTag(), filteredTags(), handleInputKeyDown(), removeTag()

### Community 81 - "Community 81"
Cohesion: 0.47
Nodes (3): CodeBlock(), inferCodeLanguage(), normalizeCodeLanguage()

### Community 83 - "Community 83"
Cohesion: 0.6
Nodes (5): breakDownDuration(), formatDuration(), formatDurationDetailed(), formatDurationShort(), getLargestTimeUnit()

### Community 86 - "Community 86"
Cohesion: 0.4
Nodes (1): GracefulShutdown

### Community 87 - "Community 87"
Cohesion: 0.4
Nodes (1): ErrorResponse

### Community 95 - "Community 95"
Cohesion: 0.5
Nodes (1): YouTubeChannelCache

### Community 96 - "Community 96"
Cohesion: 0.5
Nodes (1): FileAnalysis

### Community 97 - "Community 97"
Cohesion: 0.5
Nodes (3): GitHubAppInstallation, GitHubAppInstallState, GitHubRepoBackup

### Community 99 - "Community 99"
Cohesion: 0.67
Nodes (2): handleSubmit(), resetForm()

### Community 101 - "Community 101"
Cohesion: 0.67
Nodes (2): File, FileType

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (2): APIKey, BrowserExtension

### Community 103 - "Community 103"
Cohesion: 0.67
Nodes (2): ChatMessage, ChatSession

### Community 104 - "Community 104"
Cohesion: 0.67
Nodes (1): VideoBookmark

### Community 105 - "Community 105"
Cohesion: 0.67
Nodes (2): Course, LearningPathCourse

### Community 106 - "Community 106"
Cohesion: 0.67
Nodes (1): ProductionConfig

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (2): extractVideoId(), handleSubmit()

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (2): handleKeyPress(), handleSendMessage()

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (2): handleKeyPress(), handleSendMessage()

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (1): Note

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (1): User

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (1): Bookmark

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): Tag

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): GitHubUserAuth

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): ControlServiceSession

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): UserAISettings

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (1): Querier

## Knowledge Gaps
- **290 isolated node(s):** `Channel`, `ChannelInfo`, `DetectedSuggestion`, `DetectedAttachment`, `CacheEntry` (+285 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 19`** (30 nodes): `db.go`, `DBTX`, `Queries`, `.AddBookmarkTag()`, `.AddTaskTag()`, `.CreateBookmark()`, `.CreateTask()`, `.CreateUser()`, `.DeleteBookmark()`, `.DeleteTask()`, `.DeleteUser()`, `.GetBookmarkByID()`, `.GetBookmarksByTag()`, `.GetBookmarksByUser()`, `.GetTaskByID()`, `.GetTasksByStatus()`, `.GetTasksByTag()`, `.GetTasksByUser()`, `.GetUserByEmail()`, `.GetUserByID()`, `.ListUsers()`, `.RemoveBookmarkTag()`, `.RemoveTaskTag()`, `.SearchBookmarks()`, `.SearchTasks()`, `.UpdateBookmark()`, `.UpdateLastLogin()`, `.UpdateTask()`, `.UpdateUser()`, `.WithTx()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (26 nodes): `IntegrationHandler`, `.AuthorizeIntegration()`, `.CreateIntegration()`, `.DeleteIntegration()`, `.exchangeDiscordCode()`, `.exchangeGitHubCode()`, `.exchangeGoogleCode()`, `.exchangeNotionCode()`, `.exchangeSlackCode()`, `.getDiscordAuthURL()`, `.getGitHubAuthURL()`, `.getGoogleAuthURL()`, `.GetIntegration()`, `.GetIntegrations()`, `.getNotionAuthURL()`, `.getSlackAuthURL()`, `.GetSyncLogs()`, `.OAuthCallback()`, `.performSync()`, `.syncDiscord()`, `.syncGitHub()`, `.syncGoogle()`, `.SyncIntegration()`, `.syncNotion()`, `.syncSlack()`, `.UpdateIntegration()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (16 nodes): `goals_habits.go`, `NewGoalsHabitsHandler()`, `GoalsHabitsHandler`, `.CreateGoal()`, `.CreateHabit()`, `.CreateHabitEntry()`, `.DeleteGoal()`, `.DeleteHabit()`, `.GetDashboardStats()`, `.GetGoal()`, `.GetGoals()`, `.GetHabit()`, `.GetHabitEntries()`, `.GetHabits()`, `.UpdateGoal()`, `.UpdateHabit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (16 nodes): `marketplace.go`, `NewMarketplaceHandler()`, `MarketplaceHandler`, `.CreateContentShare()`, `.CreateMarketplaceItem()`, `.CreateMarketplaceReview()`, `.DeleteContentShare()`, `.DeleteMarketplaceItem()`, `.GetContentShare()`, `.GetMarketplaceItem()`, `.GetMarketplaceItems()`, `.GetMarketplaceReviews()`, `.GetMarketplaceStats()`, `.GetMyContentShares()`, `.GetMyMarketplaceItems()`, `.UpdateMarketplaceItem()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (15 nodes): `validator.go`, `Validator`, `.Clear()`, `.Email()`, `.GetError()`, `.GetErrors()`, `.HasErrors()`, `.In()`, `.Match()`, `.MaxLength()`, `.MinLength()`, `NewValidator()`, `.Required()`, `.URL()`, `.ValidatePassword()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (13 nodes): `FileUploadModal.tsx`, `addAssociation()`, `addTag()`, `canUpload()`, `getFileIcon()`, `handleDrag()`, `handleDrop()`, `handleFileSelect()`, `handleKeyDown()`, `handleUpload()`, `isValidUrl()`, `removeAssociation()`, `removeTag()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (7 nodes): `user_service_example.go`, `NewUserServiceExample()`, `UserServiceExample`, `.CreateUserExample()`, `.GetUserExample()`, `.SearchUsersExample()`, `.TransactionExample()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (7 nodes): `time_entry.go`, `TimeEntry`, `.BeforeCreate()`, `.BeforeUpdate()`, `.GetDuration()`, `.GetFormattedDuration()`, `.Stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (7 nodes): `ExportImport.tsx`, `export-import.ts`, `exportData()`, `getImportSummary()`, `importData()`, `validateImportData()`, `ExportImport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (7 nodes): `AIChat.tsx`, `callAIAPI()`, `checkMobile()`, `handleClickOutside()`, `handleSendMessage()`, `initializeAIModels()`, `startNewChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (5 nodes): `graceful_shutdown.go`, `NewGracefulShutdown()`, `GracefulShutdown`, `.AddCleanupFunc()`, `.Wait()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (5 nodes): `error_handler.go`, `ErrorHandlerMiddleware()`, `MethodNotAllowedHandler()`, `NotFoundHandler()`, `ErrorResponse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (4 nodes): `youtube_cache.go`, `YouTubeChannelCache`, `.IsExpired()`, `.TableName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (4 nodes): `file_analysis.go`, `FileAnalysis`, `.BeforeCreate()`, `.TableName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (4 nodes): `LearningPathModal.tsx`, `handleInputChange()`, `handleSubmit()`, `resetForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (3 nodes): `file.go`, `File`, `FileType`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (3 nodes): `browser_extension.go`, `APIKey`, `BrowserExtension`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (3 nodes): `chat.go`, `ChatMessage`, `ChatSession`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (3 nodes): `video_bookmark.go`, `VideoBookmark`, `.TableName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (3 nodes): `course.go`, `Course`, `LearningPathCourse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (3 nodes): `production.go`, `DefaultProductionConfig()`, `ProductionConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (3 nodes): `VideoUploadModal.tsx`, `extractVideoId()`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (3 nodes): `FloatingAI.tsx`, `handleKeyPress()`, `handleSendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (3 nodes): `AIChatPanel.tsx`, `handleKeyPress()`, `handleSendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (2 nodes): `note.go`, `Note`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (2 nodes): `user.go`, `User`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (2 nodes): `bookmark.go`, `Bookmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (2 nodes): `tag.go`, `Tag`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (2 nodes): `github_user_auth.go`, `GitHubUserAuth`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (2 nodes): `control_service_auth.go`, `ControlServiceSession`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (2 nodes): `ai_settings.go`, `UserAISettings`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (2 nodes): `querier.go`, `Querier`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GetDB()` connect `Community 4` to `Community 0`, `Community 33`, `Community 1`, `Community 3`, `Community 5`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 22`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `main()` connect `Community 3` to `Community 1`, `Community 35`, `Community 4`, `Community 39`, `Community 40`, `Community 9`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `contains()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 17`, `Community 21`, `Community 26`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 94 inferred relationships involving `GetDB()` (e.g. with `main()` and `SeedData()`) actually correct?**
  _`GetDB()` has 94 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `New()` (e.g. with `InitLogger()` and `applySuggestionAction()`) actually correct?**
  _`New()` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `contains()` (e.g. with `DetectMessageContent()` and `getDefaultFavicon()`) actually correct?**
  _`contains()` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 38 inferred relationships involving `main()` (e.g. with `Load()` and `InitDatabase()`) actually correct?**
  _`main()` has 38 INFERRED edges - model-reasoned connections that need verification._