package serverhandlers

import (
        "bytes"
        "encoding/json"
        "io"
        "net/http"

        "github.com/gin-gonic/gin"
        "go.uber.org/zap"
)

type PurchaseProxyRequest struct {
        Items []struct {
                ID         string `json:"id"`
                CategoryID string `json:"category_id"`
                DistrictID string `json:"district_id"`
        } `json:"items"`
        AdvID         string `json:"adv_id"`
        UserLang      string `json:"user_lang"`
        PaymentMethod string `json:"payment_method"`
        AuthToken     string `json:"auth_token"`
        PurchaseURL   string `json:"purchase_url"`
}

func PurchaseProxyHandler(log *zap.Logger) gin.HandlerFunc {
        return func(c *gin.Context) {
                var req PurchaseProxyRequest
                if err := c.ShouldBindJSON(&req); err != nil {
                        log.Error("purchase proxy: invalid request", zap.Error(err))
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
                        return
                }

                if req.AuthToken == "" {
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Auth token required"})
                        return
                }

                if req.PurchaseURL == "" {
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Purchase URL required"})
                        return
                }

                payload := map[string]interface{}{
                        "items":          req.Items,
                        "adv_id":         req.AdvID,
                        "user_lang":      req.UserLang,
                        "payment_method": req.PaymentMethod,
                }

                jsonBody, err := json.Marshal(payload)
                if err != nil {
                        log.Error("purchase proxy: marshal error", zap.Error(err))
                        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal request"})
                        return
                }

                log.Info("purchase proxy: calling external API",
                        zap.String("url", req.PurchaseURL),
                        zap.String("adv_id", req.AdvID),
                )

                httpReq, err := http.NewRequest("POST", req.PurchaseURL, bytes.NewBuffer(jsonBody))
                if err != nil {
                        log.Error("purchase proxy: create request error", zap.Error(err))
                        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
                        return
                }

                httpReq.Header.Set("Authorization", "Bearer "+req.AuthToken)
                httpReq.Header.Set("Content-Type", "application/json")
                httpReq.Header.Set("Accept", "application/json")

                client := &http.Client{}
                resp, err := client.Do(httpReq)
                if err != nil {
                        log.Error("purchase proxy: API call error", zap.Error(err))
                        c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to call purchase API: " + err.Error()})
                        return
                }
                defer resp.Body.Close()

                body, err := io.ReadAll(resp.Body)
                if err != nil {
                        log.Error("purchase proxy: read response error", zap.Error(err))
                        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
                        return
                }

                log.Info("purchase proxy: received response",
                        zap.Int("status", resp.StatusCode),
                        zap.String("body", string(body)),
                )

                var result map[string]interface{}
                if err := json.Unmarshal(body, &result); err != nil {
                        c.Data(resp.StatusCode, "application/json", body)
                        return
                }

                c.JSON(resp.StatusCode, result)
        }
}

type ItemVariantProxyRequest struct {
        AuthToken string `json:"auth_token"`
        BaseURL   string `json:"base_url"`
        VariantID string `json:"variant_id"`
}

func ItemVariantProxyHandler(log *zap.Logger) gin.HandlerFunc {
        return func(c *gin.Context) {
                var req ItemVariantProxyRequest
                if err := c.ShouldBindJSON(&req); err != nil {
                        log.Error("item variant proxy: invalid request", zap.Error(err))
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
                        return
                }

                if req.AuthToken == "" {
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Auth token required"})
                        return
                }

                if req.VariantID == "" {
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Variant ID required"})
                        return
                }

                // Construct the API URL
                baseURL := req.BaseURL
                if baseURL == "" {
                        baseURL = "https://staging-services.q84sale.com/api/v1"
                }
                apiURL := baseURL + "/cashier/catalog/item_variants/" + req.VariantID

                log.Info("item variant proxy: calling external API",
                        zap.String("url", apiURL),
                        zap.String("variant_id", req.VariantID),
                )

                httpReq, err := http.NewRequest("GET", apiURL, nil)
                if err != nil {
                        log.Error("item variant proxy: create request error", zap.Error(err))
                        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
                        return
                }

                httpReq.Header.Set("Authorization", "Bearer "+req.AuthToken)
                httpReq.Header.Set("Accept", "application/json")

                client := &http.Client{}
                resp, err := client.Do(httpReq)
                if err != nil {
                        log.Error("item variant proxy: API call error", zap.Error(err))
                        c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to call API: " + err.Error()})
                        return
                }
                defer resp.Body.Close()

                body, err := io.ReadAll(resp.Body)
                if err != nil {
                        log.Error("item variant proxy: read response error", zap.Error(err))
                        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
                        return
                }

                log.Info("item variant proxy: received response",
                        zap.Int("status", resp.StatusCode),
                        zap.String("body", string(body)),
                )

                var result map[string]interface{}
                if err := json.Unmarshal(body, &result); err != nil {
                        c.Data(resp.StatusCode, "application/json", body)
                        return
                }

                c.JSON(resp.StatusCode, result)
        }
}
