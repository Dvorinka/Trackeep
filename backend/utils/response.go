package utils

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// APIResponse represents a standard API response
type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message"`
	Error     string      `json:"error,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	RequestID string      `json:"request_id,omitempty"`
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	APIResponse
	Pagination PaginationInfo `json:"pagination"`
}

// PaginationInfo contains pagination metadata
type PaginationInfo struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// Success sends a successful response
func Success(c *gin.Context, data interface{}, message ...string) {
	msg := "Operation successful"
	if len(message) > 0 {
		msg = message[0]
	}

	response := APIResponse{
		Success:   true,
		Data:      data,
		Message:   msg,
		Timestamp: time.Now(),
		RequestID: c.GetString("RequestID"),
	}

	c.JSON(http.StatusOK, response)
}

// Error sends an error response
func Error(c *gin.Context, statusCode int, err error, message ...string) {
	msg := "An error occurred"
	if len(message) > 0 {
		msg = message[0]
	}

	response := APIResponse{
		Success:   false,
		Message:   msg,
		Error:     err.Error(),
		Timestamp: time.Now(),
		RequestID: c.GetString("RequestID"),
	}

	c.JSON(statusCode, response)
}

// ValidationError sends a validation error response
func ValidationError(c *gin.Context, errors interface{}) {
	response := APIResponse{
		Success:   false,
		Message:   "Validation failed",
		Error:     "Invalid input data",
		Data:      errors,
		Timestamp: time.Now(),
		RequestID: c.GetString("RequestID"),
	}

	c.JSON(http.StatusBadRequest, response)
}

// Paginated sends a paginated response
func Paginated(c *gin.Context, data interface{}, pagination PaginationInfo, message ...string) {
	msg := "Data retrieved successfully"
	if len(message) > 0 {
		msg = message[0]
	}

	response := PaginatedResponse{
		APIResponse: APIResponse{
			Success:   true,
			Data:      data,
			Message:   msg,
			Timestamp: time.Now(),
			RequestID: c.GetString("RequestID"),
		},
		Pagination: pagination,
	}

	c.JSON(http.StatusOK, response)
}

// CalculatePagination calculates pagination information
func CalculatePagination(page, perPage int, total int64) PaginationInfo {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	hasNext := page < totalPages
	hasPrev := page > 1

	return PaginationInfo{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    hasNext,
		HasPrev:    hasPrev,
	}
}

// Created sends a created response
func Created(c *gin.Context, data interface{}, message ...string) {
	msg := "Resource created successfully"
	if len(message) > 0 {
		msg = message[0]
	}

	response := APIResponse{
		Success:   true,
		Data:      data,
		Message:   msg,
		Timestamp: time.Now(),
		RequestID: c.GetString("RequestID"),
	}

	c.JSON(http.StatusCreated, response)
}

// Updated sends an updated response
func Updated(c *gin.Context, data interface{}, message ...string) {
	msg := "Resource updated successfully"
	if len(message) > 0 {
		msg = message[0]
	}

	response := APIResponse{
		Success:   true,
		Data:      data,
		Message:   msg,
		Timestamp: time.Now(),
		RequestID: c.GetString("RequestID"),
	}

	c.JSON(http.StatusOK, response)
}

// Deleted sends a deleted response
func Deleted(c *gin.Context, message ...string) {
	msg := "Resource deleted successfully"
	if len(message) > 0 {
		msg = message[0]
	}

	response := APIResponse{
		Success:   true,
		Message:   msg,
		Timestamp: time.Now(),
		RequestID: c.GetString("RequestID"),
	}

	c.JSON(http.StatusOK, response)
}
