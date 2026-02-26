package services

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WsEvent is a realtime event payload emitted by the messaging hub.
type WsEvent struct {
	Type           string      `json:"type"`
	ConversationID uint        `json:"conversation_id,omitempty"`
	Data           interface{} `json:"data,omitempty"`
	Timestamp      time.Time   `json:"timestamp"`
}

// MessagesWSClient represents one websocket connection.
type MessagesWSClient struct {
	UserID        uint
	Conn          *websocket.Conn
	Send          chan []byte
	Conversations map[uint]struct{}
}

// MessagesHub coordinates room-based websocket fanout.
type MessagesHub struct {
	mu                  sync.RWMutex
	conversationClients map[uint]map[*MessagesWSClient]struct{}
	clientConversations map[*MessagesWSClient]map[uint]struct{}
}

var defaultMessagesHub = NewMessagesHub()

// GetMessagesHub returns the shared messaging websocket hub.
func GetMessagesHub() *MessagesHub {
	return defaultMessagesHub
}

// NewMessagesHub creates a new messages websocket hub.
func NewMessagesHub() *MessagesHub {
	return &MessagesHub{
		conversationClients: make(map[uint]map[*MessagesWSClient]struct{}),
		clientConversations: make(map[*MessagesWSClient]map[uint]struct{}),
	}
}

// NewWSClient creates a ws client wrapper.
func NewWSClient(userID uint, conn *websocket.Conn) *MessagesWSClient {
	return &MessagesWSClient{
		UserID:        userID,
		Conn:          conn,
		Send:          make(chan []byte, 128),
		Conversations: make(map[uint]struct{}),
	}
}

// AddClientToConversation subscribes a client to a conversation room.
func (h *MessagesHub) AddClientToConversation(client *MessagesWSClient, conversationID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.conversationClients[conversationID]; !exists {
		h.conversationClients[conversationID] = make(map[*MessagesWSClient]struct{})
	}
	h.conversationClients[conversationID][client] = struct{}{}

	if _, exists := h.clientConversations[client]; !exists {
		h.clientConversations[client] = make(map[uint]struct{})
	}
	h.clientConversations[client][conversationID] = struct{}{}
	client.Conversations[conversationID] = struct{}{}
}

// RemoveClientFromConversation unsubscribes a client from one room.
func (h *MessagesHub) RemoveClientFromConversation(client *MessagesWSClient, conversationID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, exists := h.conversationClients[conversationID]; exists {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.conversationClients, conversationID)
		}
	}

	if convs, exists := h.clientConversations[client]; exists {
		delete(convs, conversationID)
		if len(convs) == 0 {
			delete(h.clientConversations, client)
		}
	}
	delete(client.Conversations, conversationID)
}

// RemoveClient fully unregisters a client from all rooms.
func (h *MessagesHub) RemoveClient(client *MessagesWSClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if convs, exists := h.clientConversations[client]; exists {
		for convID := range convs {
			if clients, ok := h.conversationClients[convID]; ok {
				delete(clients, client)
				if len(clients) == 0 {
					delete(h.conversationClients, convID)
				}
			}
		}
		delete(h.clientConversations, client)
	}

	close(client.Send)
}

// Broadcast emits an event to all clients in one conversation room.
func (h *MessagesHub) Broadcast(conversationID uint, eventType string, data interface{}) {
	event := WsEvent{
		Type:           eventType,
		ConversationID: conversationID,
		Data:           data,
		Timestamp:      time.Now(),
	}

	raw, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := h.conversationClients[conversationID]
	h.mu.RUnlock()

	for client := range clients {
		select {
		case client.Send <- raw:
		default:
			go h.RemoveClient(client)
		}
	}
}

// SendToUser emits an event to one user in a conversation room.
func (h *MessagesHub) SendToUser(conversationID, userID uint, eventType string, data interface{}) {
	event := WsEvent{
		Type:           eventType,
		ConversationID: conversationID,
		Data:           data,
		Timestamp:      time.Now(),
	}

	raw, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := h.conversationClients[conversationID]
	h.mu.RUnlock()

	for client := range clients {
		if client.UserID != userID {
			continue
		}
		select {
		case client.Send <- raw:
		default:
			go h.RemoveClient(client)
		}
	}
}
