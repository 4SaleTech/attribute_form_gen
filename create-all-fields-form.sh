#!/bin/bash

# Script to create a form with all field types
BASE_URL="http://localhost:8080"
TOKEN="dev-admin-token"

echo "Creating attributes and questions for all field types..."

# Create all attributes and questions
create_question() {
  local attr_key=$1
  local type=$2
  local name=$3
  local label_en=$4
  local label_ar=$5
  local position=$6
  local props=$7

  echo "Creating $attr_key ($type)..."
  
  curl -s -X POST "$BASE_URL/api/questions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"attribute_key\": \"$attr_key\",
      \"attribute_position\": $position,
      \"type\": \"$type\",
      \"name\": \"$name\",
      \"label\": {
        \"en\": \"$label_en\",
        \"ar\": \"$label_ar\"
      },
      \"props\": $props,
      \"status\": \"active\"
    }" > /dev/null
}

# Create all field types
create_question "field_info" "info" "field_info" "Welcome Message" "رسالة الترحيب" 0 '{"variant":"hero","description":{"en":"This form demonstrates all available field types","ar":"هذا النموذج يعرض جميع أنواع الحقول المتاحة"}}'

create_question "field_text" "text" "field_text" "Text Input" "حقل نصي" 1 '{"placeholder":{"en":"Enter text here","ar":"أدخل النص هنا"},"max_length":100}'

create_question "field_textarea" "textarea" "field_textarea" "Text Area" "منطقة نصية" 2 '{"placeholder":{"en":"Enter your message","ar":"أدخل رسالتك"},"rows":5}'

create_question "field_number" "number" "field_number" "Number" "رقم" 3 '{"min":0,"max":1000,"step":1,"unit":{"en":"units","ar":"وحدات"}}'

create_question "field_email" "email" "field_email" "Email Address" "البريد الإلكتروني" 4 '{"placeholder":{"en":"example@email.com","ar":"example@email.com"}}'

create_question "field_phone" "phone" "field_phone" "Phone Number" "رقم الهاتف" 5 '{"placeholder":{"en":"Enter phone number","ar":"أدخل رقم الهاتف"},"default_country":"KW"}'

create_question "field_date" "date" "field_date" "Date" "التاريخ" 6 '{}'

create_question "field_time" "time" "field_time" "Time" "الوقت" 7 '{}'

create_question "field_select" "select" "field_select" "Select Dropdown" "قائمة منسدلة" 8 '{"options":[{"value":"option1","label":{"en":"Option 1","ar":"خيار 1"}},{"value":"option2","label":{"en":"Option 2","ar":"خيار 2"}},{"value":"option3","label":{"en":"Option 3","ar":"خيار 3"}}],"searchable":true}'

create_question "field_multiselect" "multiselect" "field_multiselect" "Multi Select" "اختيار متعدد" 9 '{"options":[{"value":"item1","label":{"en":"Item 1","ar":"عنصر 1"}},{"value":"item2","label":{"en":"Item 2","ar":"عنصر 2"}},{"value":"item3","label":{"en":"Item 3","ar":"عنصر 3"}}],"searchable":true}'

create_question "field_radio" "radio" "field_radio" "Radio Buttons" "أزرار الاختيار" 10 '{"options":[{"value":"choice1","label":{"en":"Choice 1","ar":"اختيار 1"}},{"value":"choice2","label":{"en":"Choice 2","ar":"اختيار 2"}},{"value":"choice3","label":{"en":"Choice 3","ar":"اختيار 3"}}],"allow_other":true}'

create_question "field_checkbox" "checkbox" "field_checkbox" "Checkbox" "مربع اختيار" 11 '{"label":{"en":"I agree to the terms","ar":"أوافق على الشروط"},"required":true}'

create_question "field_switch" "switch" "field_switch" "Switch Toggle" "مفتاح تبديل" 12 '{"label":{"en":"Enable notifications","ar":"تفعيل الإشعارات"}}'

create_question "field_file" "file_upload" "field_file" "File Upload" "رفع ملف" 13 '{"max_files":3,"max_size_mb":10,"accept":["image/*","application/pdf"]}'

create_question "field_location" "location" "field_location" "Location" "الموقع" 14 '{"high_accuracy":true,"timeout":10000}'

echo ""
echo "Creating form with all field types..."

# Create the form
RESPONSE=$(curl -s -X POST "$BASE_URL/api/forms/publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Complete Form - All Field Types",
      "ar": "نموذج كامل - جميع أنواع الحقول"
    },
    "attributes": [
      "field_info",
      "field_text",
      "field_textarea",
      "field_number",
      "field_email",
      "field_phone",
      "field_date",
      "field_time",
      "field_select",
      "field_multiselect",
      "field_radio",
      "field_checkbox",
      "field_switch",
      "field_file",
      "field_location"
    ],
    "thankYou": {
      "show": true,
      "title": {
        "en": "Thank You!",
        "ar": "شكراً لك!"
      },
      "message": {
        "en": "Your form has been submitted successfully. We have received all your information.",
        "ar": "تم إرسال النموذج بنجاح. لقد استلمنا جميع معلوماتك."
      }
    },
    "submit": {
      "actions": [
        {
          "type": "server_persist",
          "enabled": true
        },
        {
          "type": "native_bridge",
          "enabled": false
        },
        {
          "type": "webhooks",
          "enabled": false
        },
        {
          "type": "redirect",
          "enabled": false,
          "url": ""
        },
        {
          "type": "nextjs_post",
          "enabled": false
        }
      ],
      "ordering": ["server_persist", "native_bridge", "webhooks", "nextjs_post", "redirect"],
      "timeout_ms": 6000,
      "on_error": "continue",
      "idempotency": {
        "enabled": true,
        "key": "sessionId"
      }
    }
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo "Form created successfully!"

