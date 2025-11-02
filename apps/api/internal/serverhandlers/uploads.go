package serverhandlers

import (
    "crypto/sha1"
    "encoding/hex"
    "fmt"
    "net/http"
    "time"

    "github.com/example/formrepo/apps/api/internal/config"
    "github.com/gin-gonic/gin"
    "github.com/lucsky/cuid"
    "go.uber.org/zap"
)

type uploadSignReq struct {
    Folder          string `json:"folder"`
    PublicIdPrefix  string `json:"publicIdPrefix"`
    Timestamp       int64  `json:"timestamp"`
}

type uploadSignResp struct {
    CloudName string `json:"cloudName"`
    APIKey    string `json:"apiKey"`
    Timestamp int64  `json:"timestamp"`
    Signature string `json:"signature"`
    Folder    string `json:"folder"`
    UploadURL string `json:"uploadUrl"`
    PublicID  string `json:"publicId"`
}

// UploadSignHandler returns Cloudinary-compatible signature.
func UploadSignHandler(cfg *config.Config, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req uploadSignReq
        if err := c.BindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
            return
        }
        if req.Timestamp == 0 {
            req.Timestamp = time.Now().Unix()
        }
        folder := req.Folder
        if folder == "" {
            folder = cfg.UploadFolder
        }
        publicID := req.PublicIdPrefix
        if publicID == "" {
            publicID = "form"
        }
        publicID = fmt.Sprintf("%s_%s", publicID, cuid.New())

        // Cloudinary signature is SHA1 of canonical string + api secret.
        // canonical params must be sorted and concatenated without URL encoding.
        // We include folder, public_id, timestamp.
        canonical := fmt.Sprintf("folder=%s&public_id=%s&timestamp=%d%s", folder, publicID, req.Timestamp, cfg.CloudAPISecret)
        h := sha1.Sum([]byte(canonical))
        signature := hex.EncodeToString(h[:])

        resp := uploadSignResp{
            CloudName: cfg.CloudName,
            APIKey:    cfg.CloudAPIKey,
            Timestamp: req.Timestamp,
            Signature: signature,
            Folder:    folder,
            UploadURL: fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/auto/upload", cfg.CloudName),
            PublicID:  publicID,
        }
        c.JSON(http.StatusOK, resp)
    }
}



