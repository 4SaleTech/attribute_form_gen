package serverhandlers

import (
    "crypto/rand"
    "crypto/sha256"
    "database/sql"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "sort"
    "strings"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/example/formrepo/apps/api/internal/types"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

type generateReq struct {
    FormID     string            `json:"formId,omitempty"`
    Title      map[string]string `json:"title"`
    Attributes []string          `json:"attributes"`
    ThankYou   *types.ThankYou   `json:"thankYou"`
    Submit     *types.SubmitPipeline `json:"submit"`
    OnMissing  string            `json:"onMissing"` // skip|error|placeholder
}

func GenerateFormHandler(db *sql.DB, cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req generateReq
        if err := c.BindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
            return
        }
        // Auto-generate formId if not provided
        if req.FormID == "" {
            req.FormID = generateUUID()
        }
        fields, missing, err := fetchFieldsForAttributes(db, req.Attributes)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
            return
        }
        switch req.OnMissing {
        case "error":
            if len(missing) > 0 {
                c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "missing attributes", "missing": missing})
                return
            }
        case "placeholder":
            for _, m := range missing {
                fields = append(fields, types.Field{
                    AttributeKey: m,
                    Type:         "info",
                    Name:         m,
                    Label:        types.LocaleString{"en": fmt.Sprintf("Missing %s", m), "ar": fmt.Sprintf("مفقود %s", m)},
                    Props:        map[string]any{"disabled": true},
                    Status:       "inactive",
                })
            }
        default:
            // skip (no-op)
        }
        sort.SliceStable(fields, func(i, j int) bool { return fields[i].AttributeKey < fields[j].AttributeKey })

        resp := types.FormConfig{
            FormID:           req.FormID,
            Version:          0,
            Title:            req.Title,
            Fields:           fields,
            Attributes:       req.Attributes,
            ThankYou:         req.ThankYou,
            Submit:           req.Submit,
            SupportedLocales: []string{"en", "ar"},
            DefaultLocale:    "en",
        }
        c.JSON(http.StatusOK, resp)
    }
}

func fetchFieldsForAttributes(db *sql.DB, attrs []string) ([]types.Field, []string, error) {
    if len(attrs) == 0 {
        return []types.Field{}, nil, nil
    }
    // Build IN clause safely
    qs := strings.Repeat("?,", len(attrs))
    qs = strings.TrimSuffix(qs, ",")
    rows, err := db.Query("SELECT id, attribute_key, type, name, label_json, props_json, status, version FROM questions WHERE status='active' AND attribute_key IN ("+qs+")", toArgs(attrs)...)
    if err != nil {
        return nil, nil, err
    }
    defer rows.Close()
    found := map[string]bool{}
    fields := []types.Field{}
    for rows.Next() {
        var f types.Field
        var labelRaw, propsRaw []byte
        if err := rows.Scan(&f.ID, &f.AttributeKey, &f.Type, &f.Name, &labelRaw, &propsRaw, &f.Status, &f.Version); err != nil {
            return nil, nil, err
        }
        _ = json.Unmarshal(labelRaw, &f.Label)
        var props any
        _ = json.Unmarshal(propsRaw, &props)
        f.Props = props
        fields = append(fields, f)
        found[f.AttributeKey] = true
    }
    missing := []string{}
    for _, a := range attrs {
        if !found[a] {
            missing = append(missing, a)
        }
    }
    return fields, missing, nil
}

func toArgs(s []string) []any { a := make([]any, len(s)); for i, v := range s { a[i] = v }; return a }

