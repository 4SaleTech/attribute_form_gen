package serverhandlers

import (
    "database/sql"
    "encoding/json"
    "net/http"
    "fmt"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// Attributes CRUD
func ListAttributesHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query("SELECT `key`, default_position FROM attributes ORDER BY default_position ASC")
		if err != nil {
			log.Error("failed to query attributes", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
			return
		}
		defer rows.Close()
		out := []gin.H{}
		for rows.Next() {
			var key string
			var pos int
			if err := rows.Scan(&key, &pos); err != nil {
				log.Error("failed to scan attribute", zap.Error(err))
				continue
			}
			out = append(out, gin.H{"key": key, "default_position": pos})
		}
		if err := rows.Err(); err != nil {
			log.Error("error iterating attributes", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
			return
		}
		c.JSON(http.StatusOK, out)
	}
}

type attributeReq struct {
	Key    string            `json:"key"`
	Label  map[string]string `json:"label"`
	Pos    int               `json:"default_position"`
	Status string            `json:"status"`
}

func CreateAttributeHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req attributeReq
		if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"json"}); return }
		label, _ := json.Marshal(req.Label)
		_, err := db.Exec("INSERT INTO attributes(`key`,label_json,default_position,status) VALUES(?,?,?,?)", req.Key, string(label), req.Pos, req.Status)
		if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"insert"}); return }
		c.Status(http.StatusCreated)
	}
}

func UpdateAttributeHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.Param("key")
		var req attributeReq
		if err := c.BindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"json"}); return }
		label, _ := json.Marshal(req.Label)
		_, err := db.Exec("UPDATE attributes SET label_json=?, default_position=?, status=? WHERE `key`=?", string(label), req.Pos, req.Status, key)
		if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"update"}); return }
		c.Status(http.StatusNoContent)
	}
}

func DeleteAttributeHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        key := c.Param("key")
        _, err := db.Exec("DELETE FROM attributes WHERE `key`=?", key)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"delete"}); return }
        c.Status(http.StatusNoContent)
    }
}

// Questions CRUD
type questionReq struct {
	AttributeKey      string            `json:"attribute_key"`
	AttributePosition *int              `json:"attribute_position,omitempty"` // Position for attribute when creating new one
	Type              string            `json:"type"`
	Name              string            `json:"name"`
	Label             map[string]string `json:"label"`
	Props             any               `json:"props"`
	Status            string            `json:"status"`
}

func ListQuestionsHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        rows, err := db.Query("SELECT id, attribute_key, type, name, label_json, props_json, status, version FROM questions")
        if err != nil {
            log.Error("failed to query questions", zap.Error(err))
            c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
            return
        }
        defer rows.Close()
        out := []gin.H{}
        for rows.Next() {
            var id uint64; var ak, t, n, s string; var v int; var lraw, praw []byte
            if err := rows.Scan(&id, &ak, &t, &n, &lraw, &praw, &s, &v); err != nil {
                log.Error("failed to scan question", zap.Error(err))
                continue
            }
            var l map[string]string
            if len(lraw) > 0 {
                if err := json.Unmarshal(lraw, &l); err != nil {
                    log.Error("failed to unmarshal label", zap.Error(err))
                    l = map[string]string{}
                }
            } else {
                l = map[string]string{}
            }
            var p any
            if len(praw) > 0 {
                if err := json.Unmarshal(praw, &p); err != nil {
                    log.Error("failed to unmarshal props", zap.Error(err))
                    p = map[string]any{}
                }
            } else {
                p = map[string]any{}
            }
            out = append(out, gin.H{"id":id,"attribute_key":ak,"type":t,"name":n,"label":l,"props":p,"status":s,"version":v})
        }
        if err := rows.Err(); err != nil {
            log.Error("error iterating questions", zap.Error(err))
            c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
            return
        }
        c.JSON(http.StatusOK, out)
    }
}

func UpsertQuestionHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req questionReq
        if err := c.BindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "json"})
            return
        }
        // Bilingual guard for labels
        if req.Label["en"] == "" || req.Label["ar"] == "" {
            c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "bilingual required", "details": []string{"/label"}})
            return
        }
        // Props i18n guard (placeholder/help/options)
        b, _ := json.Marshal(req.Props)
        var m map[string]any
        _ = json.Unmarshal(b, &m)
        if ph, ok := m["placeholder"].(map[string]any); ok {
            if ph["en"] == nil || ph["ar"] == nil {
                c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "bilingual required", "details": []string{"/props/placeholder"}})
                return
            }
        }
        if ht, ok := m["help"].(map[string]any); ok {
            if ht["en"] == nil || ht["ar"] == nil {
                c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "bilingual required", "details": []string{"/props/help"}})
                return
            }
        }
        if opts, ok := m["options"].([]any); ok {
            for i, ov := range opts {
                om, _ := ov.(map[string]any)
                if lbl, ok := om["label"].(map[string]any); ok {
                    if lbl["en"] == nil || lbl["ar"] == nil {
                        c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "bilingual required", "details": []string{fmt.Sprintf("/props/options/%d/label", i)}})
                        return
                    }
                }
            }
        }
        l, _ := json.Marshal(req.Label)
        p, _ := json.Marshal(req.Props)
        // Auto-create attribute if it doesn't exist
        if req.AttributePosition != nil {
            _, err := db.Exec(
                "INSERT INTO attributes(`key`, label_json, default_position, status) VALUES(?, JSON_OBJECT(), ?, 'active') ON DUPLICATE KEY UPDATE default_position=?",
                req.AttributeKey, *req.AttributePosition, *req.AttributePosition,
            )
            if err != nil {
                log.Error("failed to create/update attribute", zap.String("attribute_key", req.AttributeKey), zap.Error(err))
                c.JSON(http.StatusBadRequest, gin.H{"error": "attribute creation failed", "details": err.Error()})
                return
            }
        } else {
            _, err := db.Exec(
                "INSERT INTO attributes(`key`, label_json, default_position, status) VALUES(?, JSON_OBJECT(), 0, 'active') ON DUPLICATE KEY UPDATE `key`=`key`",
                req.AttributeKey,
            )
            if err != nil {
                log.Error("failed to create/update attribute", zap.String("attribute_key", req.AttributeKey), zap.Error(err))
                c.JSON(http.StatusBadRequest, gin.H{"error": "attribute creation failed", "details": err.Error()})
                return
            }
        }
        // Enforce 1:1 via INSERT ... ON DUPLICATE KEY UPDATE
        _, err := db.Exec(
            "INSERT INTO questions(attribute_key,type,name,label_json,props_json,status,version) VALUES(?,?,?,?,?, ?, 1) ON DUPLICATE KEY UPDATE type=VALUES(type), name=VALUES(name), label_json=VALUES(label_json), props_json=VALUES(props_json), status=VALUES(status), version=version+1",
            req.AttributeKey, req.Type, req.Name, string(l), string(p), req.Status,
        )
        if err != nil {
            log.Error("failed to upsert question", zap.String("attribute_key", req.AttributeKey), zap.String("type", req.Type), zap.String("name", req.Name), zap.Error(err))
            c.JSON(http.StatusBadRequest, gin.H{"error": "upsert failed", "details": err.Error()})
            return
        }
        c.Status(http.StatusCreated)
    }
}

func DeleteQuestionHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")
        _, err := db.Exec("DELETE FROM questions WHERE id=?", id)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"delete"}); return }
        c.Status(http.StatusNoContent)
    }
}

// Forms admin helpers
func ListFormsAdminHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        rows, err := db.Query("SELECT form_id, version, title_json, created_at FROM form_snapshots ORDER BY form_id ASC, version DESC")
        if err != nil {
            log.Error("failed to query forms", zap.Error(err))
            c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
            return
        }
        defer rows.Close()
        out := []gin.H{}
        for rows.Next() {
            var formId string; var version int; var titleRaw []byte; var createdAt string
            if err := rows.Scan(&formId, &version, &titleRaw, &createdAt); err != nil {
                log.Error("failed to scan form", zap.Error(err))
                continue
            }
            var title map[string]string
            if len(titleRaw) > 0 {
                if err := json.Unmarshal(titleRaw, &title); err != nil {
                    log.Error("failed to unmarshal title", zap.Error(err))
                    title = map[string]string{}
                }
            } else {
                title = map[string]string{}
            }
            out = append(out, gin.H{"formId": formId, "version": version, "title": title, "createdAt": createdAt})
        }
        if err := rows.Err(); err != nil {
            log.Error("error iterating forms", zap.Error(err))
            c.JSON(http.StatusInternalServerError, gin.H{"error":"db"})
            return
        }
        c.JSON(http.StatusOK, out)
    }
}

func DeleteFormSnapshotHandler(db *sql.DB, log *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        formId := c.Param("formId")
        version := c.Param("version")
        _, err := db.Exec("DELETE FROM form_snapshots WHERE form_id=? AND version=?", formId, version)
        if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"delete"}); return }
        c.Status(http.StatusNoContent)
    }
}


