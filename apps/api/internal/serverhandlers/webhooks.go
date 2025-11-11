package serverhandlers

import (
    "bytes"
    "crypto/hmac"
    "crypto/sha256"
    "database/sql"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "strings"
    "time"
    "text/template"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

type webhookReq struct {
    Type           string            `json:"type"`
    Endpoint       string            `json:"endpoint_url"`
    Method         string            `json:"http_method"`
    ContentType    string            `json:"content_type"`
    Headers        map[string]string `json:"headers"`
    Mode           string            `json:"mode"`
    Enabled        bool              `json:"enabled"`
    BodyTemplate   string            `json:"body_template"`
    SelectedFields []string          `json:"selected_fields"`
}

func ListWebhooksHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        formId := c.Param("formId")
        versionStr := c.Param("version")
        var version int
        if _, err := fmt.Sscanf(versionStr, "%d", &version); err != nil {
            log.Error("invalid version parameter", zap.String("version", versionStr), zap.Error(err))
            c.JSON(http.StatusBadRequest, gin.H{"error":"invalid version"})
            return
        }
        // Try new schema first (with content_type, body_template, selected_fields_json)
        rows, err := db.Query("SELECT id,type,endpoint_url,http_method,content_type,headers_json,body_template,selected_fields_json,mode,enabled FROM form_webhooks WHERE form_id=? AND version=?", formId, version)
        if err != nil {
            // If columns don't exist, fallback to old schema
            if strings.Contains(err.Error(), "Unknown column") {
                log.Warn("list webhooks: new schema failed, trying old schema", zap.Error(err))
                rows, err = db.Query("SELECT id,type,endpoint_url,http_method,'application/json' as content_type,headers_json,NULL as body_template,NULL as selected_fields_json,mode,enabled FROM form_webhooks WHERE form_id=? AND version=?", formId, version)
            }
            if err != nil {
                log.Error("failed to query webhooks", zap.Error(err), zap.String("formId", formId), zap.Int("version", version))
                c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
                return
            }
        }
        defer rows.Close()
        out := []gin.H{}
        for rows.Next() {
            var id uint64; var typ, url, method, contentType, mode string; var headersRaw []byte; var enabled bool; var bodyTpl *string; var selectedFieldsRaw []byte
            if err := rows.Scan(&id, &typ, &url, &method, &contentType, &headersRaw, &bodyTpl, &selectedFieldsRaw, &mode, &enabled); err != nil {
                log.Error("failed to scan webhook", zap.Error(err))
                continue
            }
            var headers map[string]string
            if len(headersRaw) > 0 {
                if err := json.Unmarshal(headersRaw, &headers); err != nil {
                    log.Error("failed to unmarshal headers", zap.Error(err))
                    headers = map[string]string{}
                }
            } else {
                headers = map[string]string{}
            }
            var selectedFields []string
            if len(selectedFieldsRaw) > 0 {
                if err := json.Unmarshal(selectedFieldsRaw, &selectedFields); err != nil {
                    log.Error("failed to unmarshal selected_fields", zap.Error(err))
                    selectedFields = []string{}
                }
            }
            // Ensure selectedFields is never nil (use empty array)
            if selectedFields == nil {
                selectedFields = []string{}
            }
            out = append(out, gin.H{"id": id, "type": typ, "endpoint_url": url, "http_method": method, "content_type": contentType, "headers": headers, "body_template": nullSafe(bodyTpl), "selected_fields": selectedFields, "mode": mode, "enabled": enabled})
        }
        if err := rows.Err(); err != nil {
            log.Error("error iterating webhooks", zap.Error(err))
            c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
            return
        }
        c.JSON(http.StatusOK, out)
    }
}

func CreateWebhookHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        formId := c.Param("formId")
        versionStr := c.Param("version")
        var version int
        if _, err := fmt.Sscanf(versionStr, "%d", &version); err != nil {
            log.Error("invalid version parameter", zap.String("version", versionStr), zap.Error(err))
            c.JSON(http.StatusBadRequest, gin.H{"error":"invalid version"})
            return
        }
        var req webhookReq
        if err := c.BindJSON(&req); err != nil {
            log.Error("invalid json", zap.Error(err))
            c.JSON(http.StatusBadRequest, gin.H{"error":"json"})
            return
        }
        hdrs, _ := json.Marshal(req.Headers)
        selectedFieldsJSON, _ := json.Marshal(req.SelectedFields)
        if req.Method == "" { req.Method = "POST" }
        if req.ContentType == "" { req.ContentType = "application/json" }
        
        // Try INSERT with new schema first (with content_type, body_template, selected_fields_json)
        _, err := db.Exec("INSERT INTO form_webhooks(form_id,version,type,endpoint_url,http_method,content_type,headers_json,body_template,selected_fields_json,mode,enabled) VALUES(?,?,?,?,?,?,?,?,?,?,?)", formId, version, req.Type, req.Endpoint, req.Method, req.ContentType, string(hdrs), emptyIf(req.BodyTemplate), nullIfEmptySelectedFields(string(selectedFieldsJSON)), req.Mode, req.Enabled)
        if err != nil {
            // If columns don't exist, try old schema
            if strings.Contains(err.Error(), "Unknown column") {
                log.Warn("insert with new schema failed (missing columns), trying old schema", zap.Error(err))
                _, err = db.Exec("INSERT INTO form_webhooks(form_id,version,type,endpoint_url,http_method,headers_json,mode,enabled) VALUES(?,?,?,?,?,?,?,?)", formId, version, req.Type, req.Endpoint, req.Method, string(hdrs), req.Mode, req.Enabled)
            }
            if err != nil {
                log.Error("failed to insert webhook", zap.Error(err), zap.String("formId", formId), zap.Int("version", version))
                c.JSON(http.StatusBadRequest, gin.H{"error":"insert"})
                return
            }
        }
        c.Status(http.StatusCreated)
    }
}

func UpdateWebhookHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")
        var req webhookReq
        if err := c.BindJSON(&req); err != nil {
            log.Error("invalid json", zap.Error(err))
            c.JSON(http.StatusBadRequest, gin.H{"error":"json"})
            return
        }
        hdrs, _ := json.Marshal(req.Headers)
        selectedFieldsJSON, _ := json.Marshal(req.SelectedFields)
        if req.Method == "" { req.Method = "POST" }
        if req.ContentType == "" { req.ContentType = "application/json" }
        
        // Validate type and mode (should only be 'http' and 'raw' now)
        if req.Type != "http" {
            log.Error("invalid webhook type", zap.String("type", req.Type))
            c.JSON(http.StatusBadRequest, gin.H{"error":"invalid type, must be 'http'"})
            return
        }
        if req.Mode != "raw" {
            log.Error("invalid webhook mode", zap.String("mode", req.Mode))
            c.JSON(http.StatusBadRequest, gin.H{"error":"invalid mode, must be 'raw'"})
            return
        }
        
        // Try UPDATE with content_type, body_template, and selected_fields_json first (new schema)
        _, err := db.Exec("UPDATE form_webhooks SET type=?, endpoint_url=?, http_method=?, content_type=?, headers_json=?, body_template=?, selected_fields_json=?, mode=?, enabled=? WHERE id=?", req.Type, req.Endpoint, req.Method, req.ContentType, string(hdrs), emptyIf(req.BodyTemplate), nullIfEmptySelectedFields(string(selectedFieldsJSON)), req.Mode, req.Enabled, id)
        if err != nil {
            // Check if error is due to missing columns
            errStr := err.Error()
            if strings.Contains(errStr, "Unknown column") {
                // Fallback to old schema (without content_type, body_template, and selected_fields_json)
                log.Warn("update with new schema failed (missing columns), trying old schema", zap.Error(err))
                _, err2 := db.Exec("UPDATE form_webhooks SET type=?, endpoint_url=?, http_method=?, headers_json=?, mode=?, enabled=? WHERE id=?", req.Type, req.Endpoint, req.Method, string(hdrs), req.Mode, req.Enabled, id)
                if err2 != nil {
                    log.Error("failed to update webhook", zap.Error(err2), zap.String("id", id))
                    c.JSON(http.StatusBadRequest, gin.H{"error":"update", "details": err2.Error()})
                    return
                }
            } else {
                // Other error (e.g., enum constraint violation)
                log.Error("failed to update webhook", zap.Error(err), zap.String("id", id), zap.String("type", req.Type), zap.String("mode", req.Mode))
                c.JSON(http.StatusBadRequest, gin.H{"error":"update", "details": err.Error()})
                return
            }
        }
        c.Status(http.StatusNoContent)
    }
}

func DeleteWebhookHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")
        _, err := db.Exec("DELETE FROM form_webhooks WHERE id=?", id)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"delete"}); return }
        c.Status(http.StatusNoContent)
    }
}

func nullSafe(s *string) string { if s == nil { return "" }; return *s }
func emptyIf(s string) any { if s == "" { return nil }; return s }
func nullIfEmptySelectedFields(s string) any { if s == "" || s == "null" || s == "[]" { return nil }; return s }

type TestWebhookResponse struct {
	Success         bool              `json:"success"`
	StatusCode      int               `json:"statusCode"`
	StatusText      string            `json:"statusText"`
	ResponseBody    string            `json:"responseBody"`
	ResponseHeaders map[string]string `json:"responseHeaders"`
	DurationMs      int64             `json:"durationMs"`
	Error           string            `json:"error,omitempty"`
	RequestURL      string            `json:"requestUrl"`
	RequestMethod   string            `json:"requestMethod"`
	RequestBody     string            `json:"requestBody"`
}

func TestWebhookHandler(db *sql.DB, cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		formId := c.Param("formId")
		versionStr := c.Param("version")
		webhookId := c.Param("id")
		
		var version int
		if _, err := fmt.Sscanf(versionStr, "%d", &version); err != nil {
			log.Error("invalid version parameter", zap.String("version", versionStr), zap.Error(err))
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version"})
			return
		}

		// Fetch webhook configuration (with schema compatibility)
		var typ, url, method, contentType, mode string
		var headersRaw []byte
		var enabled bool
		var bodyTpl sql.NullString
		var selectedFieldsRaw []byte
		// Try new schema first (with content_type, body_template, selected_fields_json)
		err := db.QueryRow("SELECT type,endpoint_url,http_method,content_type,headers_json,body_template,selected_fields_json,mode,enabled FROM form_webhooks WHERE id=? AND form_id=? AND version=?", webhookId, formId, version).Scan(&typ, &url, &method, &contentType, &headersRaw, &bodyTpl, &selectedFieldsRaw, &mode, &enabled)
		if err != nil {
			// If columns don't exist, try old schema
			if strings.Contains(err.Error(), "Unknown column") {
				bodyTpl = sql.NullString{Valid: false}
				selectedFieldsRaw = nil
				err = db.QueryRow("SELECT type,endpoint_url,http_method,'application/json' as content_type,headers_json,NULL as body_template,NULL as selected_fields_json,mode,enabled FROM form_webhooks WHERE id=? AND form_id=? AND version=?", webhookId, formId, version).Scan(&typ, &url, &method, &contentType, &headersRaw, &bodyTpl, &selectedFieldsRaw, &mode, &enabled)
			}
			if err != nil {
				if err == sql.ErrNoRows {
					c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
					return
				}
				log.Error("failed to query webhook", zap.Error(err))
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query webhook", "details": err.Error()})
				return
			}
		}

		// Convert NullString to *string
		var bodyTplPtr *string
		if bodyTpl.Valid {
			bodyTplPtr = &bodyTpl.String
		}

		// Parse selected fields
		var selectedFields []string
		if len(selectedFieldsRaw) > 0 {
			if err := json.Unmarshal(selectedFieldsRaw, &selectedFields); err != nil {
				log.Error("failed to unmarshal selected_fields", zap.Error(err))
				selectedFields = []string{}
			}
		}

		// Fetch form fields to build mock submission
		var fieldsRaw []byte
		err = db.QueryRow("SELECT fields_json FROM form_snapshots WHERE form_id=? AND version=?", formId, version).Scan(&fieldsRaw)
		if err != nil {
			log.Error("failed to query form", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query form"})
			return
		}

		var fields []map[string]any
		if err := json.Unmarshal(fieldsRaw, &fields); err != nil {
			log.Error("failed to unmarshal fields", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse form fields"})
			return
		}

		// Build mock answers based on form fields
		mockAnswers := make(map[string]any)
		for _, f := range fields {
			name, _ := f["name"].(string)
			fieldType, _ := f["type"].(string)
			switch fieldType {
			case "text", "textarea", "email":
				mockAnswers[name] = "test_value"
			case "number":
				mockAnswers[name] = 123
			case "phone":
				mockAnswers[name] = map[string]any{"e164": "+96550000000", "country": "KW"}
			case "radio":
				// If allow_other is enabled, mock an "other" selection with text
				if props, ok := f["props"].(map[string]any); ok {
					if allowOther, _ := props["allow_other"].(bool); allowOther {
						mockAnswers[name] = map[string]any{"value": "other", "other": "Mock other details"}
					} else {
						mockAnswers[name] = map[string]any{"value": "test_option"}
					}
				} else {
					mockAnswers[name] = map[string]any{"value": "test_option"}
				}
			case "select":
				// If allow_other is enabled, mock an "other" selection with text
				if props, ok := f["props"].(map[string]any); ok {
					if allowOther, _ := props["allow_other"].(bool); allowOther {
						mockAnswers[name] = map[string]any{"value": "other", "other": "Mock other details"}
					} else {
						mockAnswers[name] = map[string]any{"value": "test_option"}
					}
				} else {
					mockAnswers[name] = map[string]any{"value": "test_option"}
				}
			case "multiselect":
				// If allow_other is enabled, mock an "other" selection with text
				if props, ok := f["props"].(map[string]any); ok {
					if allowOther, _ := props["allow_other"].(bool); allowOther {
						mockAnswers[name] = []map[string]any{{"value": "test_option_1"}, {"value": "other", "other": "Mock other details"}}
					} else {
						mockAnswers[name] = []map[string]any{{"value": "test_option_1"}, {"value": "test_option_2"}}
					}
				} else {
					mockAnswers[name] = []map[string]any{{"value": "test_option_1"}, {"value": "test_option_2"}}
				}
			case "date":
				mockAnswers[name] = time.Now().Format(time.RFC3339)
			case "time":
				mockAnswers[name] = time.Now().Format(time.RFC3339)
			case "location":
				mockAnswers[name] = map[string]any{"lat": 29.3759, "lng": 47.9774, "accuracy": 10, "url": "https://www.google.com/maps?q=29.3759,47.9774"} // Kuwait coordinates
			case "file_upload":
				mockAnswers[name] = []map[string]any{{"id": "test_file_id", "url": "https://example.com/test.jpg"}}
			case "checkbox", "switch":
				mockAnswers[name] = true
			}
		}

		// Filter answers based on selected fields
		selectedAnswers := make(map[string]any)
		if len(selectedFields) > 0 {
			for _, field := range selectedFields {
				if val, ok := mockAnswers[field]; ok {
					selectedAnswers[field] = val
				}
			}
		} else {
			// If no fields selected, use all mock answers for testing
			selectedAnswers = mockAnswers
		}

		// Build mock submission payload
		mockSubmission := map[string]any{
			"formId":      formId,
			"version":     version,
			"submittedAt": time.Now().UnixMilli(),
			"answers":     selectedAnswers,
			"meta": map[string]any{
				"locale":     "en",
				"device":     "web",
				"attributes": []string{},
			},
		}


		// Parse headers
		var headers map[string]string
		if len(headersRaw) > 0 {
			if err := json.Unmarshal(headersRaw, &headers); err != nil {
				headers = make(map[string]string)
			}
		} else {
			headers = make(map[string]string)
		}

		if method == "" {
			method = "POST"
		}
		if contentType == "" {
			contentType = "application/json"
		}

		// Build body: template if provided else empty
		var bodyToSend []byte
		// Check if template exists and is not empty (after trimming whitespace)
		hasTemplate := bodyTplPtr != nil && *bodyTplPtr != "" && strings.TrimSpace(*bodyTplPtr) != ""
		if hasTemplate {
			log.Info("webhook test: using template", zap.String("template", *bodyTplPtr))
			ctx := map[string]any{
				"formId":        formId,
				"version":       version,
				"submissionId":  999999, // Mock submission ID
				"submittedAt":   mockSubmission["submittedAt"],
				"answers":       mockAnswers, // All answers for backward compatibility
				"selected":      selectedAnswers,
				"meta":          mockSubmission["meta"],
			}
			// Add each selected field as a top-level variable
			for field, value := range selectedAnswers {
				ctx[field] = value
			}
			funcMap := template.FuncMap{
				"json": func(v any) string {
					b, _ := json.Marshal(v)
					return string(b)
				},
			}
			if t, err := template.New("wh").Funcs(funcMap).Parse(*bodyTplPtr); err == nil {
				var buf bytes.Buffer
				if execErr := t.Execute(&buf, ctx); execErr == nil {
					bodyToSend = buf.Bytes()
				} else {
					// If template execution fails, send empty body
					log.Warn("webhook test: template execution failed", zap.Error(execErr))
					bodyToSend = []byte("{}")
				}
			} else {
				// If template parsing fails, send empty body
				log.Warn("webhook test: template parsing failed", zap.Error(err))
				bodyToSend = []byte("{}")
			}
		} else {
			// No template: send empty body by default
			bodyTplValue := "<nil>"
			if bodyTplPtr != nil {
				bodyTplValue = fmt.Sprintf("'%s'", *bodyTplPtr)
			}
			log.Info("webhook test: no template, sending empty body", zap.Bool("bodyTplPtr_nil", bodyTplPtr == nil), zap.String("bodyTpl_value", bodyTplValue))
			bodyToSend = []byte("{}")
		}

		// HMAC signature
		mac := hmac.New(sha256.New, []byte(cfg.WebhookSigningKey))
		mac.Write(bodyToSend)
		sig := hex.EncodeToString(mac.Sum(nil))

		// Create request
		startTime := time.Now()
		req, err := http.NewRequest(method, url, bytes.NewReader(bodyToSend))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create request"})
			return
		}

		req.Header.Set("Content-Type", contentType)
		req.Header.Set("X-Form-Id", formId)
		req.Header.Set("X-Form-Version", fmt.Sprintf("%d", version))
		req.Header.Set("X-Signature", "sha256="+sig)
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		// Send request (no retries for test)
		client := &http.Client{Timeout: time.Duration(cfg.WebhookTimeout()) * time.Millisecond}
		resp, err := client.Do(req)
		duration := time.Since(startTime)

		response := TestWebhookResponse{
			RequestURL:    url,
			RequestMethod: method,
			RequestBody:   string(bodyToSend),
			DurationMs:    duration.Milliseconds(),
		}

		if err != nil {
			response.Success = false
			response.Error = err.Error()
			c.JSON(http.StatusOK, response)
			return
		}
		defer resp.Body.Close()

		// Read response body
		respBody, _ := io.ReadAll(resp.Body)
		respHeaders := make(map[string]string)
		for k, v := range resp.Header {
			if len(v) > 0 {
				respHeaders[k] = v[0]
			}
		}

		response.Success = resp.StatusCode >= 200 && resp.StatusCode < 300
		response.StatusCode = resp.StatusCode
		response.StatusText = resp.Status
		response.ResponseBody = string(respBody)
		response.ResponseHeaders = respHeaders

		c.JSON(http.StatusOK, response)
	}
}