// generateUUID generates a UUID v4
func generateUUID() string {
    b := make([]byte, 16)
    _, _ = rand.Read(b)
    b[6] = (b[6] & 0x0f) | 0x40 // Version 4
    b[8] = (b[8] & 0x3f) | 0x80 // Variant 10
    return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// Publish
type publishReq struct {
    FormID     string            `json:"formId,omitempty"`
    Title      map[string]string `json:"title"`
    Attributes []string          `json:"attributes"`
    ThankYou   *types.ThankYou   `json:"thankYou"`
    Submit     *types.SubmitPipeline `json:"submit"`
}

func PublishFormHandler(db *sql.DB, cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req publishReq
        if err := c.BindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
            return
        }
        // Auto-generate formId if not provided
        if req.FormID == "" {
            req.FormID = generateUUID()
        }
        // Fetch active fields
        fields, missing, err := fetchFieldsForAttributes(db, req.Attributes)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
            return
        }
        if len(missing) > 0 {
            c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "missing attributes", "missing": missing})
            return
        }
        // Bilingual validator
        errs := validateBilingual(req.Title, fields, req.ThankYou)
        // Submit config validator
        if verrs := validateSubmitJSON(req.Submit); len(verrs) > 0 {
            errs = append(errs, verrs...)
        }
        if len(errs) > 0 {
            c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "bilingual required", "details": errs})
            return
        }
        // Next version
        var nextVersion int
        row := db.QueryRow("SELECT COALESCE(MAX(version),0)+1 FROM form_snapshots WHERE form_id=?", req.FormID)
        if err := row.Scan(&nextVersion); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
            return
        }
        fieldsJSON, _ := json.Marshal(fields)
        attrsJSON, _ := json.Marshal(req.Attributes)
        titleJSON, _ := json.Marshal(req.Title)
        thankJSON, _ := json.Marshal(req.ThankYou)
        // Normalize/Default submit config before persisting
        normalizedSubmit := normalizeSubmitJSON(req.Submit)
        submitJSON, _ := json.Marshal(normalizedSubmit)

        // Generate config hash for duplicate detection
        configHash := generateConfigHash(req.Attributes, normalizedSubmit, req.ThankYou)

        // Check if a form with the same configuration already exists
        var existingFormID string
        var existingVersion int
        row = db.QueryRow("SELECT form_id, version FROM form_snapshots WHERE config_hash = ? ORDER BY version DESC LIMIT 1", configHash)
        if err := row.Scan(&existingFormID, &existingVersion); err == nil {
            // Found existing form with same configuration
            baseURL := getBaseURL(c, cfg)
            existingFormIDEncoded := url.PathEscape(existingFormID)
            log.Info("duplicate form detected", zap.String("existing_form_id", existingFormID), zap.Int("existing_version", existingVersion), zap.String("requested_form_id", req.FormID))
            c.JSON(http.StatusOK, gin.H{
                "formId": existingFormID,
                "version": existingVersion,
                "isDuplicate": true,
                "urls": gin.H{
                    "en": fmt.Sprintf("%s/%s/%d?lang=en", baseURL, existingFormIDEncoded, existingVersion),
                    "ar": fmt.Sprintf("%s/%s/%d?lang=ar", baseURL, existingFormIDEncoded, existingVersion),
                },
            })
            return
        } else if err != sql.ErrNoRows {
            // Unexpected database error
            c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
            return
        }

        // No duplicate found, create new form
        _, err = db.Exec(`INSERT INTO form_snapshots(form_id,version,title_json,fields_json,attributes_json,thank_you_json,submit_json,config_hash,supported_locales_json,default_locale,status) VALUES(?,?,?,?,?,?,?,?,JSON_ARRAY('en','ar'),'en','active')`,
            req.FormID, nextVersion, string(titleJSON), string(fieldsJSON), string(attrsJSON), string(thankJSON), string(submitJSON), configHash)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "insert failed"})
            return
        }
        
        // Generate form URLs
        baseURL := getBaseURL(c, cfg)
        formIDEncoded := url.PathEscape(req.FormID)
        
        c.JSON(http.StatusOK, gin.H{
            "formId": req.FormID,
            "version": nextVersion,
            "isDuplicate": false,
            "urls": gin.H{
                "en": fmt.Sprintf("%s/%s/%d?lang=en", baseURL, formIDEncoded, nextVersion),
                "ar": fmt.Sprintf("%s/%s/%d?lang=ar", baseURL, formIDEncoded, nextVersion),
            },
        })
    }
}

