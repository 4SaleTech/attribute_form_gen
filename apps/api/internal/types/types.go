package types

type LocaleString map[string]string // expects keys: en, ar

type Question struct {
    ID           uint64        `json:"id"`
    AttributeKey string        `json:"attribute_key"`
    Type         string        `json:"type"`
    Name         string        `json:"name"`
    Label        LocaleString  `json:"label"`
    Props        any           `json:"props"`
    Status       string        `json:"status"`
    Version      int           `json:"version"`
}

type Field = Question // renderer expects similar shape

type ThankYou struct {
    Show          bool         `json:"show"`
    Title         LocaleString `json:"title"`
    Message       LocaleString `json:"message"`
    DurationMs    int          `json:"duration_ms"`
    CloseBehavior string       `json:"close_behavior"`
}

type SubmitAction struct {
    Type    string `json:"type"`
    Enabled bool   `json:"enabled"`
    URL     string `json:"url,omitempty"`
}

type IdempotencyCfg struct {
    Enabled bool   `json:"enabled"`
    Key     string `json:"key"`
}

type SubmitPipeline struct {
    Actions     []SubmitAction `json:"actions"`
    Ordering    []string       `json:"ordering"`
    Idempotency *IdempotencyCfg `json:"idempotency,omitempty"`
    TimeoutMs   int            `json:"timeout_ms,omitempty"`
    OnError     string         `json:"on_error"`
}

type FormConfig struct {
    FormID              string        `json:"formId"`
    Version             int           `json:"version"`
    Title               LocaleString  `json:"title"`
    Fields              []Field       `json:"fields"`
    Attributes          []string      `json:"attributes"`
    ThankYou            *ThankYou     `json:"thankYou"`
    Submit              *SubmitPipeline `json:"submit"`
    SupportedLocales    []string      `json:"supported_locales"`
    DefaultLocale       string        `json:"default_locale"`
    FormType            string        `json:"form_type,omitempty"` // "normal" or "user_specific"
    InstanceID          string        `json:"instance_id,omitempty"` // Only present when instanceId query param is provided
    InstanceUserToken   string        `json:"instance_user_token,omitempty"` // Only present when instanceId query param is provided
}



