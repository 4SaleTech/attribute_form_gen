package serverhandlers

import (
    "encoding/json"
    "net"
    "regexp"
    "strings"
    "time"

    "github.com/example/formrepo/apps/api/internal/types"
)

type FieldError struct {
    Field   string            `json:"field"`
    Code    string            `json:"code"`
    Message map[string]string `json:"message"`
    Details any               `json:"details,omitempty"`
}

var (
    emailRe  = regexp.MustCompile(`^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$`)
    e164Re   = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)
)

// validateSubmission validates answers against a form snapshot fields and returns structured errors.
func validateSubmission(fields []types.Field, answers any) []FieldError {
    errs := []FieldError{}
    // normalize answers to map
    b, _ := json.Marshal(answers)
    var amap map[string]any
    _ = json.Unmarshal(b, &amap)

    for _, f := range fields {
        val, has := amap[f.Name]
        req := isRequired(&f)
        if req && !has {
            errs = append(errs, fe(f.Name, "REQUIRED", "Required", "مطلوب", nil))
            continue
        }
        switch f.Type {
        case "text", "textarea":
            if !has { break }
            s, ok := val.(string); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid text", "نص غير صالح", nil)); break }
            maxLen := intFromProps(f.Props, "max_length")
            if maxLen > 0 && len([]rune(s)) > maxLen {
                errs = append(errs, fe(f.Name, "TOO_LONG", "Too long", "طويل جداً", map[string]any{"max": maxLen}))
            }
            if p := strFromProps(f.Props, "pattern"); p != "" {
                if re, err := regexp.Compile(p); err == nil && !re.MatchString(s) {
                    errs = append(errs, fe(f.Name, "PATTERN", "Does not match pattern", "لا يطابق النمط", nil))
                }
            }
        case "number":
            if !has { break }
            fv, ok := toFloat(val); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid number", "رقم غير صالح", nil)); break }
            if min, ok := floatFromProps(f.Props, "min"); ok && fv < min { errs = append(errs, fe(f.Name, "MIN", "Too small", "صغير جداً", map[string]any{"min": min})) }
            if max, ok := floatFromProps(f.Props, "max"); ok && fv > max { errs = append(errs, fe(f.Name, "MAX", "Too large", "كبير جداً", map[string]any{"max": max})) }
        case "select":
            if !has { break }
            m, ok := val.(map[string]any); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid value", "قيمة غير صالحة", nil)); break }
            v, _ := m["value"].(string)
            allowCustom := boolFromProps(f.Props, "allow_custom")
            if !allowCustom && !isInOptions(f.Props, v) {
                errs = append(errs, fe(f.Name, "NOT_ALLOWED", "Not in options", "غير موجود ضمن الخيارات", nil))
            }
        case "multiselect":
            if !has { break }
            arr, ok := val.([]any); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid values", "قيم غير صالحة", nil)); break }
            allowCustom := boolFromProps(f.Props, "allow_custom")
            for _, it := range arr {
                m, _ := it.(map[string]any); v, _ := m["value"].(string)
                if !allowCustom && !isInOptions(f.Props, v) {
                    errs = append(errs, fe(f.Name, "NOT_ALLOWED", "Not in options", "غير موجود ضمن الخيارات", map[string]any{"value": v}))
                }
            }
        case "radio":
            if !has { break }
            m, ok := val.(map[string]any); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid value", "قيمة غير صالحة", nil)); break }
            v, _ := m["value"].(string)
            if !isInOptions(f.Props, v) {
                errs = append(errs, fe(f.Name, "NOT_ALLOWED", "Not in options", "غير موجود ضمن الخيارات", nil))
            }
        case "checkbox", "switch":
            if req && (!has || val == nil) { errs = append(errs, fe(f.Name, "REQUIRED", "Required", "مطلوب", nil)) }
        case "email":
            if !has { break }
            s, _ := val.(string); s = strings.ToLower(strings.TrimSpace(s))
            if !emailRe.MatchString(s) { errs = append(errs, fe(f.Name, "INVALID_EMAIL", "Invalid email", "بريد إلكتروني غير صالح", nil)) }
            // MX check optional
            if boolFromProps(f.Props, "mx_check") {
                if parts := strings.SplitN(s, "@", 2); len(parts) == 2 {
                    mx, _ := net.LookupMX(parts[1])
                    if len(mx) == 0 { errs = append(errs, fe(f.Name, "NO_MX", "No MX records", "لا توجد سجلات MX", nil)) }
                }
            }
        case "phone":
            if !has { break }
            // expect { e164: "+123...", country: "US" }
            m, ok := val.(map[string]any); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid phone", "هاتف غير صالح", nil)); break }
            if boolFromProps(f.Props, "e164_required") {
                e, _ := m["e164"].(string)
                if !e164Re.MatchString(e) { errs = append(errs, fe(f.Name, "E164", "Invalid E.164", "تنسيق E.164 غير صالح", nil)) }
            }
        case "file_upload":
            if !has { break }
            arr, ok := val.([]any); if !ok { errs = append(errs, fe(f.Name, "INVALID", "Invalid files", "ملفات غير صالحة", nil)); break }
            maxFiles := intFromProps(f.Props, "max_files"); if maxFiles <= 0 { maxFiles = 1 }
            if len(arr) > maxFiles { errs = append(errs, fe(f.Name, "TOO_MANY", "Too many files", "عدد ملفات كبير", map[string]any{"max": maxFiles})) }
            // size/mime best validated client-side; minimally ensure id/url
            for _, it := range arr {
                m, _ := it.(map[string]any); if m["id"] == nil || m["url"] == nil {
                    errs = append(errs, fe(f.Name, "MISSING_META", "Missing file metadata", "بيانات الملف ناقصة", nil))
                }
            }
        case "date", "time", "datetime":
            if !has { break }
            s, _ := val.(string)
            // basic ISO check
            if _, err := time.Parse(time.RFC3339, s); err != nil {
                errs = append(errs, fe(f.Name, "INVALID", "Invalid date/time", "تاريخ/وقت غير صالح", nil))
            }
        }
    }
    return errs
}