func validateBilingual(title map[string]string, fields []types.Field, thank *types.ThankYou) []string {
    errs := []string{}
    // title en/ar
    if title["en"] == "" || title["ar"] == "" {
        errs = append(errs, "/title: missing en/ar")
    }
    for i, f := range fields {
        if f.Label == nil || f.Label["en"] == "" || f.Label["ar"] == "" {
            errs = append(errs, fmt.Sprintf("/fields/%d/label: missing en/ar", i))
        }
        // props visible strings quick scan
        // for brevity we only check options[*].label and placeholder/help_text keys if present
        b, _ := json.Marshal(f.Props)
        var m map[string]any
        _ = json.Unmarshal(b, &m)
        if ph, ok := m["placeholder"].(map[string]any); ok {
            if ph["en"] == nil || ph["ar"] == nil {
                errs = append(errs, fmt.Sprintf("/fields/%d/props/placeholder: missing en/ar", i))
            }
        }
        if ht, ok := m["help_text"].(map[string]any); ok {
            if ht["en"] == nil || ht["ar"] == nil {
                errs = append(errs, fmt.Sprintf("/fields/%d/props/help_text: missing en/ar", i))
            }
        }
        if opts, ok := m["options"].([]any); ok {
            for oi, ov := range opts {
                if om, ok := ov.(map[string]any); ok {
                    if lbl, ok := om["label"].(map[string]any); ok {
                        if lbl["en"] == nil || lbl["ar"] == nil {
                            errs = append(errs, fmt.Sprintf("/fields/%d/props/options/%d/label: missing en/ar", i, oi))
                        }
                    }
                }
            }
        }
    }
    if thank != nil {
        if thank.Show {
            if thank.Title == nil || thank.Title["en"] == "" || thank.Title["ar"] == "" {
                errs = append(errs, "/thankYou/title: missing en/ar (required when show=true)")
            }
            if thank.Message == nil || thank.Message["en"] == "" || thank.Message["ar"] == "" {
                errs = append(errs, "/thankYou/message: missing en/ar (required when show=true)")
            }
        }
    }
    return errs
}

// Submit config validation and normalization
var allowedActions = map[string]bool{
    "native_bridge": true,
    "server_persist": true,
    "webhooks": true,
    "nextjs_post": true,
    "redirect": true,
}

func validateSubmitJSON(submit *types.SubmitPipeline) []string {
    if submit == nil {
        return nil
    }
    errs := []string{}
    // actions
    if len(submit.Actions) == 0 {
        errs = append(errs, "/submit/actions: must have at least one action")
    }
    hasEnabled := false
    for i, a := range submit.Actions {
        if !allowedActions[a.Type] {
            errs = append(errs, "/submit/actions/"+itoa(i)+": unknown type")
        }
        if a.Enabled { hasEnabled = true }
        if a.Type == "redirect" && a.Enabled {
            if a.URL == "" || !(hasPrefix(a.URL, "http://") || hasPrefix(a.URL, "https://") || hasPrefix(a.URL, "/")) {
                errs = append(errs, "/submit/actions/"+itoa(i)+"/url: invalid")
            }
        }
        // nextjs_post doesn't need URL validation - it uses environment variable
    }
    if !hasEnabled { errs = append(errs, "/submit/actions: at least one enabled required") }
    // ordering must be subset and unique
    seen := map[string]bool{}
    for i, t := range submit.Ordering {
        if !allowedActions[t] { errs = append(errs, "/submit/ordering/"+itoa(i)+": unknown type") }
        if seen[t] { errs = append(errs, "/submit/ordering: duplicate "+t) }
        seen[t] = true
    }
    // on_error
    if submit.OnError != "continue" && submit.OnError != "stop" && submit.OnError != "show_error" {
        errs = append(errs, "/submit/on_error: invalid")
    }
    return errs
}

func normalizeSubmitJSON(submit *types.SubmitPipeline) *types.SubmitPipeline {
    if submit == nil {
        submit = &types.SubmitPipeline{}
    }
    // Defaults
    if submit.Actions == nil || len(submit.Actions) == 0 {
        submit.Actions = []types.SubmitAction{{Type: "native_bridge", Enabled: true}, {Type: "server_persist", Enabled: true}, {Type: "webhooks", Enabled: true}, {Type: "redirect", Enabled: false, URL: ""}}
    }
    if submit.Ordering == nil || len(submit.Ordering) == 0 {
        submit.Ordering = []string{"native_bridge","server_persist","webhooks","redirect"}
    }
    if submit.Idempotency == nil {
        submit.Idempotency = &types.IdempotencyCfg{Enabled: true, Key: "sessionId"}
    }
    if submit.TimeoutMs == 0 { submit.TimeoutMs = 6000 }
    if submit.OnError == "" { submit.OnError = "continue" }
    return submit
}

