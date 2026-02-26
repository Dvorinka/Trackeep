package models

import (
	"time"

	"gorm.io/gorm"
)

// ConversationType represents the type of a conversation.
type ConversationType string

const (
	ConversationTypeGlobal        ConversationType = "global"
	ConversationTypeTeam          ConversationType = "team"
	ConversationTypeGroup         ConversationType = "group"
	ConversationTypeDM            ConversationType = "dm"
	ConversationTypeSelf          ConversationType = "self"
	ConversationTypePasswordVault ConversationType = "password_vault"
)

// ConversationMemberRole represents the role of a user in a conversation.
type ConversationMemberRole string

const (
	ConversationMemberRoleOwner  ConversationMemberRole = "owner"
	ConversationMemberRoleAdmin  ConversationMemberRole = "admin"
	ConversationMemberRoleMember ConversationMemberRole = "member"
	ConversationMemberRoleViewer ConversationMemberRole = "viewer"
)

// SuggestionStatus is the lifecycle state of a message suggestion.
type SuggestionStatus string

const (
	SuggestionStatusPending   SuggestionStatus = "pending"
	SuggestionStatusAccepted  SuggestionStatus = "accepted"
	SuggestionStatusDismissed SuggestionStatus = "dismissed"
)

// Conversation is a user-to-user chat space (global/team/group/dm/self/password).
type Conversation struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Type       ConversationType `json:"type" gorm:"not null;index"`
	Name       string           `json:"name" gorm:"not null"`
	Topic      string           `json:"topic"`
	TeamID     *uint            `json:"team_id,omitempty" gorm:"index"`
	Team       *Team            `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	CreatedBy  uint             `json:"created_by" gorm:"not null;index"`
	Creator    User             `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
	IsDefault  bool             `json:"is_default" gorm:"default:false;index"`
	IsArchived bool             `json:"is_archived" gorm:"default:false;index"`

	LastMessageAt *time.Time `json:"last_message_at"`

	Members  []ConversationMember `json:"members,omitempty" gorm:"foreignKey:ConversationID"`
	Messages []Message            `json:"messages,omitempty" gorm:"foreignKey:ConversationID"`
}

// ConversationMember links users to conversations.
type ConversationMember struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	ConversationID uint                   `json:"conversation_id" gorm:"not null;index:idx_conv_member,unique"`
	UserID         uint                   `json:"user_id" gorm:"not null;index:idx_conv_member,unique"`
	Role           ConversationMemberRole `json:"role" gorm:"not null;default:member"`
	JoinedAt       time.Time              `json:"joined_at"`

	LastReadMessageID *uint      `json:"last_read_message_id,omitempty" gorm:"index"`
	LastReadAt        *time.Time `json:"last_read_at,omitempty"`
	MutedUntil        *time.Time `json:"muted_until,omitempty"`
	IsHidden          bool       `json:"is_hidden" gorm:"default:false"`

	Conversation Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Message is a single chat message in a conversation.
