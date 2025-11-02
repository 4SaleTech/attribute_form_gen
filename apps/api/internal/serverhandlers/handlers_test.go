package serverhandlers

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/example/formrepo/apps/api/internal/server"
    "go.uber.org/zap"
)

func TestHealth(t *testing.T) {
    cfg := &config.Config{ Port: "0", CORSOrigins: "http://localhost:5173", AdminToken: "dev-admin-token", DBHost: "localhost", DBPort: 3307, DBName: "formdev", DBUser: "formdev", DBPassword: "formdevpw", CloudName:"x", CloudAPIKey:"x", CloudAPISecret:"x", UploadFolder:"forms/uploads", WebhookSigningKey:"k" }
    log, _ := zap.NewDevelopment()
    // WARNING: requires local MySQL at 3307
    s := server.New(cfg, log)
    req := httptest.NewRequest("GET", "/api/health", nil)
    w := httptest.NewRecorder()
    s.Engine.ServeHTTP(w, req)
    if w.Code != http.StatusOK { t.Fatalf("expected 200 got %d", w.Code) }
}



