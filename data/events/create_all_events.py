#!/usr/bin/env python3
"""
Generate all Kingdom Events JSON files and translation commands
Based on Kingdom_Events.md specification
"""

import json
import os
import sys

def create_modifier(event_id, stage, outcome, mod_type, value, selector=None, turns=None, choice=None):
    """Create a modifier object"""
    modifier = {
        "type": "untyped",
        "name": f"pf2e-kingdom-lite.events.{event_id}.stage-{stage}.{outcome}.{mod_type}",
        "value": value,
        "selector": selector or mod_type,
        "enabled": True
    }
    
    if turns is not None:
        modifier["turns"] = turns
    
    if choice:
        modifier["choice"] = choice
    
    return modifier

def create_event_json(event_id, name, description, traits, location, resolution, skills, outcomes, resolvedOn=None, special=None):
    """Create event JSON structure matching the exact format"""
    
    # Build stages
    stages = [{
        "skills": skills,
        "criticalSuccess": {
            "msg": f"pf2e-kingdom-lite.events.{event_id}.stage-0.criticalSuccess.msg",
            "modifiers": []
        },
        "success": {
            "msg": f"pf2e-kingdom-lite.events.{event_id}.stage-0.success.msg",
            "modifiers": []
        },
        "failure": {
            "msg": f"pf2e-kingdom-lite.events.{event_id}.stage-0.failure.msg",
            "modifiers": []
        },
        "criticalFailure": {
            "msg": f"pf2e-kingdom-lite.events.{event_id}.stage-0.criticalFailure.msg",
            "modifiers": []
        }
    }]
    
    # Add modifiers based on outcomes
    for outcome_type, outcome_data in outcomes.items():
        modifiers = stages[0][outcome_type]["modifiers"]
        
        for mod_type, value in outcome_data.items():
            if mod_type == "resource":
                # Special handling for resource choices
                modifiers.append(create_modifier(
                    event_id, 0, outcome_type, "resource",
                    value, selector="food", turns=1,
                    choice=["food", "ore", "stone", "lumber", "luxuries"]
                ))
            elif mod_type == "resources":
                # Multiple resources lost
                modifiers.append(create_modifier(
                    event_id, 0, outcome_type, "resources",
                    value, selector="resources", turns=1
                ))
            elif mod_type in ["gold", "food"]:
                # Resources that have turns
                modifiers.append(create_modifier(
                    event_id, 0, outcome_type, mod_type,
                    value, selector=mod_type, turns=1
                ))
            elif mod_type in ["unrest", "fame"]:
                # Permanent modifiers
                modifiers.append(create_modifier(
                    event_id, 0, outcome_type, mod_type,
                    value, selector=mod_type
                ))
            elif mod_type == "hex":
                # Hex gains
                modifiers.append(create_modifier(
                    event_id, 0, outcome_type, "hex",
                    value, selector="hex"
                ))
            elif mod_type == "damage_structure":
                # Structure damage
                modifiers.append({
                    "type": "event",
                    "name": f"pf2e-kingdom-lite.events.{event_id}.stage-0.{outcome_type}.damage",
                    "value": value,
                    "selector": "damage_structure",
                    "enabled": True
                })
            elif mod_type == "destroy_structure":
                # Structure destruction
                modifiers.append({
                    "type": "event",
                    "name": f"pf2e-kingdom-lite.events.{event_id}.stage-0.{outcome_type}.destroy",
                    "value": value,
                    "selector": "destroy_structure",
                    "enabled": True
                })
            elif mod_type == "imprisoned_unrest":
                # Convert unrest to imprisoned
                modifiers.append({
                    "type": "event",
                    "name": f"pf2e-kingdom-lite.events.{event_id}.stage-0.{outcome_type}.imprisoned",
                    "value": value,
                    "selector": "imprisoned_unrest",
                    "enabled": True
                })
    
    # Default resolution conditions
    if resolvedOn is None:
        if "continuous" in traits:
            # Continuous events usually resolve on critical success and success
            resolvedOn = ["criticalSuccess", "success"]
        else:
            # One-time events resolve on critical success and success
            resolvedOn = ["criticalSuccess", "success"]
    
    event = {
        "id": event_id,
        "name": f"pf2e-kingdom-lite.events.{event_id}.name",
        "description": f"pf2e-kingdom-lite.events.{event_id}.description",
        "traits": traits,
        "location": f"pf2e-kingdom-lite.events.{event_id}.location",
        "modifier": 0,
        "resolution": f"pf2e-kingdom-lite.events.{event_id}.resolution",
        "resolvedOn": resolvedOn,
        "stages": stages
    }
    
    if special:
        event["special"] = f"pf2e-kingdom-lite.events.{event_id}.special"
    
    return event

