package serverhandlers

import (
    "net/http"
    "strings"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/gin-gonic/gin"
)

func AdminAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        auth := c.GetHeader("Authorization")
        if !strings.HasPrefix(auth, "Bearer ") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer"})
            return
        }
        token := strings.TrimPrefix(auth, "Bearer ")
        if token != cfg.AdminToken {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            return
        }
        c.Next()
    }
}

// APIKeyAuthMiddleware checks for X-API-Key header as an alternative to Bearer token
func APIKeyAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        // First try Bearer token
        auth := c.GetHeader("Authorization")
        if strings.HasPrefix(auth, "Bearer ") {
            token := strings.TrimPrefix(auth, "Bearer ")
            if token == cfg.AdminToken {
                c.Next()
                return
            }
        }
        
        // Fallback to API key
        apiKey := c.GetHeader("X-API-Key")
        if apiKey == "" {
            apiKey = c.Query("api_key")
        }
        
        if apiKey == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authentication: provide either Authorization: Bearer <token> header or X-API-Key header"})
            return
        }
        
        if apiKey != cfg.AdminToken {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
            return
        }
        
        c.Next()
    }
}



