package serverhandlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Submission struct {
	ID             uint64      `json:"id"`
	FormID         string      `json:"formId"`
	Version        int         `json:"version"`
	SubmittedAt    int64       `json:"submittedAt"`
	Locale         string      `json:"locale"`
	Device         string      `json:"device"`
	Answers        interface{} `json:"answers"` // Can be map[string]interface{} or []map[string]string
	Attributes     map[string]interface{} `json:"attributes"`
	IdempotencyKey *string     `json:"idempotencyKey"`
	WebhookStatus  string      `json:"webhookStatus"`
	CreatedAt      string      `json:"createdAt"`
}

func ListSubmissionsHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		formId := c.Query("formId")
		versionStr := c.Query("version")
		limitStr := c.DefaultQuery("limit", "100")
		offsetStr := c.DefaultQuery("offset", "0")

		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			limit = 100
		}
		if limit > 1000 {
			limit = 1000
		}

		offset, err := strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			offset = 0
		}

		var query string
		var args []interface{}

		if formId != "" && versionStr != "" {
			version, err := strconv.Atoi(versionStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version"})
				return
			}
			query = "SELECT id, form_id, version, submitted_at, locale, device, answers_json, attributes_json, idempotency_key, webhook_status, created_at FROM submissions WHERE form_id=? AND version=? ORDER BY submitted_at DESC LIMIT ? OFFSET ?"
			args = []interface{}{formId, version, limit, offset}
		} else if formId != "" {
			query = "SELECT id, form_id, version, submitted_at, locale, device, answers_json, attributes_json, idempotency_key, webhook_status, created_at FROM submissions WHERE form_id=? ORDER BY submitted_at DESC LIMIT ? OFFSET ?"
			args = []interface{}{formId, limit, offset}
		} else {
			query = "SELECT id, form_id, version, submitted_at, locale, device, answers_json, attributes_json, idempotency_key, webhook_status, created_at FROM submissions ORDER BY submitted_at DESC LIMIT ? OFFSET ?"
			args = []interface{}{limit, offset}
		}

		rows, err := db.Query(query, args...)
		if err != nil {
			log.Error("failed to query submissions", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query submissions"})
			return
		}
		defer rows.Close()

		var submissions []Submission
		for rows.Next() {
			var s Submission
			var answersJSON, attributesJSON string
			var idempotencyKey sql.NullString

			err := rows.Scan(
				&s.ID,
				&s.FormID,
				&s.Version,
				&s.SubmittedAt,
				&s.Locale,
				&s.Device,
				&answersJSON,
				&attributesJSON,
				&idempotencyKey,
				&s.WebhookStatus,
				&s.CreatedAt,
			)
			if err != nil {
				log.Error("failed to scan submission", zap.Error(err))
				continue
			}

			if err := json.Unmarshal([]byte(answersJSON), &s.Answers); err != nil {
				log.Warn("failed to unmarshal answers_json", zap.Error(err), zap.Uint64("id", s.ID))
				s.Answers = make(map[string]interface{})
			}

			if err := json.Unmarshal([]byte(attributesJSON), &s.Attributes); err != nil {
				log.Warn("failed to unmarshal attributes_json", zap.Error(err), zap.Uint64("id", s.ID))
				s.Attributes = make(map[string]interface{})
			}

			if idempotencyKey.Valid {
				s.IdempotencyKey = &idempotencyKey.String
			}

			submissions = append(submissions, s)
		}

		if err := rows.Err(); err != nil {
			log.Error("error iterating submissions", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to iterate submissions"})
			return
		}

		c.JSON(http.StatusOK, submissions)
	}
}

func GetSubmissionHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid submission id"})
			return
		}

		format := c.DefaultQuery("format", "object") // "object" or "array"

		var s Submission
		var answersJSON, attributesJSON string
		var idempotencyKey sql.NullString

		err = db.QueryRow(
			"SELECT id, form_id, version, submitted_at, locale, device, answers_json, attributes_json, idempotency_key, webhook_status, created_at FROM submissions WHERE id=?",
			id,
		).Scan(
			&s.ID,
			&s.FormID,
			&s.Version,
			&s.SubmittedAt,
			&s.Locale,
			&s.Device,
			&answersJSON,
			&attributesJSON,
			&idempotencyKey,
			&s.WebhookStatus,
			&s.CreatedAt,
		)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
				return
			}
			log.Error("failed to query submission", zap.Error(err), zap.Uint64("id", id))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query submission"})
			return
		}

		var answersMap map[string]interface{}
		if err := json.Unmarshal([]byte(answersJSON), &answersMap); err != nil {
			log.Warn("failed to unmarshal answers_json", zap.Error(err), zap.Uint64("id", s.ID))
			answersMap = make(map[string]interface{})
		}

		if err := json.Unmarshal([]byte(attributesJSON), &s.Attributes); err != nil {
			log.Warn("failed to unmarshal attributes_json", zap.Error(err), zap.Uint64("id", s.ID))
			s.Attributes = make(map[string]interface{})
		}

		if idempotencyKey.Valid {
			s.IdempotencyKey = &idempotencyKey.String
		}

		// If format=array, transform answers to array format
		if format == "array" {
			// Fetch form fields to get labels
			var fieldsJSON []byte
			err = db.QueryRow(
				"SELECT fields_json FROM form_snapshots WHERE form_id=? AND version=?",
				s.FormID, s.Version,
			).Scan(&fieldsJSON)

			if err != nil {
				log.Warn("failed to fetch form fields for array format", zap.Error(err))
				// Fallback to object format if form not found
				s.Answers = answersMap
			} else {
				var fields []map[string]interface{}
				if err := json.Unmarshal(fieldsJSON, &fields); err != nil {
					log.Warn("failed to unmarshal fields_json", zap.Error(err))
					s.Answers = answersMap
				} else {
					// Build field labels map
					fieldLabels := make(map[string]string)
					locale := s.Locale
					if locale == "" {
						locale = "en"
					}
					for _, field := range fields {
						name, _ := field["name"].(string)
						if labelMap, ok := field["label"].(map[string]interface{}); ok {
							if label, ok := labelMap[locale].(string); ok && label != "" {
								fieldLabels[name] = label
							} else if label, ok := labelMap["en"].(string); ok && label != "" {
								fieldLabels[name] = label // fallback to English
							} else {
								fieldLabels[name] = name // fallback to field name
							}
						} else {
							fieldLabels[name] = name // fallback to field name
						}
					}

					// Transform answers to array format
					answersArray := transformAnswersToArrayAdmin(answersMap, fieldLabels, locale)
					s.Answers = answersArray
				}
			}
		} else {
			s.Answers = answersMap
		}

		c.JSON(http.StatusOK, s)
	}
}

// transformAnswersToArrayAdmin transforms answers map to array format with question labels
func transformAnswersToArrayAdmin(answers map[string]interface{}, fieldLabels map[string]string, locale string) []map[string]string {
	result := []map[string]string{}

	for fieldName, value := range answers {
		// Get label (question text user sees)
		questionLabel := fieldLabels[fieldName]
		if questionLabel == "" {
			questionLabel = fieldName // fallback to field name
		}

		// Format answer based on type
		answerStr := formatAnswerForArray(value, locale)

		result = append(result, map[string]string{
			"question": questionLabel,
			"answer":   answerStr,
		})
	}

	return result
}

// formatAnswerForArray formats an answer value to a string representation for array format
func formatAnswerForArray(value interface{}, locale string) string {
	if value == nil {
		return ""
	}

	switch v := value.(type) {
	case string:
		return v
	case float64:
		// Check if it's a whole number
		if v == float64(int64(v)) {
			return strconv.FormatInt(int64(v), 10)
		}
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		if v {
			if locale == "ar" {
				return "نعم"
			}
			return "Yes"
		}
		if locale == "ar" {
			return "لا"
		}
		return "No"
	case map[string]interface{}:
		// Phone number: extract e164
		if e164, ok := v["e164"].(string); ok {
			return e164
		}
		// Select/Radio with "other": use the "other" text
		if val, ok := v["value"].(string); ok {
			if val == "other" {
				if other, ok := v["other"].(string); ok && other != "" {
					return other
				}
			}
			return val
		}
		// Location: format coordinates
		if lat, ok := v["lat"].(float64); ok {
			lng, _ := v["lng"].(float64)
			return fmt.Sprintf("%.6f, %.6f", lat, lng)
		}
		// File upload: return URL
		if url, ok := v["url"].(string); ok {
			return url
		}
		// Default: JSON string
		b, _ := json.Marshal(v)
		return string(b)
	case []interface{}:
		// Multiselect or file array: format as comma-separated
		values := []string{}
		for _, item := range v {
			if itemMap, ok := item.(map[string]interface{}); ok {
				// Check for "other" option
				if val, ok := itemMap["value"].(string); ok {
					if val == "other" {
						if other, ok := itemMap["other"].(string); ok && other != "" {
							values = append(values, other)
							continue
						}
					}
					values = append(values, val)
					continue
				}
				// File upload: use URL or name
				if url, ok := itemMap["url"].(string); ok {
					values = append(values, url)
					continue
				}
				if name, ok := itemMap["name"].(string); ok {
					values = append(values, name)
					continue
				}
				// Default: JSON string
				b, _ := json.Marshal(itemMap)
				values = append(values, string(b))
			} else {
				values = append(values, fmt.Sprintf("%v", item))
			}
		}
		return strings.Join(values, ", ")
	default:
		return fmt.Sprintf("%v", v)
	}
}

