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
    "time"
    "text/template"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/example/formrepo/apps/api/internal/types"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

type submissionReq struct {
    FormID      string         `json:"formId"`
    Version     int            `json:"version"`
    SubmittedAt int64          `json:"submittedAt"`
    Answers     any            `json:"answers"`
    Meta        map[string]any `json:"meta"`
    BridgeAck   bool           `json:"bridgeAck"`
}

func SubmitHandler(db *sql.DB, cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req submissionReq
        raw, _ := io.ReadAll(c.Request.Body)
        c.Request.Body = io.NopCloser(bytes.NewReader(raw))
        if err := json.Unmarshal(raw, &req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error":"invalid json"})
            return
        }
        if req.SubmittedAt == 0 { req.SubmittedAt = time.Now().UnixMilli() }

        // Check idempotency based on form snapshot config
        var submitRaw, localesRaw []byte
        row := db.QueryRow("SELECT submit_json, supported_locales_json, fields_json FROM forms WHERE form_id=? AND version=?", req.FormID, req.Version)
        var fieldsRaw []byte
        if err := row.Scan(&submitRaw, &localesRaw, &fieldsRaw); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error":"unknown form/version"})
            return
        }
        // server-side validation against snapshot fields
        var fields []types.Field
        _ = json.Unmarshal(fieldsRaw, &fields)
        verrs := validateSubmission(fields, req.Answers)
        if len(verrs) > 0 {
            c.JSON(http.StatusUnprocessableEntity, gin.H{"errors": verrs})
            return
        }
        var submitCfg map[string]any
        _ = json.Unmarshal(submitRaw, &submitCfg)

        var idemKey string
        if idemp, ok := submitCfg["idempotency"].(map[string]any); ok {
            if e, _ := idemp["enabled"].(bool); e {
                keyName, _ := idemp["key"].(string)
                if keyName != "" {
                    if req.Meta != nil {
                        if v, ok := req.Meta[keyName].(string); ok {
                            idemKey = v
                        }
                    }
                }
            }
        }

        answersJSON, _ := json.Marshal(req.Answers)
        attrsJSON, _ := json.Marshal(req.Meta["attributes"]) // attributes in meta
        locale, _ := req.Meta["locale"].(string)
        device, _ := req.Meta["device"].(string)

        // Attempt insert
        res, err := db.Exec(`INSERT INTO submissions(form_id,version,submitted_at,locale,device,answers_json,attributes_json,idempotency_key,webhook_status) VALUES(?,?,?,?,?,?,?,?, 'pending')`,
            req.FormID, req.Version, req.SubmittedAt, locale, device, string(answersJSON), string(attrsJSON), nullIfEmpty(idemKey))
        if err != nil {
            // Unique constraint hit -> fetch existing
            row := db.QueryRow("SELECT id, webhook_status FROM submissions WHERE form_id=? AND version=? AND idempotency_key=?", req.FormID, req.Version, idemKey)
            var id uint64; var ws string
            if scanErr := row.Scan(&id, &ws); scanErr == nil {
                c.JSON(http.StatusOK, gin.H{"id": id, "webhook_status": ws, "idempotent": true})
                return
            }
        }

        // Enqueue webhooks (fire-and-forget)
        var insertedID uint64
        if rid, _ := res.LastInsertId(); rid > 0 { insertedID = uint64(rid) }
        go dispatchWebhooks(db, cfg, log, req.FormID, req.Version, insertedID, raw)

        c.JSON(http.StatusOK, gin.H{"ok": true})
    }
}

func nullIfEmpty(s string) any { if s == "" { return nil }; return s }

