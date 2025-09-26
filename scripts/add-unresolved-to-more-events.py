#!/usr/bin/env python3

import json
import os
from pathlib import Path

# Get the script directory
script_dir = Path(__file__).parent
data_dir = script_dir.parent / 'data' / 'events'

# Define ifUnresolved behavior for additional events that should persist
events_to_update = {
    'assassination-attempt': {
        'name': 'Assassination Plot Active',
        'description': 'The assassination attempt failed, but the conspirators remain at large and plotting',
        'duration': 'until-resolved',
        'severity': 'critical',
        'icon': 'fas fa-crosshairs',
        'priority': 75,
        'effects': {
            'unrest': 2,
            'fame': -1
        },
        'skills': ['intimidation', 'society', 'diplomacy'],
        'dc': 18,
        'escalation_turns': 2,
        'escalated_name': 'Multiple Assassination Plots',
        'escalated_effects': {
            'unrest': 3,
            'fame': -2,
            'gold': -2
        }
    },
    'local-disaster': {
        'name': 'Disaster Recovery Needed',
        'description': 'The local disaster has left lasting damage that continues to hamper the kingdom',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-house-damage',
        'priority': 90,
        'effects': {
            'gold': -2,
            'resources': -1
        },
        'skills': ['crafting', 'society', 'athletics'],
        'dc': 15,
        'escalation_turns': 3,
        'escalated_name': 'Infrastructure Collapse',
        'escalated_effects': {
            'gold': -3,
            'resources': -2,
            'unrest': 1
        }
    },
    'natural-disaster': {
        'name': 'Natural Disaster Aftermath',
        'description': 'The natural disaster has left widespread devastation requiring ongoing recovery efforts',
        'duration': 'until-resolved',
        'severity': 'critical',
        'icon': 'fas fa-tornado',
        'priority': 70,
        'effects': {
            'gold': -3,
            'food': -2,
            'resources': -2
        },
        'skills': ['survival', 'crafting', 'diplomacy'],
        'dc': 19,
        'escalation_turns': 2,
        'escalated_name': 'Total Devastation',
        'escalated_effects': {
            'gold': -4,
            'food': -3,
            'resources': -3,
            'unrest': 2
        }
    },
    'demand-expansion': {
        'name': 'Expansion Pressure',
        'description': 'Citizens continue demanding territorial expansion, growing increasingly frustrated',
        'duration': 'until-resolved',
        'severity': 'neutral',
        'icon': 'fas fa-expand-arrows-alt',
        'priority': 130,
        'effects': {
            'unrest': 1
        },
        'skills': ['diplomacy', 'deception', 'society'],
        'dc': 13,
        'escalation_turns': 5,
        'escalated_name': 'Expansion Riots',
        'escalated_effects': {
            'unrest': 2,
            'fame': -1
        }
    },
    'demand-structure': {
        'name': 'Construction Demands',
        'description': 'Citizens continue demanding specific structures be built, growing impatient',
        'duration': 'until-resolved',
        'severity': 'neutral',
        'icon': 'fas fa-building',
        'priority': 135,
        'effects': {
            'unrest': 1
        },
        'skills': ['diplomacy', 'crafting', 'society'],
        'dc': 12,
        'escalation_turns': 4,
        'escalated_name': 'Construction Protests',
        'escalated_effects': {
            'unrest': 2
        }
    },
    'diplomatic-overture': {
        'name': 'Diplomatic Tension',
        'description': 'The failed diplomatic overture has strained relations with neighboring kingdoms',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-handshake-slash',
        'priority': 100,
        'effects': {
            'fame': -1,
            'gold': -1
        },
        'skills': ['diplomacy', 'deception', 'society'],
        'dc': 14,
        'escalation_turns': 4,
        'escalated_name': 'Diplomatic Crisis',
        'escalated_effects': {
            'fame': -2,
            'gold': -2,
            'luxuries': -1
        }
    },
    'festive-invitation': {
        'name': 'Snubbed Nobility',
        'description': 'Your absence from the festivities has offended the nobility who continue to undermine you',
        'duration': 'until-resolved',
        'severity': 'neutral',
        'icon': 'fas fa-mask',
        'priority': 140,
        'effects': {
            'fame': -1
        },
        'skills': ['diplomacy', 'society', 'performance'],
        'dc': 11,
        'escalation_turns': 5,
        'escalated_name': 'Noble Boycott',
        'escalated_effects': {
            'fame': -2,
            'gold': -1
        }
    },
    'immigration': {
        'name': 'Immigration Crisis',
        'description': 'The poorly managed immigration has created ongoing integration problems',
        'duration': 'until-resolved',
        'severity': 'neutral',
        'icon': 'fas fa-users',
        'priority': 125,
        'effects': {
            'unrest': 1,
            'food': -1
        },
        'skills': ['diplomacy', 'society', 'intimidation'],
        'dc': 13,
        'escalation_turns': 4,
        'escalated_name': 'Ethnic Tensions',
        'escalated_effects': {
            'unrest': 2,
            'food': -1,
            'gold': -1
        }
    },
    'pilgrimage': {
        'name': 'Religious Unrest',
        'description': 'The disrupted pilgrimage has angered the faithful who grow increasingly discontent',
        'duration': 'until-resolved',
        'severity': 'neutral',
        'icon': 'fas fa-praying-hands',
        'priority': 120,
        'effects': {
            'unrest': 1,
            'fame': -1
        },
        'skills': ['religion', 'diplomacy', 'society'],
        'dc': 13,
        'escalation_turns': 4,
        'escalated_name': 'Religious Protests',
        'escalated_effects': {
            'unrest': 2,
            'fame': -1,
            'gold': -1
        }
    },
    'land-rush': {
        'name': 'Land Dispute Chaos',
        'description': 'The uncontrolled land rush has created ongoing territorial disputes',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-map-marked',
        'priority': 105,
        'effects': {
            'unrest': 1,
            'resources': -1
        },
        'skills': ['diplomacy', 'intimidation', 'society'],
        'dc': 14,
        'escalation_turns': 3,
        'escalated_name': 'Territorial Violence',
        'escalated_effects': {
            'unrest': 2,
            'resources': -2,
            'gold': -1
        }
    },
    'trade-agreement': {
        'name': 'Trade Disruption',
        'description': 'The failed trade agreement has disrupted commerce and angered merchants',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-balance-scale',
        'priority': 95,
        'effects': {
            'gold': -2,
            'luxuries': -1
        },
        'skills': ['diplomacy', 'society', 'deception'],
        'dc': 15,
        'escalation_turns': 3,
        'escalated_name': 'Trade War',
        'escalated_effects': {
            'gold': -3,
            'luxuries': -2,
            'resources': -1
        }
    },
    'monster-attack': {
        'name': 'Monster Lair Nearby',
        'description': 'The monster has established a lair nearby and continues to threaten your settlements',
        'duration': 'until-resolved',
        'severity': 'critical',
        'icon': 'fas fa-dragon',
        'priority': 85,
        'effects': {
            'unrest': 1,
            'food': -1,
            'gold': -1
        },
        'skills': ['nature', 'intimidation', 'arcana'],
        'dc': 18,
        'escalation_turns': 2,
        'escalated_name': 'Monster Breeding Ground',
        'escalated_effects': {
            'unrest': 2,
            'food': -2,
            'gold': -2,
            'resources': -1
        }
    },
    'raiders': {
        'name': 'Ongoing Raids',
        'description': 'Raiders continue to pillage your borderlands, stealing resources and terrorizing citizens',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-horse',
        'priority': 95,
        'effects': {
            'gold': -2,
            'food': -1,
            'unrest': 1
        },
        'skills': ['intimidation', 'diplomacy', 'warfare'],
        'dc': 16,
        'escalation_turns': 3,
        'escalated_name': 'Raider Stronghold',
        'escalated_effects': {
            'gold': -3,
            'food': -2,
            'unrest': 2,
            'luxuries': -1
        }
    },
    'undead-uprising': {
        'name': 'Undead Plague',
        'description': 'The undead continue to rise from graveyards and battlefields, threatening the living',
        'duration': 'until-resolved',
        'severity': 'critical',
        'icon': 'fas fa-skull-crossbones',
        'priority': 80,
        'effects': {
            'unrest': 2,
            'food': -1,
            'fame': -1
        },
        'skills': ['religion', 'arcana', 'intimidation'],
        'dc': 17,
        'escalation_turns': 2,
        'escalated_name': 'Necropolis Rising',
        'escalated_effects': {
            'unrest': 3,
            'food': -2,
            'fame': -2,
            'gold': -2
        }
    },
    'drug-den': {
        'name': 'Drug Trade Expanding',
        'description': 'The drug trade continues to corrupt your citizens and undermine social order',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-pills',
        'priority': 105,
        'effects': {
            'unrest': 1,
            'gold': -1
        },
        'skills': ['intimidation', 'deception', 'society'],
        'dc': 15,
        'escalation_turns': 4,
        'escalated_name': 'Drug Cartel Control',
        'escalated_effects': {
            'unrest': 2,
            'gold': -3
        }
    },
    'inquisition': {
        'name': 'Ongoing Persecution',
        'description': 'Religious zealots continue their persecution, creating fear and division',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-fire',
        'priority': 100,
        'effects': {
            'unrest': 2,
            'fame': -1
        },
        'skills': ['diplomacy', 'religion', 'intimidation'],
        'dc': 16,
        'escalation_turns': 3,
        'escalated_name': 'Religious Purges',
        'escalated_effects': {
            'unrest': 3,
            'fame': -2,
            'gold': -2
        }
    },
    'public-scandal': {
        'name': 'Lingering Scandal',
        'description': 'The scandal continues to damage your kingdom\'s reputation and authority',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-newspaper',
        'priority': 120,
        'effects': {
            'unrest': 1,
            'fame': -1
        },
        'skills': ['diplomacy', 'deception', 'society'],
        'dc': 14,
        'escalation_turns': 4,
        'escalated_name': 'Government Crisis',
        'escalated_effects': {
            'unrest': 2,
            'fame': -2,
            'gold': -1
        }
    },
    'notorious-heist': {
        'name': 'Crime Spree',
        'description': 'The successful heist has emboldened criminals who continue their crime spree',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-user-secret',
        'priority': 110,
        'effects': {
            'gold': -2,
            'unrest': 1
        },
        'skills': ['intimidation', 'society', 'stealth'],
        'dc': 15,
        'escalation_turns': 3,
        'escalated_name': 'Crime Syndicate',
        'escalated_effects': {
            'gold': -3,
            'unrest': 2,
            'luxuries': -1
        }
    },
    'sensational-crime': {
        'name': 'Criminal at Large',
        'description': 'The criminal remains free, committing more crimes and mocking authority',
        'duration': 'until-resolved',
        'severity': 'dangerous',
        'icon': 'fas fa-user-ninja',
        'priority': 115,
        'effects': {
            'unrest': 1,
            'fame': -1
        },
        'skills': ['intimidation', 'society', 'diplomacy'],
        'dc': 14,
        'escalation_turns': 3,
        'escalated_name': 'Crime Wave',
        'escalated_effects': {
            'unrest': 2,
            'fame': -1,
            'gold': -2
        }
    }
}

