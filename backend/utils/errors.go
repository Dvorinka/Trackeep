package utils

import (
	"fmt"
	"net/http"
)

type ErrorCode string

const (
	ErrInternal           ErrorCode = "INTERNAL_ERROR"
	ErrBadRequest         ErrorCode = "BAD_REQUEST"
	ErrUnauthorized       ErrorCode = "UNAUTHORIZED"
	ErrForbidden          ErrorCode = "FORBIDDEN"
	ErrNotFound           ErrorCode = "NOT_FOUND"
	ErrConflict           ErrorCode = "CONFLICT"
	ErrValidation         ErrorCode = "VALIDATION_ERROR"
	ErrRateLimit          ErrorCode = "RATE_LIMIT_EXCEEDED"
	ErrServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
)

type AppError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	Details    string    `json:"details,omitempty"`
	HTTPStatus int       `json:"-"`
}

func (e *AppError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s (%s)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func NewAppError(code ErrorCode, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
	}
}

func NewAppErrorWithDetails(code ErrorCode, message string, httpStatus int, details string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		HTTPStatus: httpStatus,
	}
}

func WrapError(err error, code ErrorCode, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    err.Error(),
		HTTPStatus: httpStatus,
	}
}

func IsAppError(err error) (*AppError, bool) {
	if appErr, ok := err.(*AppError); ok {
		return appErr, true
	}
	return nil, false
}

func BadRequest(message string) *AppError {
	return NewAppError(ErrBadRequest, message, http.StatusBadRequest)
}

func BadRequestWithDetails(message, details string) *AppError {
	return NewAppErrorWithDetails(ErrBadRequest, message, http.StatusBadRequest, details)
}

func Unauthorized(message string) *AppError {
	return NewAppError(ErrUnauthorized, message, http.StatusUnauthorized)
}

func Forbidden(message string) *AppError {
	return NewAppError(ErrForbidden, message, http.StatusForbidden)
}

func NotFound(message string) *AppError {
	return NewAppError(ErrNotFound, message, http.StatusNotFound)
}

func Conflict(message string) *AppError {
	return NewAppError(ErrConflict, message, http.StatusConflict)
}

func ValidationErr(message string) *AppError {
	return NewAppError(ErrValidation, message, http.StatusBadRequest)
}

func InternalError(message string) *AppError {
	return NewAppError(ErrInternal, message, http.StatusInternalServerError)
}

func InternalErrorWithDetails(message, details string) *AppError {
	return NewAppErrorWithDetails(ErrInternal, message, http.StatusInternalServerError, details)
}

func RateLimitExceeded(message string) *AppError {
	return NewAppError(ErrRateLimit, message, http.StatusTooManyRequests)
}

func ServiceUnavailable(message string) *AppError {
	return NewAppError(ErrServiceUnavailable, message, http.StatusServiceUnavailable)
}