type Message struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	ConversationID uint         `json:"conversation_id" gorm:"not null;index"`
	Conversation   Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
	SenderID       uint         `json:"sender_id" gorm:"not null;index"`
	Sender         User         `json:"sender,omitempty" gorm:"foreignKey:SenderID"`

	Body        string     `json:"body" gorm:"type:text"`
	IsSensitive bool       `json:"is_sensitive" gorm:"default:false"`
	EditedAt    *time.Time `json:"edited_at,omitempty"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	MetadataJSON string `json:"metadata_json" gorm:"type:text"`

	Attachments []MessageAttachment `json:"attachments,omitempty" gorm:"foreignKey:MessageID"`
	References  []MessageReference  `json:"references,omitempty" gorm:"foreignKey:MessageID"`
	Suggestions []MessageSuggestion `json:"suggestions,omitempty" gorm:"foreignKey:MessageID"`
	Reactions   []MessageReaction   `json:"reactions,omitempty" gorm:"foreignKey:MessageID"`
}

// MessageAttachment represents file/link-style message attachments.
type MessageAttachment struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	MessageID uint    `json:"message_id" gorm:"not null;index"`
	Message   Message `json:"message,omitempty" gorm:"foreignKey:MessageID"`

	Kind        string `json:"kind" gorm:"not null;index"` // file,image,youtube,github,website,bookmark,task,event,calendar,activity,learning_path,saved_search,voice_note
	FileID      *uint  `json:"file_id,omitempty" gorm:"index"`
	URL         string `json:"url"`
	Title       string `json:"title"`
	PreviewJSON string `json:"preview_json" gorm:"type:text"`
}

// MessageReference maps chat messages to Trackeep entities.
type MessageReference struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	MessageID uint    `json:"message_id" gorm:"not null;index"`
	Message   Message `json:"message,omitempty" gorm:"foreignKey:MessageID"`

	EntityType string `json:"entity_type" gorm:"not null;index"`
	EntityID   uint   `json:"entity_id" gorm:"not null;index"`
	DeepLink   string `json:"deep_link" gorm:"not null"`
}

// MessageSuggestion stores non-blocking smart suggestions triggered by message text.
type MessageSuggestion struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	MessageID uint    `json:"message_id" gorm:"not null;index"`
	Message   Message `json:"message,omitempty" gorm:"foreignKey:MessageID"`

	Type        string           `json:"type" gorm:"not null;index"` // create_task, create_event, save_bookmark, ...
	PayloadJSON string           `json:"payload_json" gorm:"type:text"`
	Status      SuggestionStatus `json:"status" gorm:"not null;default:pending;index"`
}

// MessageReaction stores emoji reactions.
type MessageReaction struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	MessageID uint    `json:"message_id" gorm:"not null;index:idx_message_reaction,unique"`
	Message   Message `json:"message,omitempty" gorm:"foreignKey:MessageID"`
	UserID    uint    `json:"user_id" gorm:"not null;index:idx_message_reaction,unique"`
	User      User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Emoji     string  `json:"emoji" gorm:"not null;index:idx_message_reaction,unique"`
}

// PasswordVaultItem is encrypted secret data owned by a user.
type PasswordVaultItem struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	OwnerUserID uint `json:"owner_user_id" gorm:"not null;index"`
	OwnerUser   User `json:"owner_user,omitempty" gorm:"foreignKey:OwnerUserID"`

	Label           string     `json:"label" gorm:"not null"`
	EncryptedSecret string     `json:"-" gorm:"type:text;not null"`
	EncryptedNotes  string     `json:"-" gorm:"type:text"`
	SourceMessageID *uint      `json:"source_message_id,omitempty" gorm:"index"`
	SourceMessage   *Message   `json:"source_message,omitempty" gorm:"foreignKey:SourceMessageID"`
	CreatedBy       uint       `json:"created_by" gorm:"not null;index"`
	LastAccessedAt  *time.Time `json:"last_accessed_at,omitempty"`

	Shares []PasswordVaultShare `json:"shares,omitempty" gorm:"foreignKey:VaultItemID"`
}

// PasswordVaultShare controls explicit sharing of vault items.
type PasswordVaultShare struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	VaultItemID uint              `json:"vault_item_id" gorm:"not null;index"`
	VaultItem   PasswordVaultItem `json:"vault_item,omitempty" gorm:"foreignKey:VaultItemID"`

	SharedByUserID       uint         `json:"shared_by_user_id" gorm:"not null;index"`
	SharedByUser         User         `json:"shared_by_user,omitempty" gorm:"foreignKey:SharedByUserID"`
	TargetConversationID uint         `json:"target_conversation_id" gorm:"not null;index"`
	TargetConversation   Conversation `json:"target_conversation,omitempty" gorm:"foreignKey:TargetConversationID"`
	ExpiresAt            *time.Time   `json:"expires_at,omitempty"`
	AllowReveal          bool         `json:"allow_reveal" gorm:"default:false"`
}
