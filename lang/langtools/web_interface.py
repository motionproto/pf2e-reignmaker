#!/usr/bin/env python3
"""
Web interface for the Language Manager
Provides a hierarchical browser for the translation JSON file
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
from pathlib import Path
from lang_manager import LanguageManager
import os

app = Flask(__name__)
CORS(app)

# Initialize the language manager
manager = LanguageManager()

@app.route('/')
def index():
    """Serve the main HTML interface"""
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_data():
    """Get the full JSON data for display"""
    try:
        # For the tree view, we need the full data
        return jsonify(manager.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save', methods=['POST'])
def save_data():
    """Save the modified JSON data"""
    try:
        new_data = request.json
        
        # Save to a temporary file first
        temp_file = Path(__file__).parent.parent / "en_edited.json"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, indent=2, ensure_ascii=False)
        
        return jsonify({"success": True, "message": f"Saved to {temp_file}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export_data():
    """Export the data back to the original file"""
    try:
        new_data = request.json
        
        # Update the manager's data
        manager.data = new_data
        
        # Save to the original file
        manager.export()
        
        return jsonify({"success": True, "message": "Data exported successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete', methods=['POST'])
def delete_keys():
    """Delete specified keys or branches from the data"""
    try:
        keys_to_delete = request.json.get('keys', [])
        
        deleted_count = 0
        for key_path in keys_to_delete:
            parts = key_path.split('.')
            
            # Navigate to parent
            current = manager.data
            parent = None
            last_key = parts[-1]
            
            for part in parts[:-1]:
                parent = current
                if part in current:
                    current = current[part]
                else:
                    break
            else:
                # Delete the key if it exists
                if last_key in current:
                    del current[last_key]
                    deleted_count += 1
        
        return jsonify({
            "success": True, 
            "message": f"Deleted {deleted_count} keys/branches",
            "deleted_count": deleted_count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search():
    """Search for keys or values"""
    try:
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'keys')
        
        if search_type == 'keys':
            results = manager.search_keys(query)
            return jsonify({"results": results})
        else:
            results = manager.search_values(query)
            # Convert to dict for JSON serialization
            results_dict = [{"key": k, "value": v} for k, v in results]
            return jsonify({"results": results_dict})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about the language file"""
    try:
        stats = manager.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    templates_dir = Path(__file__).parent / "templates"
    templates_dir.mkdir(exist_ok=True)
    
    print("Starting Language Manager Web Interface...")
    print("Open http://localhost:8080 in your browser")
    app.run(debug=True, port=8080)
