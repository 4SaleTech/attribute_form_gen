#!/usr/bin/env python3
"""
Parse markdown file and create questions via API.
Usage:
    python scripts/create-questions-from-md.py [--api-url URL] [--token TOKEN] [--file FILE]
"""

import re
import json
import sys
import argparse
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional

def parse_label(line: str) -> Optional[Dict[str, str]]:
    """Parse label line: - label: {en: "...", ar: "..."}"""
    match = re.search(r'label:\s*\{en:\s*"([^"]+)",\s*ar:\s*"([^"]+)"\}', line)
    if match:
        return {"en": match.group(1), "ar": match.group(2)}
    return None

def parse_options(line: str) -> Optional[List[Dict[str, Any]]]:
    """Parse options line: - options: [{value: "...", label: {en: "...", ar: "..."}}, ...]"""
    # Extract the options array part
    match = re.search(r'options:\s*\[(.*)\]', line, re.DOTALL)
    if not match:
        return None
    
    options_str = match.group(1)
    options = []
    
    # Find each option object
    option_pattern = r'\{value:\s*"([^"]+)",\s*label:\s*\{en:\s*"([^"]+)",\s*ar:\s*"([^"]+)"\}\}'
    for opt_match in re.finditer(option_pattern, options_str):
        options.append({
            "value": opt_match.group(1),
            "label": {
                "en": opt_match.group(2),
                "ar": opt_match.group(3)
            }
        })
    
    return options if options else None

def parse_question(lines: List[str], start_idx: int) -> Optional[Dict[str, Any]]:
    """Parse a question from markdown lines starting at start_idx."""
    if start_idx >= len(lines):
        return None
    
    # Parse the main question line: Field name *(attribute_key: key, type: type, required: true/false)*
    main_line = lines[start_idx].strip()
    if not main_line.startswith('- ') or 'attribute_key:' not in main_line:
        return None
    
    # Extract attribute_key, type, and required
    attr_match = re.search(r'attribute_key:\s*([^,]+),\s*type:\s*([^,]+),\s*required:\s*(true|false)', main_line)
    if not attr_match:
        return None
    
    attribute_key = attr_match.group(1).strip()
    field_type = attr_match.group(2).strip()
    required = attr_match.group(3).strip() == 'true'
    
    # Extract field name (before the *)
    field_name_match = re.match(r'-\s*(.+?)\s*\*', main_line)
    field_name = field_name_match.group(1).strip() if field_name_match else attribute_key
    
    # Parse subsequent lines for label, options, allow_other
    label = None
    options = None
    allow_other = False
    
    i = start_idx + 1
    while i < len(lines):
        line = lines[i].strip()
        
        # Stop if we hit another question or section
        if line.startswith('- ') and ('attribute_key:' in line or line.startswith('- **')):
            break
        if line.startswith('## '):
            break
        
        # Parse label
        if line.startswith('- label:'):
            label = parse_label(line)
        
        # Parse options
        if line.startswith('- options:'):
            options = parse_options(line)
        
        # Parse allow_other
        if line.startswith('- allow_other:'):
            allow_other = 'true' in line.lower()
        
        i += 1
    
    if not label:
        return None
    
    # Build props
    props: Dict[str, Any] = {
        "required": required
    }
    
    if allow_other:
        props["allow_other"] = True
    
    if options:
        props["options"] = options
    
    return {
        "attribute_key": attribute_key,
        "type": field_type,
        "name": attribute_key,  # Use attribute_key as name
        "label": label,
        "props": props,
        "status": "active"
    }

def parse_markdown_file(file_path: Path) -> List[Dict[str, Any]]:
    """Parse markdown file and extract all questions."""
    content = file_path.read_text(encoding='utf-8')
    lines = content.splitlines()
    
    questions = []
    i = 0
    while i < len(lines):
        question = parse_question(lines, i)
        if question:
            questions.append(question)
            # Skip lines we've already processed
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('- ') and not lines[i].strip().startswith('## '):
                i += 1
        else:
            i += 1
    
    return questions

def create_question(api_url: str, token: str, question: Dict[str, Any]) -> bool:
    """Create a question via API."""
    url = f"{api_url}/api/questions"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=question, headers=headers, timeout=30)
        if response.status_code in [200, 201, 204]:
            print(f"✓ Created: {question['attribute_key']}")
            return True
        else:
            print(f"✗ Failed: {question['attribute_key']} - {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {question['attribute_key']} - {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Create questions from markdown file')
    parser.add_argument('--api-url', default='http://localhost:8080', help='API base URL')
    parser.add_argument('--token', default='', help='Admin bearer token (required unless --dry-run)')
    parser.add_argument('--file', default='docs/service_request_quesdtions_min_nested_optimized.md', help='Markdown file path')
    parser.add_argument('--dry-run', action='store_true', help='Parse and show questions without creating them')
    
    args = parser.parse_args()
    
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    
    print(f"Parsing {file_path}...")
    questions = parse_markdown_file(file_path)
    print(f"Found {len(questions)} questions")
    
    if args.dry_run:
        print("\nQuestions to be created:")
        for q in questions[:5]:  # Show first 5 as sample
            print(json.dumps(q, indent=2, ensure_ascii=False))
        print(f"\n... and {len(questions) - 5} more")
        return
    
    if not args.token:
        print("Error: --token is required (unless using --dry-run)")
        sys.exit(1)
    
    # Deduplicate by attribute_key (keep first occurrence)
    seen = {}
    unique_questions = []
    for q in questions:
        key = q['attribute_key']
        if key not in seen:
            seen[key] = True
            unique_questions.append(q)
        else:
            print(f"⚠ Skipping duplicate: {key}")
    
    print(f"Creating {len(unique_questions)} unique questions...")
    
    success_count = 0
    fail_count = 0
    
    for question in unique_questions:
        if create_question(args.api_url, args.token, question):
            success_count += 1
        else:
            fail_count += 1
    
    print(f"\nSummary: {success_count} created, {fail_count} failed")

if __name__ == '__main__':
    main()

