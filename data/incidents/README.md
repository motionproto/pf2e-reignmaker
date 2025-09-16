# Unrest Incidents JSON Data

This folder contains all unrest incident definitions for the PF2e Kingdom Building module.

## Folder Structure

```
data/incidents/
├── minor/        # MINOR tier incidents
├── moderate/     # MODERATE tier incidents  
├── major/        # MAJOR tier incidents
└── README.md     # This file
```

## JSON Format

Each incident is defined in a separate JSON file following this structure:

```json
{
  "id": "incident-unique-id",
  "name": "incidents.incident-name.name",
  "tier": "MINOR|MODERATE|MAJOR",
  "description": "incidents.incident-name.description",
  "percentileRange": [1, 20],
  "skillOptions": [
    {
      "skill": "diplomacy|intimidation|etc",
      "successEffect": "incidents.incident-name.skill.success",
      "failureEffect": "incidents.incident-name.skill.failure",
      "criticalSuccessBonus": "incidents.incident-name.skill.criticalSuccess",
      "criticalFailureExtra": "incidents.incident-name.skill.criticalFailure",
      "dc": null
    }
  ]
}
```

## Field Descriptions

- **id**: Unique identifier for the incident
- **name**: Localization key for the incident name
- **tier**: Unrest tier when this incident can occur (MINOR, MODERATE, or MAJOR)
- **description**: Localization key for the incident description
- **percentileRange**: Array of two numbers [min, max] for percentile roll range (1-100)
- **skillOptions**: Array of skill resolution options available to players

### Skill Option Fields

- **skill**: PF2e character skill name (lowercase) like "diplomacy", "intimidation", etc.
- **successEffect**: Localization key for success outcome
- **failureEffect**: Localization key for failure outcome  
- **criticalSuccessBonus** (optional): Localization key for critical success bonus
- **criticalFailureExtra** (optional): Localization key for additional critical failure effects
- **dc** (optional): Fixed DC for this skill check (if not provided, uses character level-based DC)

## Available Character Skills

These are PF2e character skills (not kingdom skills):

- acrobatics
- arcana
- athletics
- crafting
- deception
- diplomacy
- intimidation
- lore (various)
- medicine
- nature
- occultism
- performance
- religion
- society
- stealth
- survival
- thievery

## Adding New Incidents

1. Create a new JSON file in the appropriate tier folder (minor/moderate/major)
2. Follow the format above
3. Add corresponding localization strings to `lang/en.json`
4. The incident will be automatically loaded when the module starts

## Localization

All text strings use localization keys. Add the actual text to `lang/en.json`:

```json
{
  "incidents": {
    "crime-wave": {
      "name": "Crime Wave",
      "description": "A wave of petty thefts and vandalism sweeps through the settlements.",
      "intimidation": {
        "success": "Crime suppressed through show of force",
        "failure": "Lose 1d4 Gold",
        "criticalSuccess": "Crime ring dismantled completely",
        "criticalFailure": "Lose 2d4 Gold, +1 Unrest"
      }
    }
  }
}
```

## Example Incidents

See the existing files for examples:
- `minor/crime-wave.json` - Basic incident with multiple skill options
- `minor/work-stoppage.json` - Worker strikes
- `minor/protests.json` - Street protests
- `moderate/riot.json` - Violent riots
