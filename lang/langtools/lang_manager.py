#!/usr/bin/env python3
"""
Language Manager - A tool to efficiently work with large translation JSON files.
Provides CRUD operations without loading the entire file into memory.
"""

import json
import os
import re
import sys
import argparse
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime
import tempfile
import shutil


class LanguageManager:
    """Manager for large language JSON files with index-based access."""
    
    def __init__(self, json_file: str = None, index_file: str = None):
        """Initialize the language manager."""
        script_dir = Path(__file__).parent
        lang_dir = script_dir.parent
        
        self.json_file = Path(json_file) if json_file else lang_dir / "en.json"
        self.index_file = Path(index_file) if index_file else script_dir / "lang_index.json"
        
        # Cache for recently accessed keys
        self.cache = {}
        self.cache_size = 100
        
        # Pending changes (not yet saved)
        self.changes = {
            "added": {},
            "modified": {},
            "deleted": set()
        }
        
        # Load index if it exists
        self.index = self._load_index()
        
        # Load the full JSON structure (we'll optimize this later if needed)
        self.data = self._load_json()
    
    def reload(self) -> None:
        """Force reload all data from disk, clearing caches and pending changes."""
        # Clear all internal state
        self.cache.clear()
        self.changes = {
            "added": {},
            "modified": {},
            "deleted": set()
        }
        
        # Reload data from disk
        self.index = self._load_index()
        self.data = self._load_json()
    
    def _load_index(self) -> Optional[Dict]:
        """Load the index file if it exists."""
        if self.index_file.exists():
            with open(self.index_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def _load_json(self) -> Dict:
        """Load the full JSON file."""
        if self.json_file.exists():
            with open(self.json_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _save_json(self, data: Dict, file_path: Path = None) -> bool:
        """Save JSON data to file."""
        if file_path is None:
            file_path = self.json_file
        
        try:
            # Create backup
            backup_path = file_path.with_suffix('.json.bak')
            if file_path.exists():
                shutil.copy2(file_path, backup_path)
            
            # Write to temporary file first
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', 
                                           delete=False, suffix='.json') as tmp:
                json.dump(data, tmp, indent=2, ensure_ascii=False)
                tmp_path = tmp.name
            
            # Move temporary file to target
            shutil.move(tmp_path, file_path)
            return True
        except Exception as e:
            print(f"Error saving file: {e}")
            return False
    
    def _get_nested_value(self, data: Dict, key_path: str) -> Any:
        """Get a value from nested dictionary using dot notation."""
        keys = key_path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _set_nested_value(self, data: Dict, key_path: str, value: Any) -> bool:
        """Set a value in nested dictionary using dot notation."""
        keys = key_path.split('.')
        current = data
        
        # Navigate to the parent of the target key
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            elif not isinstance(current[key], dict):
                # Can't set nested value if parent is not a dict
                return False
            current = current[key]
        
        # Set the value
        current[keys[-1]] = value
        return True
    
    def _delete_nested_key(self, data: Dict, key_path: str) -> bool:
        """Delete a key from nested dictionary using dot notation."""
        keys = key_path.split('.')
        current = data
        
        # Navigate to the parent of the target key
        for key in keys[:-1]:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return False
        
        # Delete the key
        if isinstance(current, dict) and keys[-1] in current:
            del current[keys[-1]]
            return True
        
        return False
    
    def get_key(self, key_path: str) -> Optional[Any]:
        """Get a value by its key path."""
        # Check cache first
        if key_path in self.cache:
            return self.cache[key_path]
        
        # Check pending changes
        if key_path in self.changes["deleted"]:
            return None
        if key_path in self.changes["modified"]:
            return self.changes["modified"][key_path]
        if key_path in self.changes["added"]:
            return self.changes["added"][key_path]
        
        # Get from data
        value = self._get_nested_value(self.data, key_path)
        
        # Update cache
        if len(self.cache) >= self.cache_size:
            # Remove oldest item (simple FIFO)
            self.cache.pop(next(iter(self.cache)))
        self.cache[key_path] = value
        
        return value
    
    def set_key(self, key_path: str, value: str) -> bool:
        """Set or update a key value."""
        # Check if key exists
        existing = self._get_nested_value(self.data, key_path)
        
        if existing is not None:
            # Modifying existing key
            self.changes["modified"][key_path] = value
            if key_path in self.changes["added"]:
                self.changes["added"][key_path] = value
        else:
            # Adding new key
            self.changes["added"][key_path] = value
        
        # Remove from deleted if present
        self.changes["deleted"].discard(key_path)
        
        # Update cache
        self.cache[key_path] = value
        
        return True
    
    def delete_key(self, key_path: str) -> bool:
        """Delete a key."""
        # Check if key exists
        if self._get_nested_value(self.data, key_path) is None:
            return False
        
        # Mark for deletion
        self.changes["deleted"].add(key_path)
        
        # Remove from other change sets
        self.changes["modified"].pop(key_path, None)
        self.changes["added"].pop(key_path, None)
        
        # Remove from cache
        self.cache.pop(key_path, None)
        
        return True
    
    def search_keys(self, pattern: str) -> List[str]:
        """Search for keys matching a pattern."""
        regex = re.compile(pattern, re.IGNORECASE)
        matching_keys = []
        
        def search_dict(d: Dict, prefix: str = ""):
            for key, value in d.items():
                key_path = f"{prefix}.{key}" if prefix else key
                
                if regex.search(key_path):
                    matching_keys.append(key_path)
                
                if isinstance(value, dict):
                    search_dict(value, key_path)
        
        # Search in the main data
        search_dict(self.data)
        
        # Include added keys
        for key in self.changes["added"]:
            if regex.search(key) and key not in matching_keys:
                matching_keys.append(key)
        
        # Exclude deleted keys
        matching_keys = [k for k in matching_keys if k not in self.changes["deleted"]]
        
        return sorted(matching_keys)
    
    def search_values(self, pattern: str) -> List[Tuple[str, str]]:
        """Search for values containing a pattern."""
        regex = re.compile(pattern, re.IGNORECASE)
        matching = []
        
        def search_dict(d: Dict, prefix: str = ""):
            for key, value in d.items():
                key_path = f"{prefix}.{key}" if prefix else key
                
                if isinstance(value, str) and regex.search(value):
                    # Check if modified or deleted
                    if key_path not in self.changes["deleted"]:
                        if key_path in self.changes["modified"]:
                            value = self.changes["modified"][key_path]
                        matching.append((key_path, value))
                elif isinstance(value, dict):
                    search_dict(value, key_path)
        
        # Search in the main data
        search_dict(self.data)
        
        # Include added keys
        for key, value in self.changes["added"].items():
            if isinstance(value, str) and regex.search(value):
                matching.append((key, value))
        
        return sorted(matching)
    
    def list_namespace(self, namespace: str) -> List[str]:
        """List all keys in a namespace."""
        keys = []
        
        def collect_keys(d: Dict, prefix: str = ""):
            for key, value in d.items():
                key_path = f"{prefix}.{key}" if prefix else key
                
                if key_path.startswith(namespace):
                    keys.append(key_path)
                
                if isinstance(value, dict) and key_path.startswith(namespace.split('.')[0]):
                    collect_keys(value, key_path)
        
        # Collect from main data
        collect_keys(self.data)
        
        # Include added keys
        for key in self.changes["added"]:
            if key.startswith(namespace) and key not in keys:
                keys.append(key)
        
        # Exclude deleted keys
        keys = [k for k in keys if k not in self.changes["deleted"]]
        
        return sorted(keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the language file."""
        total_keys = 0
        namespaces = set()
        
        def count_keys(d: Dict, prefix: str = ""):
            nonlocal total_keys
            for key, value in d.items():
                key_path = f"{prefix}.{key}" if prefix else key
                
                if key_path not in self.changes["deleted"]:
                    total_keys += 1
                    parts = key_path.split('.')
                    for i in range(1, len(parts)):
                        namespaces.add('.'.join(parts[:i]))
                
                if isinstance(value, dict):
                    count_keys(value, key_path)
        
        count_keys(self.data)
        
        # Add new keys
        for key in self.changes["added"]:
            if key not in self.data:
                total_keys += 1
                parts = key.split('.')
                for i in range(1, len(parts)):
                    namespaces.add('.'.join(parts[:i]))
        
        return {
            "total_keys": total_keys,
            "namespaces": len(namespaces),
            "pending_changes": {
                "added": len(self.changes["added"]),
                "modified": len(self.changes["modified"]),
                "deleted": len(self.changes["deleted"])
            }
        }
    
    def apply_changes(self) -> bool:
        """Apply all pending changes to the data."""
        # Apply deletions
        for key_path in self.changes["deleted"]:
            self._delete_nested_key(self.data, key_path)
        
        # Apply modifications and additions
        for key_path, value in {**self.changes["modified"], **self.changes["added"]}.items():
            self._set_nested_value(self.data, key_path, value)
        
        return True
    
    def export(self, output_file: str = None) -> bool:
        """Export the current state to a JSON file."""
        # Apply changes to a copy of the data
        export_data = json.loads(json.dumps(self.data))  # Deep copy
        
        # Apply deletions
        for key_path in self.changes["deleted"]:
            self._delete_nested_key(export_data, key_path)
        
        # Apply modifications and additions
        for key_path, value in {**self.changes["modified"], **self.changes["added"]}.items():
            self._set_nested_value(export_data, key_path, value)
        
        # Save to file
        output_path = Path(output_file) if output_file else self.json_file
        
        if self._save_json(export_data, output_path):
            # Clear changes if saved to the original file
            if output_path == self.json_file:
                self.changes = {"added": {}, "modified": {}, "deleted": set()}
                self.data = export_data
            print(f"Successfully exported to {output_path}")
            return True
        
        return False
    
    def show_changes(self) -> None:
        """Display pending changes."""
        if not any([self.changes["added"], self.changes["modified"], self.changes["deleted"]]):
            print("No pending changes")
            return
        
        print("\nPending changes:")
        
        if self.changes["added"]:
            print(f"\nAdded ({len(self.changes['added'])} keys):")
            for key, value in sorted(self.changes["added"].items())[:10]:
                value_preview = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                print(f"  + {key}: {value_preview}")
            if len(self.changes["added"]) > 10:
                print(f"  ... and {len(self.changes['added']) - 10} more")
        
        if self.changes["modified"]:
            print(f"\nModified ({len(self.changes['modified'])} keys):")
            for key, value in sorted(self.changes["modified"].items())[:10]:
                value_preview = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                print(f"  ~ {key}: {value_preview}")
            if len(self.changes["modified"]) > 10:
                print(f"  ... and {len(self.changes['modified']) - 10} more")
        
        if self.changes["deleted"]:
            print(f"\nDeleted ({len(self.changes['deleted'])} keys):")
            for key in sorted(self.changes["deleted"])[:10]:
                print(f"  - {key}")
            if len(self.changes["deleted"]) > 10:
                print(f"  ... and {len(self.changes['deleted']) - 10} more")


def main():
    """CLI interface for the language manager."""
    parser = argparse.ArgumentParser(description="Language Manager - Work with translation JSON files")
    parser.add_argument("--file", help="Path to JSON file (default: ../en.json)")
    parser.add_argument("--index", help="Path to index file (default: ./lang_index.json)")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Get command
    get_parser = subparsers.add_parser("get", help="Get a key value")
    get_parser.add_argument("key", help="Key path (dot notation)")
    
    # Set command
    set_parser = subparsers.add_parser("set", help="Set a key value")
    set_parser.add_argument("key", help="Key path (dot notation)")
    set_parser.add_argument("value", help="Value to set")
    
    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a key")
    delete_parser.add_argument("key", help="Key path (dot notation)")
    
    # Search commands
    search_parser = subparsers.add_parser("search", help="Search for keys")
    search_parser.add_argument("pattern", help="Regex pattern to search")
    search_parser.add_argument("--values", action="store_true", help="Search in values instead of keys")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List keys in a namespace")
    list_parser.add_argument("namespace", help="Namespace to list")
    
    # Stats command
    subparsers.add_parser("stats", help="Show statistics")
    
    # Changes command
    subparsers.add_parser("changes", help="Show pending changes")
    
    # Export command
    export_parser = subparsers.add_parser("export", help="Export to JSON file")
    export_parser.add_argument("--output", help="Output file path")
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize manager
    manager = LanguageManager(args.file, args.index)
    
    # Execute command
    if args.command == "get":
        value = manager.get_key(args.key)
        if value is not None:
            if isinstance(value, dict):
                print(json.dumps(value, indent=2, ensure_ascii=False))
            else:
                print(value)
        else:
            print(f"Key not found: {args.key}")
    
    elif args.command == "set":
        if manager.set_key(args.key, args.value):
            print(f"Set {args.key} = {args.value}")
            print("\nDon't forget to export changes!")
        else:
            print(f"Failed to set {args.key}")
    
    elif args.command == "delete":
        if manager.delete_key(args.key):
            print(f"Deleted {args.key}")
            print("\nDon't forget to export changes!")
        else:
            print(f"Key not found: {args.key}")
    
    elif args.command == "search":
        if args.values:
            results = manager.search_values(args.pattern)
            for key, value in results[:20]:
                value_preview = value[:60] + "..." if len(value) > 60 else value
                print(f"{key}: {value_preview}")
            if len(results) > 20:
                print(f"\n... and {len(results) - 20} more results")
        else:
            results = manager.search_keys(args.pattern)
            for key in results[:50]:
                print(key)
            if len(results) > 50:
                print(f"\n... and {len(results) - 50} more results")
    
    elif args.command == "list":
        keys = manager.list_namespace(args.namespace)
        for key in keys[:50]:
            print(key)
        if len(keys) > 50:
            print(f"\n... and {len(keys) - 50} more keys")
    
    elif args.command == "stats":
        stats = manager.get_stats()
        print(f"Total keys: {stats['total_keys']}")
        print(f"Namespaces: {stats['namespaces']}")
        print(f"\nPending changes:")
        print(f"  Added: {stats['pending_changes']['added']}")
        print(f"  Modified: {stats['pending_changes']['modified']}")
        print(f"  Deleted: {stats['pending_changes']['deleted']}")
    
    elif args.command == "changes":
        manager.show_changes()
    
    elif args.command == "export":
        if manager.export(args.output):
            print("Export successful")
        else:
            print("Export failed")


if __name__ == "__main__":
    main()
