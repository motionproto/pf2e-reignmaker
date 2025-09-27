#!/usr/bin/env python3
"""
Consolidate structures based on the Reignmaker Lite rules.
Groups structures by their category and tier progression.
"""

import json
import shutil
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

# Define the proper structure families from the rules
SKILL_BASED_STRUCTURES = {
    'crime-intrigue': {
        'name': 'Crime & Intrigue',
        'skills': ['Thievery', 'Deception', 'Stealth'],
        'tiers': {
            1: 'rats-warren',
            2: 'smugglers-den', 
            3: 'thieves-guild',
            4: 'shadow-network'
        }
    },
    'civic-governance': {
        'name': 'Civic & Governance',
        'skills': ['Society', 'Diplomacy', 'Deception'],
        'tiers': {
            1: 'town-hall',
            2: 'city-hall',
            3: 'diplomatic-quarter',
            4: 'grand-forum'
        }
    },
    'military-training': {
        'name': 'Military & Training',
        'skills': ['Athletics', 'Acrobatics', 'Intimidation'],
        'tiers': {
            1: 'gymnasium',
            2: 'training-yard',
            3: 'warriors-hall',
            4: 'military-academy'
        }
    },
    'crafting-trade': {
        'name': 'Crafting & Trade',
        'skills': ['Crafting', 'Lore', 'Society'],
        'tiers': {
            1: 'workshop',
            2: 'artisans-hall',
            3: 'blacksmiths-guild',
            4: 'masterworks-foundry'
        }
    },
    'knowledge-magic': {
        'name': 'Knowledge & Magic',
        'skills': ['Lore', 'Arcana', 'Occultism'],
        'tiers': {
            1: 'scholars-table',
            2: 'library',
            3: 'university',
            4: 'arcane-academy'
        }
    },
    'faith-nature': {
        'name': 'Faith & Nature',
        'skills': ['Religion', 'Medicine', 'Nature'],
        'tiers': {
            1: 'shrine',
            2: 'temple',
            3: 'temple-district',
            4: 'grand-basilica'
        }
    },
    'medicine-healing': {
        'name': 'Medicine & Healing',
        'skills': ['Medicine', 'Lore', 'Arcana'],
        'tiers': {
            1: 'healers-hut',
            2: 'infirmary',
            3: 'hospital',
            4: 'medical-college'
        }
    },
    'performance-culture': {
        'name': 'Performance & Culture',
        'skills': ['Performance', 'Diplomacy', 'Lore'],
        'tiers': {
            1: 'buskers-alley',
            2: 'famous-tavern',
            3: 'performance-hall',
            4: 'grand-amphitheater'
        }
    },
    'exploration-wilderness': {
        'name': 'Exploration & Wilderness',
        'skills': ['Survival', 'Nature', 'Stealth'],
        'tiers': {
            1: 'hunters-lodge',
            2: 'rangers-outpost',
            3: 'druids-grove',
            4: 'wildskeepers-enclave'
        }
    }
}

SUPPORT_STRUCTURES = {
    'food-storage': {
        'name': 'Food Storage',
        'description': 'Preserve agricultural surplus',
        'tiers': {
            1: 'granary',
            2: 'storehouses',
            3: 'warehouses',
            4: 'strategic-reserves'
        }
    },
    'fortifications': {
        'name': 'Fortifications',
        'description': 'Defensive walls and battlements',
        'tiers': {
            1: 'wooden-palisade',
            2: 'stone-walls',
            3: 'fortified-walls',
            4: 'grand-battlements'
        }
    },
    'logistics': {
        'name': 'Logistics',
        'description': 'Military housing and support',
        'tiers': {
            1: 'barracks',
            2: 'garrison',
            3: 'fortress',
            4: 'citadel'
        }
    },
    'commerce': {
        'name': 'Commerce',
        'description': 'Trade and resource conversion',
        'tiers': {
            1: 'market-square',
            2: 'bazaar',
            3: 'merchant-guild',
            4: 'imperial-bank'
        }
    },
    'culture': {
        'name': 'Culture',
        'description': 'Morale and unrest management',
        'tiers': {
            1: 'open-stage',
            2: 'amphitheater',
            3: 'playhouse',
            4: 'auditorium'
        }
    },
    'revenue': {
        'name': 'Revenue',
        'description': 'Tax collection and treasury',
        'tiers': {
            1: 'tax-office',
            2: 'counting-house',
            3: 'treasury',
            4: 'exchequer'
        }
    },
    'justice': {
        'name': 'Justice',
        'description': 'Law enforcement and prisoner management',
        'tiers': {
            1: 'stocks',
            2: 'jail',
            3: 'prison',
            4: 'donjon'
        }
    },
    'diplomacy': {
        'name': 'Diplomacy',
        'description': 'International relations and alliances',
        'tiers': {
            1: 'envoys-office',
            2: 'embassy',
            3: 'grand-embassy',
            4: 'diplomatic-quarter-support'  # Note: this is the support version
        }
    }
}

