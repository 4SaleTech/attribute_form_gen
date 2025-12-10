#!/usr/bin/env python3
"""
Generate CSV with service names and their attribute keys.
Usage:
    python scripts/generate-service-attributes-csv.py [--file FILE] [--output OUTPUT]
"""

import re
import csv
import argparse
from pathlib import Path
from typing import Dict, List

def parse_markdown_file(file_path: Path) -> Dict[str, List[str]]:
    """Parse markdown file and extract services with their attribute keys."""
    content = file_path.read_text(encoding='utf-8')
    lines = content.splitlines()
    
    services = {}
    current_service = None
    current_attributes = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Check for service name (bold text under category)
        # Format: - **Service Name**
        service_match = re.match(r'^-\s*\*\*(.+?)\*\*', line)
        if service_match:
            # Save previous service if exists
            if current_service:
                services[current_service] = list(set(current_attributes))  # Remove duplicates
            
            # Start new service
            current_service = service_match.group(1).strip()
            current_attributes = []
            i += 1
            continue
        
        # Check for attribute_key
        # Format: - Field name *(attribute_key: key, type: type, required: true/false)*
        attr_match = re.search(r'attribute_key:\s*([^,]+)', line)
        if attr_match and current_service:
            attr_key = attr_match.group(1).strip()
            current_attributes.append(attr_key)
        
        i += 1
    
    # Don't forget the last service
    if current_service:
        services[current_service] = list(set(current_attributes))  # Remove duplicates
    
    return services

def write_csv(services: Dict[str, List[str]], output_path: Path):
    """Write services and attributes to CSV file."""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['service', 'attributes'])
        
        for service, attributes in sorted(services.items()):
            attributes_str = ','.join(sorted(attributes))
            writer.writerow([service, attributes_str])

def main():
    parser = argparse.ArgumentParser(description='Generate CSV with service names and attributes')
    parser.add_argument('--file', default='docs/service_request_quesdtions_min_nested_optimized.md', help='Markdown file path')
    parser.add_argument('--output', default='docs/service_attributes.csv', help='Output CSV file path')
    
    args = parser.parse_args()
    
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        return
    
    print(f"Parsing {file_path}...")
    services = parse_markdown_file(file_path)
    print(f"Found {len(services)} services")
    
    output_path = Path(args.output)
    write_csv(services, output_path)
    print(f"CSV written to {output_path}")
    
    # Print summary
    total_attributes = sum(len(attrs) for attrs in services.values())
    print(f"\nSummary:")
    print(f"  Total services: {len(services)}")
    print(f"  Total attribute references: {total_attributes}")
    print(f"\nSample services:")
    for service, attrs in list(services.items())[:5]:
        print(f"  {service}: {len(attrs)} attributes")

if __name__ == '__main__':
    main()