// generateConfigHash creates a SHA256 hash from attributes, submit config, and thank you config
// This is used to detect duplicate form configurations
func generateConfigHash(attributes []string, submit *types.SubmitPipeline, thankYou *types.ThankYou) string {
    // Create a struct that represents the configuration (excluding form_id and title)
    type configForHash struct {
        Attributes []string                `json:"attributes"`
        Submit     *types.SubmitPipeline   `json:"submit"`
        ThankYou   *types.ThankYou         `json:"thankYou"`
    }
    
    cfg := configForHash{
        Attributes: attributes,
        Submit:     submit,
        ThankYou:   thankYou,
    }
    
    // Marshal to JSON (sorted keys for consistency)
    jsonBytes, err := json.Marshal(cfg)
    if err != nil {
        // Fallback: create hash from string representation
        jsonBytes = []byte(fmt.Sprintf("%v|%v|%v", attributes, submit, thankYou))
    }
    
    // Generate SHA256 hash
    hash := sha256.Sum256(jsonBytes)
    return hex.EncodeToString(hash[:])
}

// small helpers (avoid pulling extra packages)
func hasPrefix(s, pre string) bool { return len(s) >= len(pre) && s[:len(pre)] == pre }
func itoa(i int) string { return fmtInt(i) }
func fmtInt(i int) string { return fmt.Sprintf("%d", i) }

// getBaseURL extracts the base URL from the request or config
func getBaseURL(c *gin.Context, cfg *config.Config) string {
    // Use config FormBaseURL if set
    if cfg.FormBaseURL != "" {
        return cfg.FormBaseURL
    }
    
    // Try Origin header (for CORS requests) - this will be the admin app URL
    origin := c.GetHeader("Origin")
    if origin != "" {
        return origin
    }
    
    // Fallback to constructing from request
    scheme := "http"
    if c.GetHeader("X-Forwarded-Proto") == "https" || c.Request.TLS != nil {
        scheme = "https"
    }
    
    host := c.GetHeader("Host")
    if host == "" {
        host = c.Request.Host
    }
    
    return fmt.Sprintf("%s://%s", scheme, host)
}

func GetFormLatestHandler(db *sql.DB, cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        formId := c.Param("formId")
        row := db.QueryRow("SELECT version,title_json,fields_json,attributes_json,thank_you_json,submit_json,supported_locales_json,default_locale FROM form_snapshots WHERE form_id=? ORDER BY version DESC LIMIT 1", formId)
        respondFormRow(c, formId, row)
    }
}

func GetFormVersionHandler(db *sql.DB, cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        formId := c.Param("formId")
        ver := c.Param("version")
        row := db.QueryRow("SELECT version,title_json,fields_json,attributes_json,thank_you_json,submit_json,supported_locales_json,default_locale FROM form_snapshots WHERE form_id=? AND version=?", formId, ver)
        respondFormRow(c, formId, row)
    }
}

func respondFormRow(c *gin.Context, formId string, row *sql.Row) {
    var version int
    var titleRaw, fieldsRaw, attrsRaw, thankRaw, submitRaw, localesRaw []byte
    var defaultLocale string
    if err := row.Scan(&version, &titleRaw, &fieldsRaw, &attrsRaw, &thankRaw, &submitRaw, &localesRaw, &defaultLocale); err != nil {
        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
        return
    }
    var cfg types.FormConfig
    _ = json.Unmarshal(titleRaw, &cfg.Title)
    _ = json.Unmarshal(fieldsRaw, &cfg.Fields)
    _ = json.Unmarshal(attrsRaw, &cfg.Attributes)
    var thank types.ThankYou
    _ = json.Unmarshal(thankRaw, &thank)
    var submit types.SubmitPipeline
    _ = json.Unmarshal(submitRaw, &submit)
    var locales []string
    _ = json.Unmarshal(localesRaw, &locales)
    cfg.FormID = formId
    cfg.Version = version
    cfg.ThankYou = &thank
    cfg.Submit = &submit
    cfg.SupportedLocales = locales
    cfg.DefaultLocale = defaultLocale
    c.JSON(http.StatusOK, cfg)
}