def load_structure(filepath: Path) -> Dict:
    """Load a single structure JSON file."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading {filepath}: {e}")
        return None

def find_structure_file(structures_dir: Path, structure_id: str) -> Path:
    """Find a structure file by its ID."""
    json_file = structures_dir / f"{structure_id}.json"
    if json_file.exists():
        return json_file
    return None

def create_consolidated_structure(family_data: Dict, structures: List[Dict], structure_type: str) -> Dict:
    """Create a consolidated structure file."""
    consolidated = {
        'type': structure_type,
        'family': family_data['name'],
        'description': family_data.get('description', f"Tier progression for {family_data['name']}"),
        'tiers': []
    }
    
    # Add skills for skill-based structures
    if structure_type == 'skill':
        consolidated['skills'] = family_data['skills']
    
    # Sort structures by tier and add them
    structures.sort(key=lambda x: x.get('tier', 0))
    for structure in structures:
        consolidated['tiers'].append(structure)
    
    return consolidated

def migrate_structures(backup: bool = True):
    """Migrate structure JSON files to consolidated format based on rules."""
    structures_dir = Path('data/structures')
    
    # Create backup if requested
    if backup:
        backup_dir = Path('data/structures-backup')
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        shutil.copytree(structures_dir, backup_dir, 
                       ignore=shutil.ignore_patterns('*.py'))
        print(f"Created backup in {backup_dir}")
        print()
    
    # Process skill-based structures
    print("Processing Skill-Based Structures:")
    print("=" * 50)
    
    files_to_remove = []
    files_created = []
    
    for category_key, family_data in SKILL_BASED_STRUCTURES.items():
        structures = []
        missing = []
        
        for tier, structure_id in family_data['tiers'].items():
            filepath = find_structure_file(structures_dir, structure_id)
            if filepath:
                structure_data = load_structure(filepath)
                if structure_data:
                    # Ensure correct type and category
                    structure_data['type'] = 'skill'
                    structure_data['category'] = category_key
                    structure_data['tier'] = tier
                    structures.append(structure_data)
                    files_to_remove.append(filepath)
                else:
                    missing.append(f"Tier {tier}: {structure_id}")
            else:
                missing.append(f"Tier {tier}: {structure_id}")
        
        if structures:
            # Create consolidated file
            output_file = structures_dir / f"skill-{category_key}.json"
            consolidated = create_consolidated_structure(family_data, structures, 'skill')
            
            with open(output_file, 'w') as f:
                json.dump(consolidated, f, indent=2)
            
            files_created.append(output_file)
            print(f"✓ {family_data['name']} ({category_key})")
            print(f"  → {output_file.name}")
            print(f"  Tiers: {', '.join(str(s.get('tier', 0)) for s in structures)}")
            if missing:
                print(f"  Missing: {', '.join(missing)}")
            print()
    
    # Process support structures
    print("\nProcessing Support Structures:")
    print("=" * 50)
    
    for category_key, family_data in SUPPORT_STRUCTURES.items():
        structures = []
        missing = []
        
        for tier, structure_id in family_data['tiers'].items():
            filepath = find_structure_file(structures_dir, structure_id)
            if filepath:
                structure_data = load_structure(filepath)
                if structure_data:
                    # Ensure correct type and category
                    structure_data['type'] = 'support'
                    structure_data['category'] = category_key
                    structure_data['tier'] = tier
                    structures.append(structure_data)
                    files_to_remove.append(filepath)
                else:
                    missing.append(f"Tier {tier}: {structure_id}")
            else:
                missing.append(f"Tier {tier}: {structure_id}")
        
        if structures:
            # Create consolidated file
            output_file = structures_dir / f"support-{category_key}.json"
            consolidated = create_consolidated_structure(family_data, structures, 'support')
            
            with open(output_file, 'w') as f:
                json.dump(consolidated, f, indent=2)
            
            files_created.append(output_file)
            print(f"✓ {family_data['name']} ({category_key})")
            print(f"  → {output_file.name}")
            print(f"  Tiers: {', '.join(str(s.get('tier', 0)) for s in structures)}")
            if missing:
                print(f"  Missing: {', '.join(missing)}")
            print()
    
    # Remove old individual files (but keep Python scripts)
    print("\nRemoving old individual structure files...")
    print("=" * 50)
    
    removed_count = 0
    for filepath in set(files_to_remove):  # Use set to avoid duplicates
        if filepath.exists():
            filepath.unlink()
            removed_count += 1
            print(f"  Removed: {filepath.name}")
    
    # Report summary
    print()
    print("=" * 50)
    print("Migration Summary:")
    print(f"- Created {len(files_created)} consolidated files")
    print(f"  - {len(SKILL_BASED_STRUCTURES)} skill-based structure families")
    print(f"  - {len(SUPPORT_STRUCTURES)} support structure families")
    print(f"- Removed {removed_count} individual structure files")
    print(f"- Preserved Python utility scripts")
    
    if backup:
        print(f"\nBackup saved to data/structures-backup/")
        print("To restore: rm -rf data/structures && mv data/structures-backup data/structures")
    
    # List any remaining JSON files (shouldn't be any if all mapped correctly)
    remaining = list(structures_dir.glob('*.json'))
    remaining = [f for f in remaining if f not in files_created]
    if remaining:
        print(f"\nWarning: {len(remaining)} JSON files were not consolidated:")
        for f in remaining[:10]:  # Show first 10
            print(f"  - {f.name}")
        if len(remaining) > 10:
            print(f"  ... and {len(remaining) - 10} more")

def validate_structures():
    """Validate that all expected structures exist."""
    structures_dir = Path('data/structures')
    
    print("Validating Structure Files:")
    print("=" * 50)
    
    all_good = True
    
    # Check skill-based structures
    print("\nSkill-Based Structures:")
    for category_key, family_data in SKILL_BASED_STRUCTURES.items():
        missing = []
        for tier, structure_id in family_data['tiers'].items():
            filepath = find_structure_file(structures_dir, structure_id)
            if not filepath:
                missing.append(f"Tier {tier}: {structure_id}")
                all_good = False
        
        if missing:
            print(f"✗ {family_data['name']}: Missing {', '.join(missing)}")
        else:
            print(f"✓ {family_data['name']}: All tiers present")
    
    # Check support structures
    print("\nSupport Structures:")
    for category_key, family_data in SUPPORT_STRUCTURES.items():
        missing = []
        for tier, structure_id in family_data['tiers'].items():
            filepath = find_structure_file(structures_dir, structure_id)
            if not filepath:
                missing.append(f"Tier {tier}: {structure_id}")
                all_good = False
        
        if missing:
            print(f"✗ {family_data['name']}: Missing {', '.join(missing)}")
        else:
            print(f"✓ {family_data['name']}: All tiers present")
    
    return all_good

def main():
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--validate':
            if validate_structures():
                print("\n✅ All expected structures are present!")
                return
            else:
                print("\n⚠️ Some structures are missing. Migration may be incomplete.")
                return
        elif sys.argv[1] == '--help':
            print("Usage:")
            print("  python3 consolidate-structures-by-rules.py         # Run migration")
            print("  python3 consolidate-structures-by-rules.py --validate  # Validate structure files")
            return
    
    print("Starting structure consolidation based on Reignmaker Lite rules...")
    print("=" * 50)
    print()
    
    migrate_structures(backup=True)

if __name__ == '__main__':
    main()
