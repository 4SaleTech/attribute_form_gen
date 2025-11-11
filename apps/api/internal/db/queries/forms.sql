-- name: GetLatestForm :one
SELECT version, title_json, fields_json, attributes_json, thank_you_json, submit_json, supported_locales_json, default_locale
FROM form_snapshots WHERE form_id = ? ORDER BY version DESC LIMIT 1;

-- name: GetFormByVersion :one
SELECT version, title_json, fields_json, attributes_json, thank_you_json, submit_json, supported_locales_json, default_locale
FROM form_snapshots WHERE form_id = ? AND version = ?;

-- name: InsertForm :exec
INSERT INTO form_snapshots(form_id,version,title_json,fields_json,attributes_json,thank_you_json,submit_json,supported_locales_json,default_locale,status)
VALUES(?,?,?,?,?,?,?,JSON_ARRAY('en','ar'),'en','active');