func isRequired(f *types.Field) bool {
    if f.Props == nil { return false }
    b, _ := json.Marshal(f.Props)
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if v, ok := m["required"].(bool); ok { return v }
    return false
}

func isInOptions(props any, val string) bool {
    b, _ := json.Marshal(props)
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if arr, ok := m["options"].([]any); ok {
        for _, it := range arr {
            if om, ok := it.(map[string]any); ok {
                if ov, _ := om["value"].(string); ov == val { return true }
            }
        }
    }
    return false
}

func fe(field, code, en, ar string, details any) FieldError {
    return FieldError{ Field: field, Code: code, Message: map[string]string{"en": en, "ar": ar}, Details: details }
}

func intFromProps(props any, key string) int {
    if props == nil { return 0 }
    b, _ := json.Marshal(props)
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if v, ok := m[key].(float64); ok { return int(v) }
    return 0
}

func floatFromProps(props any, key string) (float64, bool) {
    if props == nil { return 0, false }
    b, _ := json.Marshal(props)
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if v, ok := m[key].(float64); ok { return v, true }
    return 0, false
}

func strFromProps(props any, key string) string {
    if props == nil { return "" }
    b, _ := json.Marshal(props)
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if v, ok := m[key].(string); ok { return v }
    return ""
}

func boolFromProps(props any, key string) bool {
    if props == nil { return false }
    b, _ := json.Marshal(props)
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if v, ok := m[key].(bool); ok { return v }
    return false
}

func toFloat(v any) (float64, bool) {
    switch t := v.(type) {
    case float64:
        return t, true
    case int:
        return float64(t), true
    case json.Number:
        f, err := t.Float64(); if err == nil { return f, true }
    }
    return 0, false
}



