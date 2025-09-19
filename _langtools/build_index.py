#!/usr/bin/env python3
"""
Build an index of all keys in the lang/en.json file.
This creates a lightweight index for fast key lookups without loading the entire file.
"""

import json
import os
from typing import Dict, Any, Tuple
from pathlib import Path


def extract_keys(obj: Any, prefix: str = "", line_tracker: Dict[str, int] = None, current_line: int = 1) -> Tuple[Dict[str, int], int]:
    """
    Recursively extract all keys from a JSON object with line tracking.
    Returns a dictionary mapping key paths to approximate line numbers.
    """
    if line_tracker is None:
        line_tracker = {}
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            key_path = f"{prefix}.{key}" if prefix else key
            line_tracker[key_path] = current_line
            current_line += 1
            
            if isinstance(value, dict):
                line_tracker, current_line = extract_keys(value, key_path, line_tracker, current_line)
            elif isinstance(value, str):
                # Count newlines in string values
                current_line += value.count('\n')
    
    return line_tracker, current_line


def build_namespace_tree(keys: Dict[str, int]) -> Dict[str, Any]:
    """Build a hierarchical namespace tree from flat keys."""
    tree = {}
    for key_path in sorted(keys.keys()):
        parts = key_path.split('.')
        current = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                # Leaf node - store line number
                current[part] = {"_line": keys[key_path]}
            else:
                if part not in current:
                    current[part] = {}
                elif "_line" in current[part]:
                    # Convert leaf to branch
                    line = current[part]["_line"]
                    current[part] = {"_line": line}
                current = current[part]
    return tree


def analyze_json_structure(file_path: str) -> Dict[str, Any]:
    """Analyze the JSON file and build an index."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Extract all keys with line approximations
    keys, total_lines = extract_keys(data)
    
    # Get actual line positions for better accuracy
    # This is a simple approach - for more accuracy, we'd need a streaming parser
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Build namespace tree
    namespace_tree = build_namespace_tree(keys)
    
    # Calculate statistics
    namespaces = set()
    for key in keys:
        parts = key.split('.')
        for i in range(1, len(parts)):
            namespaces.add('.'.join(parts[:i]))
    
    # Count keys by top-level namespace
    namespace_counts = {}
    for key in keys:
        top_namespace = key.split('.')[1] if '.' in key else key
        namespace_counts[top_namespace] = namespace_counts.get(top_namespace, 0) + 1
    
    return {
        "metadata": {
            "total_keys": len(keys),
            "total_lines": len(lines),
            "file_size": os.path.getsize(file_path),
            "namespaces": len(namespaces),
            "top_namespaces": namespace_counts
        },
        "keys": keys,
        "namespace_tree": namespace_tree,
        "namespaces": sorted(list(namespaces))
    }


def main():
    # Paths
    script_dir = Path(__file__).parent
    lang_dir = script_dir.parent
    json_file = lang_dir / "en.json"
    index_file = script_dir / "lang_index.json"
    
    print(f"Building index for: {json_file}")
    
    if not json_file.exists():
        print(f"Error: {json_file} not found!")
        return
    
    # Analyze and build index
    index_data = analyze_json_structure(str(json_file))
    
    # Save index
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print(f"\nIndex built successfully!")
    print(f"Output: {index_file}")
    print(f"\nStatistics:")
    print(f"  Total keys: {index_data['metadata']['total_keys']}")
    print(f"  Total lines: {index_data['metadata']['total_lines']}")
    print(f"  File size: {index_data['metadata']['file_size']:,} bytes")
    print(f"  Namespaces: {index_data['metadata']['namespaces']}")
    print(f"\nTop namespaces:")
    for ns, count in sorted(index_data['metadata']['top_namespaces'].items(), 
                           key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {ns}: {count} keys")


if __name__ == "__main__":
    main()
