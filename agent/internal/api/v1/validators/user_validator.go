package validators

import (
	"net/http"
	"strconv"
	"strings"

	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"

	"github.com/gin-gonic/gin"
)

const (
	usersXmlStorage = "users_xml"
	usersXmlMessage = "user is defined in users.xml file on the server"
)

// RejectUserFromUsersXml writes 400 Bad Request and returns true if userDetails is not nil and
// user storage is users_xml. Use for all user update/delete endpoints. Returns false otherwise.
func RejectUserFromUsersXml(c *gin.Context, userDetails *chmodels.UserDetails, errorLabel string) bool {
	if userDetails != nil && userDetails.Storage == usersXmlStorage {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   errorLabel,
			Message: usersXmlMessage,
		})
		return true
	}
	return false
}

// UsersXmlErrorResponse returns a 400 ErrorResponse for users.xml restriction. Use when mapping repo error to response.
func UsersXmlErrorResponse(errorLabel string) apiSystemModels.ErrorResponse {
	return apiSystemModels.ErrorResponse{
		Error:   errorLabel,
		Message: usersXmlMessage,
	}
}

// IsUsersXmlError returns true if err indicates user is defined in users.xml.
func IsUsersXmlError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "users.xml file")
}

// ParseClickHouseSettingsError maps ClickHouse UpdateUserSettings errors to a 400 Bad Request
// response when the error is a known validation/parse error. Returns (response, true) if the
// error should be returned as 400, or (nil, false) for unknown errors (caller should use 500).
func ParseClickHouseSettingsError(err error) (*apiSystemModels.ErrorResponse, bool) {
	if err == nil {
		return nil, false
	}
	errStr := err.Error()

	switch {
	case strings.Contains(errStr, "Cannot parse bool") || strings.Contains(errStr, "code: 467"):
		return &apiSystemModels.ErrorResponse{
			Error:   "Invalid setting value",
			Message: "One or more settings expect a boolean value. Use 0, 1, true or false for boolean settings.",
		}, true
	case strings.Contains(errStr, "Cannot parse number"):
		return &apiSystemModels.ErrorResponse{
			Error:   "Invalid setting value",
			Message: "One or more settings expect a numeric value. Check that values are valid numbers.",
		}, true
	case strings.Contains(errStr, "Cannot read floating point value") || strings.Contains(errStr, "code: 72"):
		return &apiSystemModels.ErrorResponse{
			Error:   "Invalid setting value",
			Message: "One or more settings expect a numeric value. Empty values are not allowed for numeric settings.",
		}, true
	case strings.Contains(errStr, "Unexpected value") || strings.Contains(errStr, "code: 213"):
		return &apiSystemModels.ErrorResponse{
			Error:   "Invalid setting value",
			Message: "One or more settings expect a specific value. Empty values are not allowed; use one of the allowed values for enum/string settings.",
		}, true
	case strings.Contains(errStr, "Unknown setting") || strings.Contains(errStr, "code: 115"):
		return &apiSystemModels.ErrorResponse{
			Error:   "Invalid setting",
			Message: "One or more setting names are not valid or not supported by this ClickHouse version.",
		}, true
	default:
		return nil, false
	}
}

// ValidateUserSettingsInput checks that each setting has non-empty name and value, and that
// values match the expected type from typeBySetting (name -> type from system.settings).
// If typeBySetting is nil or empty, only empty name/value are validated.
// Returns a non-nil error with a user-facing message when validation fails.
func ValidateUserSettingsInput(pairs []repository.UserSettingPair, typeBySetting map[string]string) error {
	for _, p := range pairs {
		name := strings.TrimSpace(p.Name)
		value := strings.TrimSpace(p.Value)

		if name == "" {
			return &ValidationError{Message: "Setting name cannot be empty."}
		}
		if value == "" {
			return &ValidationError{Message: "Setting value cannot be empty. Setting: " + name}
		}

		settingType := typeBySetting[name]
		if settingType == "" {
			continue // unknown setting: allow, ClickHouse will reject with "Unknown setting" if invalid
		}

		if err := validateSettingValueByType(value, settingType, name); err != nil {
			return err
		}
	}
	return nil
}

func validateSettingValueByType(value, settingType, name string) error {
	switch settingType {
	case "Bool":
		if !isValidBool(value) {
			return &ValidationError{Message: "Setting \"" + name + "\" expects a boolean value (0, 1, true or false)."}
		}
	case "UInt64", "Int64", "Float64", "UInt32", "Int32", "Float32":
		if !isValidNumber(value) {
			return &ValidationError{Message: "Setting \"" + name + "\" expects a numeric value."}
		}
	default:
		// String, enum-like, Seconds, etc.: non-empty already checked
	}
	return nil
}

func isValidBool(s string) bool {
	switch strings.ToLower(s) {
	case "0", "1", "true", "false":
		return true
	}
	return false
}

func isValidNumber(s string) bool {
	if s == "" {
		return false
	}
	if _, err := strconv.ParseInt(s, 10, 64); err == nil {
		return true
	}
	if _, err := strconv.ParseUint(s, 10, 64); err == nil {
		return true
	}
	if _, err := strconv.ParseFloat(s, 64); err == nil {
		return true
	}
	return false
}

// ValidationError is returned by ValidateUserSettingsInput for input validation failures.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
