package config

import (
    "fmt"
    "strconv"

    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    // Server
    Port         string `envconfig:"PORT" default:"8080"`
    CORSOrigins  string `envconfig:"CORS_ORIGINS" default:"http://localhost:5173,http://localhost:5174"`
    AdminToken   string `envconfig:"ADMIN_TOKEN" required:"true"`
    FormBaseURL  string `envconfig:"FORM_BASE_URL" default:""` // Base URL for form rendering (defaults to Origin header)

    // DB
    DBHost     string `envconfig:"DB_HOST" required:"true"`
    DBPort     int    `envconfig:"DB_PORT" default:"3306"`
    DBName     string `envconfig:"DB_NAME" required:"true"`
    DBUser     string `envconfig:"DB_USER" required:"true"`
    DBPassword string `envconfig:"DB_PASSWORD" required:"true"`

    // Cloudinary
    CloudName      string `envconfig:"CLOUDINARY_CLOUD_NAME" required:"true"`
    CloudAPIKey    string `envconfig:"CLOUDINARY_API_KEY" required:"true"`
    CloudAPISecret string `envconfig:"CLOUDINARY_API_SECRET" required:"true"`
    UploadFolder   string `envconfig:"CLOUDINARY_UPLOAD_FOLDER" default:"forms/uploads"`
    UploadTTL      int64  `envconfig:"CLOUDINARY_UPLOAD_TTL_SECONDS" default:"300"`

    // Webhooks
    WebhookSigningKey     string `envconfig:"WEBHOOK_SIGNING_KEY" required:"true"`
    WebhookTimeoutMs      int    `envconfig:"WEBHOOK_TIMEOUT_MS" default:"8000"`
    WebhookMaxRetries     int    `envconfig:"WEBHOOK_MAX_RETRIES" default:"3"`
    WebhookRetryBackoffMs int    `envconfig:"WEBHOOK_RETRY_BACKOFF_MS" default:"1500"`
}

func Load(cfg *Config) error {
    if err := envconfig.Process("", cfg); err != nil {
        return err
    }
    if cfg.Port == "" {
        cfg.Port = "8080"
    }
    return nil
}

func (c *Config) DSN() string {
    return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4,utf8&loc=UTC", c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func (c *Config) WebhookTimeout() int {
    if c.WebhookTimeoutMs <= 0 {
        return 8000
    }
    return c.WebhookTimeoutMs
}

func (c *Config) UploadTTLSeconds() int64 {
    if c.UploadTTL <= 0 {
        return 300
    }
    return c.UploadTTL
}

func (c *Config) CORSOriginsList() []string {
    if c.CORSOrigins == "" {
        return []string{"http://localhost:5173"}
    }
    // simple split (no spaces expected)
    parts := []string{}
    start := 0
    for i := 0; i < len(c.CORSOrigins); i++ {
        if c.CORSOrigins[i] == ',' {
            parts = append(parts, c.CORSOrigins[start:i])
            start = i + 1
        }
    }
    parts = append(parts, c.CORSOrigins[start:])
    return parts
}

func (c *Config) PortInt() int {
    if p, err := strconv.Atoi(c.Port); err == nil {
        return p
    }
    return 8080
}



