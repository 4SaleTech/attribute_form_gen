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

type PrePurchaseWebhook struct {
    URL        string `json:"url"`
    APIKey     string `json:"api_key"`
    NameField  string `json:"name_field,omitempty"`
    NotesField string `json:"notes_field,omitempty"`
}

type PurchaseAuthConfig struct {
    RequireAuthentication bool                `json:"require_authentication"`
    AuthAPIBaseURL       string              `json:"auth_api_base_url"`
    ListingsAPIBaseURL   string              `json:"listings_api_base_url,omitempty"`
    DeviceID             string              `json:"device_id"`
    AppSignature         string              `json:"app_signature"`
    VersionNumber        string              `json:"version_number"`
    PurchaseAPIURL       string              `json:"purchase_api_url"`
    AdvIDField           string              `json:"adv_id_field"`
    ItemIDField          string              `json:"item_id_field"`
    CategoryIDField      string              `json:"category_id_field"`
    DistrictIDField      string              `json:"district_id_field"`
    PaymentMethod        string              `json:"payment_method"`
    UserLang             string              `json:"user_lang"`
    PrePurchaseWebhook   *PrePurchaseWebhook `json:"pre_purchase_webhook,omitempty"`
    AdditionalWebhooks   []any               `json:"additional_webhooks,omitempty"`
}

type SubmitAction struct {
    Type               string             `json:"type"`
    Enabled            bool               `json:"enabled"`
    URL                string             `json:"url,omitempty"`
    PurchaseAuthConfig *PurchaseAuthConfig `json:"purchase_auth_config,omitempty"`
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
}