def create_if_unresolved(event_id, config):
    """Create the ifUnresolved structure for an event"""
    return {
        "type": "continuous",
        "continuous": {
            "becomesModifier": True,
            "modifierTemplate": {
                "name": config['name'],
                "description": config['description'],
                "duration": config['duration'],
                "severity": config['severity'],
                "icon": config.get('icon', 'fas fa-exclamation-triangle'),
                "priority": config.get('priority', 100),
                "effects": config['effects'],
                "resolution": {
                    "skills": config['skills'],
                    "dc": config['dc'],
                    "onResolution": {
                        "successMsg": f"The {config['name'].lower()} situation has been resolved!",
                        "failureMsg": f"Failed to resolve the {config['name'].lower()} situation"
                    }
                },
                "escalation": {
                    "turnsUntilEscalation": config['escalation_turns'],
                    "escalatedModifier": {
                        "name": config['escalated_name'],
                        "description": f"The situation has escalated dramatically",
                        "severity": "critical",
                        "effects": config['escalated_effects'],
                        "resolution": {
                            "dc": config['dc'] + 3
                        }
                    }
                } if 'escalation_turns' in config else None
            }
        }
    }

def update_event_file(event_id, config):
    """Update an event file with ifUnresolved behavior"""
    file_path = data_dir / f'{event_id}.json'
    
    if not file_path.exists():
        print(f"  ⚠️  File not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'r') as f:
            event = json.load(f)
        
        # Add ifUnresolved field
        event['ifUnresolved'] = create_if_unresolved(event_id, config)
        
        # Write back
        with open(file_path, 'w') as f:
            json.dump(event, f, indent=2)
        
        print(f"  ✓ Updated: {event_id}.json")
        return True
    except Exception as e:
        print(f"  ✗ Error updating {event_id}.json: {e}")
        return False

def main():
    print("============================================================")
    print("ADDING IFUNRESOLVED TO ADDITIONAL EVENTS")
    print("============================================================\n")
    
    success_count = 0
    for event_id, config in events_to_update.items():
        if update_event_file(event_id, config):
            success_count += 1
    
    print(f"\n✅ Successfully updated {success_count}/{len(events_to_update)} events")
    
    print("\nNow run 'npm run build' to rebuild the combined events.json file.")

if __name__ == '__main__':
    main()
