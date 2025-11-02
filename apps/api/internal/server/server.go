package server

import (
    "database/sql"
    "net/http"
    "time"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/example/formrepo/apps/api/internal/serverhandlers"
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    _ "github.com/go-sql-driver/mysql"
    "go.uber.org/zap"
)

type Server struct {
    Engine *gin.Engine
    cfg    *config.Config
    db     *sql.DB
    log    *zap.Logger
}

func New(cfg *config.Config, log *zap.Logger) *Server {
    gin.SetMode(gin.ReleaseMode)
    r := gin.New()
    
    // Recovery middleware with logging
    r.Use(gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
        log.Error("panic recovered",
            zap.Any("error", recovered),
            zap.String("path", c.Request.URL.Path),
            zap.String("method", c.Request.Method),
        )
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
    }))

    // logging middleware
    r.Use(func(c *gin.Context) {
        start := time.Now()
        c.Next()
        log.Info("http",
            zap.String("method", c.Request.Method),
            zap.String("path", c.Request.URL.Path),
            zap.Int("status", c.Writer.Status()),
            zap.Duration("dur", time.Since(start)),
        )
    })

    // CORS
    corsCfg := cors.DefaultConfig()
    corsCfg.AllowOrigins = cfg.CORSOriginsList()
    corsCfg.AllowHeaders = []string{"Authorization", "Content-Type"}
    corsCfg.AllowCredentials = true
    r.Use(cors.New(corsCfg))

    // DB
    db, err := sql.Open("mysql", cfg.DSN())
    if err != nil {
        log.Fatal("db open", zap.Error(err))
    }
    if err := db.Ping(); err != nil {
        log.Fatal("db ping", zap.Error(err))
    }

    s := &Server{Engine: r, cfg: cfg, db: db, log: log}
    s.registerRoutes()
    return s
}

func (s *Server) registerRoutes() {
    api := s.Engine.Group("/api")

    // health
    api.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

    // Admin routes (Bearer) - register FIRST to ensure webhooks routes match before public routes
    admin := api.Group("")
    admin.Use(serverhandlers.AdminAuthMiddleware(s.cfg))
    
    // Admin form endpoints - specific routes first
    admin.POST("/forms/publish", serverhandlers.PublishFormHandler(s.db, s.cfg, s.log))
    admin.GET("/forms", serverhandlers.ListFormsAdminHandler(s.db, s.log))
    
    // Admin form webhooks - MUST be registered BEFORE any /forms/:formId/:version routes
    // Otherwise Gin will match /forms/:formId/:version/webhooks to /forms/:formId/:version
    admin.GET("/forms/:formId/:version/webhooks", serverhandlers.ListWebhooksHandler(s.db, s.log))
    admin.POST("/forms/:formId/:version/webhooks", serverhandlers.CreateWebhookHandler(s.db, s.log))
    admin.PUT("/forms/:formId/:version/webhooks/:id", serverhandlers.UpdateWebhookHandler(s.db, s.log))
    admin.DELETE("/forms/:formId/:version/webhooks/:id", serverhandlers.DeleteWebhookHandler(s.db, s.log))
    
    // Admin form delete - must be AFTER webhooks routes to avoid conflicts
    admin.DELETE("/forms/:formId/:version", serverhandlers.DeleteFormSnapshotHandler(s.db, s.log))
    
    // Admin attributes
    admin.GET("/attributes", serverhandlers.ListAttributesHandler(s.db, s.log))
    admin.POST("/attributes", serverhandlers.CreateAttributeHandler(s.db, s.log))
    admin.PUT("/attributes/:key", serverhandlers.UpdateAttributeHandler(s.db, s.log))
    admin.DELETE("/attributes/:key", serverhandlers.DeleteAttributeHandler(s.db, s.log))

    // Admin questions
    admin.GET("/questions", serverhandlers.ListQuestionsHandler(s.db, s.log))
    admin.POST("/questions", serverhandlers.UpsertQuestionHandler(s.db, s.log))
    admin.DELETE("/questions/:id", serverhandlers.DeleteQuestionHandler(s.db, s.log))

    // Admin submissions
    admin.GET("/submissions", serverhandlers.ListSubmissionsHandler(s.db, s.log))

    // Public endpoints - register AFTER admin routes
    api.POST("/uploads/sign", serverhandlers.UploadSignHandler(s.cfg, s.log))
    api.POST("/forms/generate", serverhandlers.GenerateFormHandler(s.db, s.cfg, s.log))
    api.POST("/submissions", serverhandlers.SubmitHandler(s.db, s.cfg, s.log))
    
    // Public form creation endpoint (with API key auth) - register BEFORE parameterized routes
    api.POST("/forms/create", func(c *gin.Context) {
        // Apply API key auth middleware
        mw := serverhandlers.APIKeyAuthMiddleware(s.cfg)
        mw(c)
        if !c.IsAborted() {
            // Call the actual handler
            handler := serverhandlers.PublishFormHandler(s.db, s.cfg, s.log)
            handler(c)
        }
    })
    
    // Public form endpoints - must be LAST to avoid matching webhooks routes
    api.GET("/forms/:formId/latest", serverhandlers.GetFormLatestHandler(s.db, s.cfg, s.log))
    api.GET("/forms/:formId/:version", serverhandlers.GetFormVersionHandler(s.db, s.cfg, s.log))
}


