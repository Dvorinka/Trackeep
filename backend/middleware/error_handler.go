package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
	Code    string `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

// ErrorHandlerMiddleware handles panics and errors
func ErrorHandlerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the error with stack trace
				log.Printf("Panic recovered: %v\n%s", err, debug.Stack())

				// Return error response
				c.JSON(http.StatusInternalServerError, ErrorResponse{
					Error:   "Internal server error",
					Message: "An unexpected error occurred. Please try again later.",
					Code:    "INTERNAL_ERROR",
				})

				c.Abort()
			}
		}()

		c.Next()

		// Check for errors after request processing
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			log.Printf("Request error: %v", err.Err)

			// Return appropriate error response based on status code
			statusCode := c.Writer.Status()
			if statusCode == http.StatusOK {
				statusCode = http.StatusInternalServerError
			}

			c.JSON(statusCode, ErrorResponse{
				Error:   err.Error(),
				Message: "Request processing failed",
				Code:    "REQUEST_ERROR",
			})
		}
	}
}

// NotFoundHandler handles 404 errors
func NotFoundHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "Not found",
			Message: "The requested resource was not found",
			Code:    "NOT_FOUND",
		})
	}
}

// MethodNotAllowedHandler handles 405 errors
func MethodNotAllowedHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, ErrorResponse{
			Error:   "Method not allowed",
			Message: "The HTTP method is not allowed for this endpoint",
			Code:    "METHOD_NOT_ALLOWED",
		})
	}
}
