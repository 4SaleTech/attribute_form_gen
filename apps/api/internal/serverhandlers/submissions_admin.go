package serverhandlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Submission struct {
	ID             uint64                 `json:"id"`
	FormID         string                 `json:"formId"`
	Version        int                    `json:"version"`
	SubmittedAt    int64                  `json:"submittedAt"`
	Locale         string                 `json:"locale"`
	Device         string                 `json:"device"`
	Answers        map[string]interface{} `json:"answers"`
	Attributes     map[string]interface{} `json:"attributes"`
	IdempotencyKey *string                `json:"idempotencyKey"`
	WebhookStatus  string                 `json:"webhookStatus"`
	CreatedAt      string                 `json:"createdAt"`
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

