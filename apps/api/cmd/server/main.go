package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/example/formrepo/apps/api/internal/server"
    "github.com/joho/godotenv"
    "go.uber.org/zap"
)

func main() {
    // Load ENVFILE if provided (development convenience)
    if envFile := os.Getenv("ENVFILE"); envFile != "" {
        _ = godotenv.Load(envFile)
    }

    var cfg config.Config
    if err := config.Load(&cfg); err != nil {
        log.Fatalf("load config: %v", err)
    }

    logger, _ := zap.NewProduction()
    defer logger.Sync()

    srv := server.New(&cfg, logger)

    httpServer := &http.Server{
        Addr:           ":" + cfg.Port,
        Handler:        srv.Engine,
        ReadTimeout:    15 * time.Second,
        WriteTimeout:   30 * time.Second,
        MaxHeaderBytes: 1 << 20,
    }

    go func() {
        logger.Info("api starting", zap.String("addr", httpServer.Addr))
        if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Fatal("server error", zap.Error(err))
        }
    }()

    // graceful shutdown
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    <-stop

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    _ = httpServer.Shutdown(ctx)
}