func dispatchWebhooks(db *sql.DB, cfg *config.Config, log *zap.Logger, formId string, version int, submissionId uint64, body []byte) {
    rows, err := db.Query("SELECT id,type,endpoint_url,http_method,content_type,headers_json,body_template,selected_fields_json,mode,enabled FROM form_webhooks WHERE form_id=? AND version=? AND enabled=1", formId, version)
    if err != nil { log.Error("webhooks query", zap.Error(err)); return }
    defer rows.Close()
    allOk := true
    for rows.Next() {
        var id uint64; var typ, url, method, contentType, mode string; var headersRaw []byte; var enabled bool; var bodyTpl *string; var selectedFieldsRaw []byte
        _ = rows.Scan(&id, &typ, &url, &method, &contentType, &headersRaw, &bodyTpl, &selectedFieldsRaw, &mode, &enabled)
        var headers map[string]string
        _ = json.Unmarshal(headersRaw, &headers)
        if method == "" { method = "POST" }
        if contentType == "" { contentType = "application/json" }

        // Parse selected fields
        var selectedFields []string
        if len(selectedFieldsRaw) > 0 {
            _ = json.Unmarshal(selectedFieldsRaw, &selectedFields)
        }

        // Parse base submission data
        var base map[string]any
        _ = json.Unmarshal(body, &base)
        allAnswers, _ := base["answers"].(map[string]any)

        // Filter answers based on selected fields
        selectedAnswers := make(map[string]any)
        if len(selectedFields) > 0 {
            // Only include selected fields
            for _, field := range selectedFields {
                if val, ok := allAnswers[field]; ok {
                    selectedAnswers[field] = val
                }
            }
        } else {
            // If no fields selected, send empty (user must explicitly select)
            selectedAnswers = make(map[string]any)
        }

        // Build body: template if provided else raw
        bodyToSend := body
        if bodyTpl != nil && *bodyTpl != "" {
            // Build template context with individual fields as top-level variables
            ctx := map[string]any{
                "formId": formId,
                "version": version,
                "submissionId": submissionId,
                "submittedAt": base["submittedAt"],
                "meta": base["meta"],
                // Individual fields as top-level variables (from selected)
                "selected": selectedAnswers,
                // Backward compatible - all answers
                "answers": allAnswers,
            }
            // Add each selected field as a top-level variable
            for field, value := range selectedAnswers {
                ctx[field] = value
            }
            // Include all fields from base (for backward compatibility)
            for k, v := range base {
                if _, exists := ctx[k]; !exists {
                    ctx[k] = v
                }
            }
            funcMap := template.FuncMap{
                "json": func(v any) string { b, _ := json.Marshal(v); return string(b) },
            }
            if t, err := template.New("wh").Funcs(funcMap).Parse(*bodyTpl); err == nil {
                var buf bytes.Buffer
                if execErr := t.Execute(&buf, ctx); execErr == nil {
                    bodyToSend = buf.Bytes()
                }
            }
        } else {
            // No template: send empty body by default (user must design their own body template)
            bodyToSend = []byte("{}")
        }

        // HMAC header
        mac := hmac.New(sha256.New, []byte(cfg.WebhookSigningKey))
        mac.Write(bodyToSend)
        sig := hex.EncodeToString(mac.Sum(nil))

        req, _ := http.NewRequest(method, url, bytes.NewReader(bodyToSend))
        req.Header.Set("Content-Type", contentType)
        req.Header.Set("X-Form-Id", formId)
        req.Header.Set("X-Form-Version", fmt.Sprintf("%d", version))
        req.Header.Set("X-Signature", "sha256="+sig)
        for k, v := range headers { req.Header.Set(k, v) }

        ok := tryWithRetry(req, cfg, log)
        if !ok { allOk = false }
    }
    status := "success"
    if !allOk { status = "partial" }
    _, _ = db.Exec("UPDATE submissions SET webhook_status=? WHERE form_id=? AND version=? ORDER BY id DESC LIMIT 1", status, formId, version)
}

func tryWithRetry(req *http.Request, cfg *config.Config, log *zap.Logger) bool {
    client := &http.Client{ Timeout: time.Duration(cfg.WebhookTimeout()) * time.Millisecond }
    retries := cfg.WebhookMaxRetries
    backoff := time.Duration(cfg.WebhookRetryBackoffMs) * time.Millisecond
    for attempt := 0; attempt <= retries; attempt++ {
        resp, err := client.Do(req)
        if err == nil && resp.StatusCode >= 200 && resp.StatusCode < 300 {
            io.Copy(io.Discard, resp.Body); resp.Body.Close(); return true
        }
        if resp != nil { io.Copy(io.Discard, resp.Body); resp.Body.Close() }
        time.Sleep(backoff)
    }
    return false
}


