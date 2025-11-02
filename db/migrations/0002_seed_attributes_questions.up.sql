INSERT INTO attributes(`key`, `label_json`, `default_position`, `status`) VALUES
('hero_banner',        JSON_OBJECT('en','Hero banner','ar','بانر رئيسي'), 0, 'active')
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json);

INSERT INTO attributes(`key`, `label_json`, `default_position`, `status`) VALUES
('contact_pref',       JSON_OBJECT('en','Preferred contact','ar','طريقة التواصل'), 1, 'active')
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json);

INSERT INTO attributes(`key`, `label_json`, `default_position`, `status`) VALUES
('phone_number',       JSON_OBJECT('en','Phone number','ar','رقم الهاتف'), 2, 'active')
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json);

INSERT INTO attributes(`key`, `label_json`, `default_position`, `status`) VALUES
('attachments',        JSON_OBJECT('en','Attachments','ar','مرفقات'), 3, 'active')
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json);

-- Questions (1:1)
INSERT INTO questions(`attribute_key`,`type`,`name`,`label_json`,`props_json`,`status`,`version`) VALUES
('hero_banner',  'info',       'hero_banner', JSON_OBJECT('en','Welcome','ar','مرحباً'), JSON_OBJECT('variant','hero'), 'active', 1)
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json), props_json=VALUES(props_json);

INSERT INTO questions(`attribute_key`,`type`,`name`,`label_json`,`props_json`,`status`,`version`) VALUES
('contact_pref','radio',       'contact_pref', JSON_OBJECT('en','How should we contact you?','ar','كيف نصل إليك؟'), JSON_OBJECT('options', JSON_ARRAY(JSON_OBJECT('value','phone','label',JSON_OBJECT('en','Phone','ar','هاتف')), JSON_OBJECT('value','email','label',JSON_OBJECT('en','Email','ar','بريد')))), 'active', 1)
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json), props_json=VALUES(props_json);

INSERT INTO questions(`attribute_key`,`type`,`name`,`label_json`,`props_json`,`status`,`version`) VALUES
('phone_number','phone',       'phone_number', JSON_OBJECT('en','Phone number','ar','رقم الهاتف'), JSON_OBJECT('placeholder', JSON_OBJECT('en','e.g. +965...','ar','مثال: +965...')), 'active', 1)
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json), props_json=VALUES(props_json);

INSERT INTO questions(`attribute_key`,`type`,`name`,`label_json`,`props_json`,`status`,`version`) VALUES
('attachments', 'file_upload', 'attachments', JSON_OBJECT('en','Attachments','ar','مرفقات'), JSON_OBJECT('maxFiles', 5), 'active', 1)
ON DUPLICATE KEY UPDATE label_json=VALUES(label_json), props_json=VALUES(props_json);



