package serverhandlers

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

type webhookReq struct {
    Type       string            `json:"type"`
    Endpoint   string            `json:"endpoint_url"`
    Method     string            `json:"http_method"`
    ContentType string           `json:"content_type"`
    Headers    map[string]string `json:"headers"`
    Mode       string            `json:"mode"`
    Enabled    bool              `json:"enabled"`
    BodyTemplate string          `json:"body_template"`
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
        // Use old schema query (migration not run yet) - provides defaults for missing columns
        rows, err := db.Query("SELECT id,type,endpoint_url,http_method,'application/json' as content_type,headers_json,NULL as body_template,mode,enabled FROM form_webhooks WHERE form_id=? AND version=?", formId, version)
        if err != nil {
            log.Error("failed to query webhooks", zap.Error(err), zap.String("formId", formId), zap.Int("version", version))
            c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
            return
        }
        defer rows.Close()
        out := []gin.H{}
        for rows.Next() {
            var id uint64; var typ, url, method, contentType, mode string; var headersRaw []byte; var enabled bool; var bodyTpl *string
            if err := rows.Scan(&id, &typ, &url, &method, &contentType, &headersRaw, &bodyTpl, &mode, &enabled); err != nil {
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
            out = append(out, gin.H{"id": id, "type": typ, "endpoint_url": url, "http_method": method, "content_type": contentType, "headers": headers, "body_template": nullSafe(bodyTpl), "mode": mode, "enabled": enabled})
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
        if req.Method == "" { req.Method = "POST" }
        if req.ContentType == "" { req.ContentType = "application/json" }
        
        // Use old schema insert (migration not run yet) - ignore content_type and body_template
        _, err := db.Exec("INSERT INTO form_webhooks(form_id,version,type,endpoint_url,http_method,headers_json,mode,enabled) VALUES(?,?,?,?,?,?,?,?)", formId, version, req.Type, req.Endpoint, req.Method, string(hdrs), req.Mode, req.Enabled)
        if err != nil {
            log.Error("failed to insert webhook", zap.Error(err), zap.String("formId", formId), zap.Int("version", version))
            c.JSON(http.StatusBadRequest, gin.H{"error":"insert"})
            return
        }
        c.Status(http.StatusCreated)
    }
}

func UpdateWebhookHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")
        var req webhookReq
        if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"json"}); return }
        hdrs, _ := json.Marshal(req.Headers)
        if req.Method == "" { req.Method = "POST" }
        if req.ContentType == "" { req.ContentType = "application/json" }
        _, err := db.Exec("UPDATE form_webhooks SET type=?, endpoint_url=?, http_method=?, content_type=?, headers_json=?, body_template=?, mode=?, enabled=? WHERE id=?", req.Type, req.Endpoint, req.Method, req.ContentType, string(hdrs), emptyIf(req.BodyTemplate), req.Mode, req.Enabled, id)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"update"}); return }
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