# Define all 39 events from Kingdom_Events.md
events_data = [
    {
        "id": "archaeological-find",
        "name": "Archaeological Find",
        "description": "Ancient ruins or artifacts are discovered in your territory.",
        "traits": ["beneficial"],
        "location": "Largest settlement",
        "resolution": "Society (historical research), Religion (divine significance), or Occultism (arcane investigation)",
        "skills": ["society", "religion", "occultism"],
        "outcomes": {
            "criticalSuccess": {"gold": 2, "unrest": -1, "fame": 1},
            "success": {"gold": 1},
            "failure": {"resource": 1},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Major discovery! The artifacts are of immense historical and monetary value.",
            "success": "Valuable find! The discovered artifacts benefit the kingdom's treasury.",
            "failure": "Minor artifacts found. You gain 1 Resource of your choice.",
            "criticalFailure": "Dangerous site! The excavation disturbs something that should have remained buried."
        },
        "special": "If you have Knowledge & Magic structures, gain an untyped bonus equal to the tier to the check."
    },
    {
        "id": "assassination-attempt",
        "name": "Assassination Attempt",
        "description": "Someone attempts to kill one of your leaders.",
        "traits": ["dangerous"],
        "location": "Random PC",
        "resolution": "Stealth (avoid the assassin), Intimidation (deter through fear), or Medicine (survive wounds)",
        "skills": ["stealth", "intimidation", "medicine"],
        "outcomes": {
            "criticalSuccess": {},
            "success": {},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Assassin captured! You gain valuable information about your enemies.",
            "success": "Attempt foiled! The assassin flees empty-handed.",
            "failure": "Leader escapes but the attempt shakes the kingdom's confidence.",
            "criticalFailure": "Leader wounded! They cannot take a Kingdom Action this turn."
        },
        "special": "If the target has a bodyguard or is in a fortified location, gain +2 to the check."
    },
    {
        "id": "bandit-activity",
        "name": "Bandit Activity",
        "description": "Bandits establish a camp and begin raiding travelers.",
        "traits": ["dangerous", "continuous"],
        "location": "Random border hex",
        "resolution": "Intimidation (crush them with force), Diplomacy (negotiate their surrender), or Stealth (infiltrate and dismantle)",
        "skills": ["intimidation", "diplomacy", "stealth"],
        "outcomes": {
            "criticalSuccess": {"gold": 1},
            "success": {},
            "failure": {"resources": -1, "unrest": 1},
            "criticalFailure": {"resources": -2, "unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Bandits defeated or recruited! You recover their loot.",
            "success": "Bandits scattered! They flee your territory.",
            "failure": "Raids continue. Lose 1 Resource this turn.",
            "criticalFailure": "Bandits grow bolder! They raid with impunity."
        },
        "special": "Once per event, you can try to recruit the bandits (Diplomacy only) - on success, gain a free Garrison."
    },
    {
        "id": "boomtown",
        "name": "Boomtown",
        "description": "A settlement experiences sudden, dramatic growth.",
        "traits": ["beneficial", "continuous"],
        "location": "Random settlement",
        "resolution": "Society (manage growth), Crafting (expand infrastructure), or Diplomacy (maintain order)",
        "skills": ["society", "crafting", "diplomacy"],
        "resolvedOn": ["failure", "criticalFailure"],
        "outcomes": {
            "criticalSuccess": {"gold": 4},
            "success": {"gold": 2},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Major growth! The boom brings tremendous prosperity.",
            "success": "Steady expansion! The settlement prospers this turn.",
            "failure": "Growth stalls. The boom has ended.",
            "criticalFailure": "Boom goes bust! The rapid collapse causes unrest."
        },
        "special": "While active gain +1 untyped bonus to all Crafting and Society checks in that settlement."
    },
    {
        "id": "cult-activity",
        "name": "Cult Activity",
        "description": "A dangerous cult begins operating in secret within your kingdom.",
        "traits": ["dangerous", "continuous"],
        "location": "Random settlement",
        "resolution": "Stealth (infiltrate the cult), Religion (counter their beliefs), or Intimidation (root them out)",
        "skills": ["stealth", "religion", "intimidation"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Cult exposed and defeated! The threat is eliminated.",
            "success": "Progress made in defeating the cult.",
            "failure": "Cult continues to operate in secret.",
            "criticalFailure": "Cult grows stronger and spreads to another settlement!"
        },
        "special": "Settlements with Faith & Nature structures gain tier bonus to defeat. Crime & Intrigue structures gain tier bonus to locate."
    },
    {
        "id": "demand-expansion",
        "name": "Demand Expansion",
        "description": "Citizens demand the kingdom claim new territory.",
        "traits": ["dangerous", "continuous"],
        "location": "Capital",
        "resolution": "Diplomacy (promise future growth), Survival (show expansion plans), or Intimidation (demand patience)",
        "skills": ["diplomacy", "survival", "intimidation"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Citizens satisfied with your expansion plans!",
            "success": "Citizens accept your promises.",
            "failure": "Citizens grow impatient with lack of expansion.",
            "criticalFailure": "Major dissatisfaction with kingdom's stagnation!"
        },
        "special": "If you expand your territory this turn (claim a new hex), automatically succeed and event ends."
    },
    {
        "id": "demand-structure",
        "name": "Demand Structure",
        "description": "Citizens demand that a specific structure be built.",
        "traits": ["dangerous", "continuous"],
        "location": "Largest settlement",
        "resolution": "Diplomacy (negotiate a compromise), Intimidation (enforce order), or Society (understand their needs)",
        "skills": ["diplomacy", "intimidation", "society"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Citizens convinced to be patient!",
            "success": "Demands are satisfied for now.",
            "failure": "Protests continue. You must pay 1 Gold as concessions or gain unrest.",
            "criticalFailure": "Violence erupts over unmet demands!"
        },
        "special": "Roll 1d6: 1-2 = Market/Commerce, 3-4 = Military/Defense, 5-6 = Cultural/Religious. If you build the demanded type, event ends."
    },
    {
        "id": "diplomatic-overture",
        "name": "Diplomatic Overture",
        "description": "A neighboring kingdom reaches out to establish or improve diplomatic relations.",
        "traits": ["beneficial"],
        "location": "Capital",
        "resolution": "Diplomacy (formal negotiations), Society (cultural exchange), or Deception (gain advantage)",
        "skills": ["diplomacy", "society", "deception"],
        "outcomes": {
            "criticalSuccess": {"gold": 1, "unrest": -1},
            "success": {},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Relations improve significantly! Trade benefits follow.",
            "success": "Relations improve by one step.",
            "failure": "No change in relations. Minor diplomatic friction.",
            "criticalFailure": "Relations worsen by one step!"
        },
        "special": "Civic & Governance structures provide tier bonus. Cannot reach Helpful without diplomatic capacity."
    },
    {
        "id": "drug-den",
        "name": "Drug Den",
        "description": "An illicit drug trade threatens to corrupt your settlement.",
        "traits": ["dangerous", "continuous"],
        "location": "Largest settlement",
        "resolution": "Stealth (undercover investigation), Medicine (treat addicts, trace source), or Intimidation (crack down hard)",
        "skills": ["stealth", "medicine", "intimidation"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {"imprisoned_unrest": 1},
            "failure": {"unrest": 1, "gold": -1},
            "criticalFailure": {"unrest": 2, "damage_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Drug ring destroyed completely!",
            "success": "Major arrests made. Convert 1 unrest to imprisoned unrest.",
            "failure": "Drug trade spreads despite efforts.",
            "criticalFailure": "Major drug crisis! One structure becomes damaged."
        },
        "special": "Crime & Intrigue structures provide tier bonus to checks."
    },
    {
        "id": "economic-surge",
        "name": "Economic Surge",
        "description": "Trade and productivity boom throughout your kingdom.",
        "traits": ["beneficial", "continuous"],
        "location": "Capital",
        "resolution": "Society (manage growth), Diplomacy (attract traders), or Crafting (increase production)",
        "skills": ["society", "diplomacy", "crafting"],
        "resolvedOn": ["failure", "criticalFailure"],
        "outcomes": {
            "criticalSuccess": {"gold": 2},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Trade bonanza! Massive profits this turn.",
            "success": "Steady growth in trade and commerce.",
            "failure": "Economic surge slows and ends.",
            "criticalFailure": "Economic bubble bursts causing unrest!"
        },
        "special": "Commerce structures provide untyped bonus equal to tier."
    },
    {
        "id": "festive-invitation",
        "name": "Festive Invitation",
        "description": "A neighboring kingdom invites your leaders to a grand festival.",
        "traits": ["beneficial"],
        "location": "Capital",
        "resolution": "Diplomacy (formal attendance), Performance (entertain hosts), or Society (navigate customs)",
        "skills": ["diplomacy", "performance", "society"],
        "outcomes": {
            "criticalSuccess": {"gold": 1, "unrest": -1},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Great success at the festival! Gifts and goodwill received.",
            "success": "Pleasant visit with reciprocal gifts.",
            "failure": "Adequate visit but gifts not reciprocated.",
            "criticalFailure": "Diplomatic faux pas causes embarrassment!"
        },
        "special": "You may bring 0-2 Resources as gifts. If you bring at least 1, gain +2 to check."
    },
    {
        "id": "feud",
        "name": "Feud",
        "description": "Rival factions from different settlements escalate their conflict.",
        "traits": ["dangerous", "continuous"],
        "location": "Two settlements",
        "resolution": "Diplomacy (mediate peace), Intimidation (enforce order), or Deception (manipulate resolution)",
        "skills": ["diplomacy", "intimidation", "deception"],
        "outcomes": {
            "criticalSuccess": {"gold": 1},
            "success": {},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2, "damage_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Feud ended! Rivals become allies and trade improves.",
            "success": "Feud resolved peacefully.",
            "failure": "Feud disrupts trade between settlements.",
            "criticalFailure": "Private war erupts! A structure is damaged in the fighting."
        },
        "special": "If less than 2 settlements, this event has no effect."
    },
    {
        "id": "food-shortage",
        "name": "Food Shortage",
        "description": "Disease, weather, or pests destroy agricultural production.",
        "traits": ["dangerous", "continuous"],
        "location": "Kingdom-wide",
        "resolution": "Nature (agricultural expertise), Survival (emergency measures), or Diplomacy (coordinate relief)",
        "skills": ["nature", "survival", "diplomacy"],
        "outcomes": {
            "criticalSuccess": {"food": -2},
            "success": {"food": -4},
            "failure": {"food": -6, "unrest": 1},
            "criticalFailure": {"food": -8, "unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Crisis averted with minimal losses!",
            "success": "Shortage controlled but significant food lost.",
            "failure": "Severe shortage causes widespread hunger.",
            "criticalFailure": "Famine threatens the kingdom!"
        }
    },
    {
        "id": "food-surplus",
        "name": "Food Surplus",
        "description": "Exceptional harvests provide abundant food.",
        "traits": ["beneficial"],
        "location": "Kingdom-wide",
        "resolution": "Nature (maximize the bounty), Society (organize distribution), or Crafting (preserve excess)",
        "skills": ["nature", "society", "crafting"],
        "outcomes": {
            "criticalSuccess": {"gold": 3, "unrest": -1},
            "success": {"gold": 2},
            "failure": {"gold": 1},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Massive surplus! Selling excess brings great profit.",
            "success": "Good harvest brings solid profits.",
            "failure": "Minor surplus provides small benefit.",
            "criticalFailure": "Surplus spoils due to poor management!"
        }
    },
    {
        "id": "good-weather",
        "name": "Good Weather",
        "description": "Perfect weather conditions boost morale and productivity.",
        "traits": ["beneficial", "continuous"],
        "location": "Kingdom-wide",
        "resolution": "Nature (predict weather patterns), Society (organize activities), or Performance (celebrate the weather)",
        "skills": ["nature", "society", "performance"],
        "resolvedOn": ["failure", "criticalFailure"],
        "outcomes": {
            "criticalSuccess": {"food": 2, "unrest": -1},
            "success": {"food": 2},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Weather holds perfectly! Morale and harvests excellent.",
            "success": "Weather remains good for farming.",
            "failure": "Weather changes back to normal.",
            "criticalFailure": "Weather turns bad suddenly!"
        },
        "special": "No check required first turn."
    },
    {
        "id": "grand-tournament",
        "name": "Grand Tournament",
        "description": "A martial competition draws competitors from across the realm.",
        "traits": ["beneficial"],
        "location": "Largest settlement",
        "resolution": "Athletics (strength competitions), Acrobatics (agility contests), or Performance (pageantry and ceremonies)",
        "skills": ["athletics", "acrobatics", "performance"],
        "outcomes": {
            "criticalSuccess": {"gold": 2, "unrest": -1, "fame": 1},
            "success": {"unrest": -1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Spectacular event! The tournament brings fame and fortune.",
            "success": "Successful tournament entertains the masses.",
            "failure": "Disappointing turnout for the tournament.",
            "criticalFailure": "Accident or scandal mars the tournament!"
        },
        "special": "Performance & Culture or Military & Training structures provide tier bonus."
    },
    {
        "id": "immigration",
        "name": "Immigration",
        "description": "New settlers arrive seeking homes in your kingdom.",
        "traits": ["beneficial"],
        "location": "Kingdom-wide",
        "resolution": "Diplomacy (welcome newcomers), Society (integrate settlers), or Survival (find them land)",
        "skills": ["diplomacy", "society", "survival"],
        "outcomes": {
            "criticalSuccess": {"gold": 2},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Major influx! New settlers bring wealth and gain +2 to Build Structure actions this turn.",
            "success": "Steady immigration brings new workers and +1 to Build Structure actions this turn.",
            "failure": "Few settlers choose to stay.",
            "criticalFailure": "Integration problems cause social tensions!"
        }
    },
    {
        "id": "inquisition",
        "name": "Inquisition",
        "description": "Zealots mobilize against a minority group or belief.",
        "traits": ["dangerous", "continuous"],
        "location": "Largest settlement",
        "resolution": "Religion (theological debate), Intimidation (suppress zealots), or Diplomacy (protect victims)",
        "skills": ["religion", "intimidation", "diplomacy"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 2},
            "criticalFailure": {"unrest": 2, "destroy_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Peacefully resolved through wisdom and compassion.",
            "success": "Zealots dispersed without violence.",
            "failure": "Persecution spreads despite efforts.",
            "criticalFailure": "Violence erupts! A structure is destroyed in the chaos."
        },
        "special": "Faith & Nature structures provide tier bonus to Religion checks."
    },
    {
        "id": "justice-prevails",
        "name": "Justice Prevails",
        "description": "Authorities catch a notorious criminal or resolve a major injustice.",
        "traits": ["beneficial"],
        "location": "Capital or largest settlement",
        "resolution": "Intimidation (show of force), Diplomacy (public ceremony), or Society (legal proceedings)",
        "skills": ["intimidation", "diplomacy", "society"],
        "outcomes": {
            "criticalSuccess": {"unrest": -2},
            "success": {"unrest": -1},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Major triumph of justice inspires the kingdom!",
            "success": "Justice served satisfies the citizens.",
            "failure": "Justice with complications causes doubt.",
            "criticalFailure": "Miscarriage of justice causes outrage!"
        },
        "special": "Civic & Governance structures provide tier bonus."
    },
    {
        "id": "land-rush",
        "name": "Land Rush",
        "description": "Settlers attempt to claim wilderness at the kingdom's border.",
        "traits": ["dangerous"],
        "location": "Border",
        "resolution": "Diplomacy (negotiate with settlers), Survival (guide their efforts), or Intimidation (assert control)",
        "skills": ["diplomacy", "survival", "intimidation"],
        "outcomes": {
            "criticalSuccess": {"hex": 2},
            "success": {"hex": 1},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Settlers successfully expand the kingdom by 2 hexes!",
            "success": "Settlers expand the kingdom by 1 hex.",
            "failure": "Settlers disperse without helping.",
            "criticalFailure": "Violence erupts at the border!"
        },
        "special": "Hexes are claimed without requiring the normal Claim Hex action or resources."
    },
    {
        "id": "local-disaster",
        "name": "Local Disaster",
        "description": "Fire, flood, or structural collapse strikes a settlement.",
        "traits": ["dangerous"],
        "location": "Random settlement",
        "resolution": "Crafting (emergency repairs), Survival (evacuation and rescue), or Society (organize response)",
        "skills": ["crafting", "survival", "society"],
        "outcomes": {
            "criticalSuccess": {},
            "success": {"unrest": 1},
            "failure": {"unrest": 1, "damage_structure": 1},
            "criticalFailure": {"unrest": 2, "destroy_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Disaster contained with no significant damage!",
            "success": "Limited damage from quick response.",
            "failure": "Major damage! One structure is damaged.",
            "criticalFailure": "Catastrophic! One structure is destroyed."
        },
        "special": "Settlements with Fortifications increase the result by one degree of success."
    },
    {
        "id": "magical-discovery",
        "name": "Magical Discovery",
        "description": "A powerful magical site or artifact is discovered in your kingdom.",
        "traits": ["beneficial"],
        "location": "Largest settlement",
        "resolution": "Arcana (understand the magic), Religion (divine its purpose), or Occultism (unlock its secrets)",
        "skills": ["arcana", "religion", "occultism"],
        "outcomes": {
            "criticalSuccess": {},
            "success": {"unrest": -2},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2, "damage_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Major magical boon! Gain a free Tier 1 magical structure or upgrade one.",
            "success": "Useful discovery reduces unrest or increases fame.",
            "failure": "Magic proves dangerous to handle.",
            "criticalFailure": "Magical disaster! A magical structure is damaged."
        },
        "special": "Knowledge & Magic structures provide tier bonus."
    },
    {
        "id": "military-exercises",
        "name": "Military Exercises",
        "description": "Your kingdom conducts large-scale military training maneuvers.",
        "traits": ["beneficial"],
        "location": "Settlement with military structures",
        "resolution": "Athletics (physical conditioning), Acrobatics (combat maneuvers), or Intimidation (discipline and morale)",
        "skills": ["athletics", "acrobatics", "intimidation"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {},
            "criticalFailure": {"unrest": 1, "damage_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Elite forces trained! +2 to military actions this turn.",
            "success": "Successful training provides +1 to military actions this turn.",
            "failure": "Training is ineffective.",
            "criticalFailure": "Training accident damages a military structure!"
        },
        "special": "Military & Training structures provide tier bonus."
    },
    {
        "id": "monster-attack",
        "name": "Monster Attack",
        "description": "A dangerous creature attacks a settlement or travelers.",
        "traits": ["dangerous"],
        "location": "Random settlement",
        "resolution": "Intimidation (drive it off), Nature (understand and redirect), or Stealth (track and ambush)",
        "skills": ["intimidation", "nature", "stealth"],
        "outcomes": {
            "criticalSuccess": {"gold": 2, "unrest": -1},
            "success": {},
            "failure": {"unrest": 1, "damage_structure": 1},
            "criticalFailure": {"unrest": 2, "destroy_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Monster defeated! Its remains are worth a trophy.",
            "success": "Monster driven away without damage.",
            "failure": "Monster causes damage before fleeing.",
            "criticalFailure": "Monster rampages through the settlement!"
        },
        "special": "Settlements with Fortifications gain tier bonus."
    },
    {
        "id": "natural-disaster",
        "name": "Natural Disaster",
        "description": "Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.",
        "traits": ["dangerous"],
        "location": "Random worksite and 2 adjacent hexes",
        "resolution": "Survival (evacuation and rescue), Crafting (emergency shelters), or Society (coordinate relief)",
        "skills": ["survival", "crafting", "society"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {"resources": -1},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Minimal damage! Citizens impressed by response.",
            "success": "Some damage but losses are limited.",
            "failure": "Major damage! All production lost from affected hexes.",
            "criticalFailure": "Devastating! Worksites destroyed in affected hexes."
        },
        "special": "Can spend 1 Gold per hex before rolling to gain +2 to that check. Check each hex separately."
    },
    {
        "id": "natures-blessing",
        "name": "Nature's Blessing",
        "description": "A natural wonder appears in your kingdom - rare flowers, aurora, or returning wildlife.",
        "traits": ["beneficial"],
        "location": "Largest settlement",
        "resolution": "Nature (understand the blessing), Performance (celebrate it), or Society (organize festivals)",
        "skills": ["nature", "performance", "society"],
        "outcomes": {
            "criticalSuccess": {"unrest": -2, "gold": 1},
            "success": {"unrest": -1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Inspiring blessing brings tourism and joy!",
            "success": "Pleasant omen lifts spirits.",
            "failure": "Brief wonder has no lasting effect.",
            "criticalFailure": "Arguments over the meaning cause tension."
        },
        "special": "Faith & Nature or Exploration & Wilderness structures provide tier bonus."
    },
    {
        "id": "notorious-heist",
        "name": "Notorious Heist",
        "description": "A daring theft threatens your kingdom's security and reputation.",
        "traits": ["dangerous"],
        "location": "Largest settlement with valuable structures",
        "resolution": "Thievery (understand criminal methods), Stealth (track the thieves), or Society (investigate connections)",
        "skills": ["thievery", "stealth", "society"],
        "outcomes": {
            "criticalSuccess": {"imprisoned_unrest": 2},
            "success": {"imprisoned_unrest": 1},
            "failure": {"gold": -2, "unrest": 1},
            "criticalFailure": {"gold": -3, "unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Thieves captured with stolen goods! Convert 2 unrest to imprisoned.",
            "success": "Thieves arrested! Convert 1 unrest to imprisoned.",
            "failure": "Thieves escape with the loot.",
            "criticalFailure": "Crime syndicate exposed! May trigger more crime events."
        },
        "special": "Crime & Intrigue structures provide tier bonus. No effect if no treasury/commerce structures."
    },
    {
        "id": "pilgrimage",
        "name": "Pilgrimage",
        "description": "Religious pilgrims seek passage or sanctuary in your kingdom.",
        "traits": ["beneficial"],
        "location": "Largest settlement",
        "resolution": "Religion (provide sanctuary), Diplomacy (welcome pilgrims), or Society (organize accommodations)",
        "skills": ["religion", "diplomacy", "society"],
        "outcomes": {
            "criticalSuccess": {"gold": 1, "unrest": -1, "fame": 1},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Major pilgrimage brings fame and donations!",
            "success": "Peaceful passage brings modest donations.",
            "failure": "Minor disruption from the pilgrims.",
            "criticalFailure": "Religious tensions arise from the visit."
        },
        "special": "Faith & Nature structures provide tier bonus."
    },
    {
        "id": "plague",
        "name": "Plague",
        "description": "Disease spreads rapidly through your settlements.",
        "traits": ["dangerous", "continuous"],
        "location": "Largest settlement",
        "resolution": "Medicine (treat the sick), Religion (divine healing), or Society (quarantine measures)",
        "skills": ["medicine", "religion", "society"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 1, "gold": -2},
            "criticalFailure": {"unrest": 2, "gold": -2}
        },
        "messages": {
            "criticalSuccess": "Plague cured! Your healers are heroes.",
            "success": "Plague contained to current settlement.",
            "failure": "Plague spreads to settlements connected by roads.",
            "criticalFailure": "Devastating outbreak spreads to all connected settlements!"
        },
        "special": "Medicine & Healing or Faith & Nature structures provide tier bonus. Bonuses stack."
    },
    {
        "id": "public-scandal",
        "name": "Public Scandal",
        "description": "A leader is implicated in an embarrassing or criminal situation.",
        "traits": ["dangerous"],
        "location": "Random PC",
        "resolution": "Deception (cover up), Diplomacy (public apology), or Intimidation (silence critics)",
        "skills": ["deception", "diplomacy", "intimidation"],
        "outcomes": {
            "criticalSuccess": {},
            "success": {"unrest": 1},
            "failure": {"unrest": 2},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Scandal deflected without consequence!",
            "success": "Damage controlled but some unrest remains.",
            "failure": "Public outrage over the scandal!",
            "criticalFailure": "Leader must lay low. Cannot take Kingdom Action this turn."
        }
    },
    {
        "id": "raiders",
        "name": "Raiders",
        "description": "Armed raiders threaten settlements and trade routes.",
        "traits": ["dangerous", "continuous"],
        "location": "Random settlement",
        "resolution": "Intimidation (military response), Diplomacy (negotiate tribute), or Stealth (track to their base)",
        "skills": ["intimidation", "diplomacy", "stealth"],
        "outcomes": {
            "criticalSuccess": {"gold": 1},
            "success": {},
            "failure": {"gold": -2, "food": -2, "unrest": 1},
            "criticalFailure": {"gold": -2, "food": -2, "unrest": 2, "damage_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Raiders defeated and their loot recovered!",
            "success": "Raiders driven off without losses.",
            "failure": "Successful raid takes gold and food.",
            "criticalFailure": "Major raid damages a structure!"
        },
        "special": "Can pay 2 Gold tribute to immediately end event. Fortifications provide tier bonus."
    },
    {
        "id": "remarkable-treasure",
        "name": "Remarkable Treasure",
        "description": "Explorers discover valuable resources or ancient treasure.",
        "traits": ["beneficial"],
        "location": "Random hex",
        "resolution": "Society (appraise value), Thievery (secure it safely), or Diplomacy (negotiate claims)",
        "skills": ["society", "thievery", "diplomacy"],
        "outcomes": {
            "criticalSuccess": {"gold": 4, "unrest": -1},
            "success": {"gold": 2},
            "failure": {"gold": 1},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Legendary treasure of immense value!",
            "success": "Valuable find enriches the kingdom.",
            "failure": "Modest value from the discovery.",
            "criticalFailure": "Treasure proves cursed or false!"
        },
        "special": "Gain +1 to check for each mine or quarry you control."
    },
    {
        "id": "scholarly-discovery",
        "name": "Scholarly Discovery",
        "description": "Researchers in your kingdom make an important academic breakthrough.",
        "traits": ["beneficial"],
        "location": "Settlement with knowledge structures",
        "resolution": "Lore (historical research), Arcana (theoretical magic), or Society (social sciences)",
        "skills": ["lore", "arcana", "society"],
        "outcomes": {
            "criticalSuccess": {"gold": 2, "fame": 1},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Revolutionary discovery! May build one Knowledge structure at half cost.",
            "success": "Important findings bring recognition.",
            "failure": "Research proves inconclusive.",
            "criticalFailure": "Academic scandal embarrasses the kingdom!"
        },
        "special": "Knowledge & Magic structures provide tier bonus."
    },
    {
        "id": "sensational-crime",
        "name": "Sensational Crime",
        "description": "A notorious crime captures public attention.",
        "traits": ["dangerous"],
        "location": "Largest settlement",
        "resolution": "Intimidation (harsh justice), Society (investigation), or Diplomacy (calm fears)",
        "skills": ["intimidation", "society", "diplomacy"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 1},
            "criticalFailure": {"unrest": 2}
        },
        "messages": {
            "criticalSuccess": "Criminal caught spectacularly! Justice prevails.",
            "success": "Crime solved without further incident.",
            "failure": "Criminal escapes causing fear.",
            "criticalFailure": "Copycat crimes spread! Event may recur."
        },
        "special": "Crime & Intrigue structures provide tier bonus."
    },
    {
        "id": "trade-agreement",
        "name": "Trade Agreement",
        "description": "Merchants propose a lucrative trade arrangement.",
        "traits": ["beneficial"],
        "location": "Capital or largest settlement",
        "resolution": "Diplomacy (negotiate terms), Society (assess markets), or Deception (leverage position)",
        "skills": ["diplomacy", "society", "deception"],
        "outcomes": {
            "criticalSuccess": {"gold": 2},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"gold": -1, "unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Exclusive trade deal secured!",
            "success": "Standard agreement provides steady income.",
            "failure": "Poor terms provide no benefit.",
            "criticalFailure": "Trade dispute causes losses!"
        },
        "special": "Commerce structures provide tier bonus."
    },
    {
        "id": "undead-uprising",
        "name": "Undead Uprising",
        "description": "The dead rise from their graves to threaten the living.",
        "traits": ["dangerous", "continuous"],
        "location": "Random settlement",
        "resolution": "Religion (consecrate and bless), Arcana (magical containment), or Intimidation (destroy by force)",
        "skills": ["religion", "arcana", "intimidation"],
        "outcomes": {
            "criticalSuccess": {"unrest": -1},
            "success": {},
            "failure": {"unrest": 1, "damage_structure": 1},
            "criticalFailure": {"unrest": 2, "destroy_structure": 1, "damage_structure": 1}
        },
        "messages": {
            "criticalSuccess": "Undead destroyed and source consecrated!",
            "success": "Undead destroyed but threat remains.",
            "failure": "Undead spread and damage structures.",
            "criticalFailure": "Major outbreak! Structures destroyed in the chaos."
        },
        "special": "Faith & Nature or Knowledge & Magic structures provide tier bonus."
    },
    {
        "id": "visiting-celebrity",
        "name": "Visiting Celebrity",
        "description": "A famous person visits your kingdom, bringing attention and opportunity.",
        "traits": ["beneficial"],
        "location": "Random settlement",
        "resolution": "Diplomacy (formal reception), Performance (entertainment), or Society (social events)",
        "skills": ["diplomacy", "performance", "society"],
        "outcomes": {
            "criticalSuccess": {"gold": 2, "unrest": -2},
            "success": {"gold": 1},
            "failure": {},
            "criticalFailure": {"unrest": 1}
        },
        "messages": {
            "criticalSuccess": "Spectacular visit brings fame and fortune!",
            "success": "Pleasant visit with choice of gold or reduced unrest.",
            "failure": "Mediocre visit has no impact.",
            "criticalFailure": "Celebrity offended! -2 to next celebrity event."
        },
        "special": "Performance & Culture structures provide tier bonus."
    }
]

def main():
    """Generate all event files and translation commands"""
    
    # Ensure events directory exists
    os.makedirs(".", exist_ok=True)
    
    # Track generated files
    generated_files = []
    translation_commands = []
    
    print("Generating Kingdom Events...")
    print("-" * 50)
    
    for event_data in events_data:
        event_id = event_data["id"]
        print(f"Creating {event_id}...")
        
        # Create event JSON
        event_json = create_event_json(
            event_id=event_id,
            name=event_data["name"],
            description=event_data["description"],
            traits=event_data["traits"],
            location=event_data["location"],
            resolution=event_data["resolution"],
            skills=event_data["skills"],
            outcomes=event_data["outcomes"],
            resolvedOn=event_data.get("resolvedOn"),
            special=event_data.get("special")
        )
        
        # Write JSON file
        filename = f"{event_id}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(event_json, f, indent=2, ensure_ascii=False)
        generated_files.append(filename)
        
        # Generate translation commands
        base_key = f"pf2e-kingdom-lite.events.{event_id}"
        
        # Basic event info
        translation_commands.append(f'set "{base_key}.name" "{event_data["name"]}"')
        translation_commands.append(f'set "{base_key}.description" "{event_data["description"]}"')
        translation_commands.append(f'set "{base_key}.location" "{event_data["location"]}"')
        translation_commands.append(f'set "{base_key}.resolution" "{event_data["resolution"]}"')
        
        if event_data.get("special"):
            translation_commands.append(f'set "{base_key}.special" "{event_data["special"]}"')
        
        # Outcome messages
        for outcome, message in event_data["messages"].items():
            translation_commands.append(f'set "{base_key}.stage-0.{outcome}.msg" "<p>{message}</p>"')
        
        # Modifier names
        for outcome, mods in event_data["outcomes"].items():
            for mod_type, value in mods.items():
                if mod_type in ["gold", "unrest", "fame", "food", "resources", "hex"]:
                    mod_name = mod_type.title()
                    if value > 0:
                        mod_text = f"+{value} {mod_name}"
                    else:
                        mod_text = f"{value} {mod_name}"
                    translation_commands.append(f'set "{base_key}.stage-0.{outcome}.{mod_type}" "{mod_text}"')
                elif mod_type == "resource":
                    translation_commands.append(f'set "{base_key}.stage-0.{outcome}.resource" "Choose 1 Resource"')
                elif mod_type == "damage_structure":
                    translation_commands.append(f'set "{base_key}.stage-0.{outcome}.damage" "Structure Damaged"')
                elif mod_type == "destroy_structure":
                    translation_commands.append(f'set "{base_key}.stage-0.{outcome}.destroy" "Structure Destroyed"')
                elif mod_type == "imprisoned_unrest":
                    translation_commands.append(f'set "{base_key}.stage-0.{outcome}.imprisoned" "Convert {value} Unrest to Imprisoned"')
    
    # Write translation script
    script_filename = "add_event_translations.sh"
    with open(script_filename, "w", encoding="utf-8") as f:
        f.write("#!/bin/bash\n\n")
        f.write("# Script to add all event translations to en.json\n")
        f.write("# Generated by create_all_events.py\n\n")
        f.write("cd ../../lang/langtools\n\n")
        f.write("# Add all event translations\n")
        for cmd in translation_commands:
            f.write(f"python3 lang_manager.py {cmd}\n")
        f.write("\n# Export to en.json\n")
        f.write("python3 lang_manager.py export\n\n")
        f.write('echo "All event translations added successfully!"\n')
    
    # Make script executable
    os.chmod(script_filename, 0o755)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"✅ Successfully generated {len(generated_files)} event JSON files")
    print(f"✅ Created {script_filename} with {len(translation_commands)} translation commands")
    print("\n📁 Generated files:")
    for file in sorted(generated_files):
        print(f"   - {file}")
    print("\n🚀 Next steps:")
    print("   1. Review the generated JSON files")
    print(f"   2. Run: bash {script_filename}")
    print("   3. Verify translations in lang/en.json")
    print("\n" + "=" * 50)

if __name__ == "__main__":
    main()
