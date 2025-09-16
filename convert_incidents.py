#!/usr/bin/env python3

import json
import os

# All incident data
incidents = {
    "discontent": [
        {
            "id": "emigration-threat",
            "name": "Emigration Threat",
            "tier": "DISCONTENT",
            "description": "Citizens threaten to leave the kingdom for better opportunities elsewhere.",
            "percentileMin": 41,
            "percentileMax": 50,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Population stays, no effect", "failureEffect": "Lose 1 random worksite permanently", "criticalFailureExtra": "Lose 1 random worksite permanently, +1 unrest"},
                {"skill": "society", "successEffect": "Concerns addressed, no effect", "failureEffect": "Lose 1 random worksite permanently", "criticalFailureExtra": "Lose 1 random worksite permanently, +1 unrest"},
                {"skill": "religion", "successEffect": "Faith keeps them home, no effect", "failureEffect": "Lose 1 random worksite permanently", "criticalFailureExtra": "Lose 1 random worksite permanently, +1 unrest"},
                {"skill": "nature", "successEffect": "Local conditions improved, no effect", "failureEffect": "Lose 1 random worksite permanently", "criticalFailureExtra": "Lose 1 random worksite permanently, +1 unrest"}
            ]
        },
        {
            "id": "protests",
            "name": "Protests",
            "tier": "DISCONTENT",
            "description": "Angry citizens take to the streets in protest.",
            "percentileMin": 51,
            "percentileMax": 60,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Peaceful resolution, no effect", "failureEffect": "Lose 1d4 Gold (property damage, lost productivity)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame"},
                {"skill": "intimidation", "successEffect": "Protests dispersed, no effect", "failureEffect": "Lose 1d4 Gold (property damage, lost productivity)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame"},
                {"skill": "performance", "successEffect": "Crowd distracted, no effect", "failureEffect": "Lose 1d4 Gold (property damage, lost productivity)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame"},
                {"skill": "arcana", "successEffect": "Magical calming, no effect", "failureEffect": "Lose 1d4 Gold (property damage, lost productivity)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame"}
            ]
        },
        {
            "id": "corruption-scandal",
            "name": "Corruption Scandal",
            "tier": "DISCONTENT",
            "description": "Officials are caught embezzling kingdom funds.",
            "percentileMin": 61,
            "percentileMax": 70,
            "skillOptions": [
                {"skill": "society", "successEffect": "Scandal contained, no effect", "failureEffect": "Lose 1d4 Gold (embezzlement/graft discovered)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame (major corruption exposed)"},
                {"skill": "deception", "successEffect": "Cover-up successful, no effect", "failureEffect": "Lose 1d4 Gold (embezzlement/graft discovered)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame (major corruption exposed)"},
                {"skill": "intimidation", "successEffect": "Officials purged, no effect", "failureEffect": "Lose 1d4 Gold (embezzlement/graft discovered)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame (major corruption exposed)"},
                {"skill": "diplomacy", "successEffect": "Public relations managed, no effect", "failureEffect": "Lose 1d4 Gold (embezzlement/graft discovered)", "criticalFailureExtra": "Lose 2d4 Gold, -1 Fame (major corruption exposed)"}
            ]
        },
        {
            "id": "rising-tensions",
            "name": "Rising Tensions",
            "tier": "DISCONTENT",
            "description": "General unease spreads throughout the kingdom.",
            "percentileMin": 71,
            "percentileMax": 80,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Tensions ease, no effect", "failureEffect": "+1 Unrest", "criticalFailureExtra": "+2 Unrest"},
                {"skill": "religion", "successEffect": "Spiritual guidance calms, no effect", "failureEffect": "+1 Unrest", "criticalFailureExtra": "+2 Unrest"},
                {"skill": "performance", "successEffect": "Entertainment distracts, no effect", "failureEffect": "+1 Unrest", "criticalFailureExtra": "+2 Unrest"},
                {"skill": "arcana", "successEffect": "Magical displays impress, no effect", "failureEffect": "+1 Unrest", "criticalFailureExtra": "+2 Unrest"}
            ]
        },
        {
            "id": "bandit-activity",
            "name": "Bandit Activity",
            "tier": "DISCONTENT",
            "description": "Bandits raid trade routes and settlements.",
            "percentileMin": 81,
            "percentileMax": 90,
            "skillOptions": [
                {"skill": "intimidation", "successEffect": "Bandits deterred, no effect", "failureEffect": "Lose 1d4 Gold to raids", "criticalFailureExtra": "Lose 2d4 Gold, bandits destroy a random worksite"},
                {"skill": "stealth", "successEffect": "Bandits infiltrated, no effect", "failureEffect": "Lose 1d4 Gold to raids", "criticalFailureExtra": "Lose 2d4 Gold, bandits destroy a random worksite"},
                {"skill": "survival", "successEffect": "Bandits tracked to lair, no effect", "failureEffect": "Lose 1d4 Gold to raids", "criticalFailureExtra": "Lose 2d4 Gold, bandits destroy a random worksite"},
                {"skill": "occultism", "successEffect": "Bandits found by scrying, no effect", "failureEffect": "Lose 1d4 Gold to raids", "criticalFailureExtra": "Lose 2d4 Gold, bandits destroy a random worksite"}
            ]
        },
        {
            "id": "minor-diplomatic-incident",
            "name": "Minor Diplomatic Incident",
            "tier": "DISCONTENT",
            "description": "A diplomatic misstep strains relations with neighbors.",
            "percentileMin": 91,
            "percentileMax": 100,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Relations maintained, no effect", "failureEffect": "One neighbouring kingdom's attitude worsens by 1 step", "criticalFailureExtra": "Two random kingdoms' attitudes worsen by 1 step"},
                {"skill": "society", "successEffect": "Formal apology accepted, no effect", "failureEffect": "One neighbouring kingdom's attitude worsens by 1 step", "criticalFailureExtra": "Two random kingdoms' attitudes worsen by 1 step"},
                {"skill": "deception", "successEffect": "Involvement denied, no effect", "failureEffect": "One neighbouring kingdom's attitude worsens by 1 step", "criticalFailureExtra": "Two random kingdoms' attitudes worsen by 1 step"}
            ]
        }
    ],
    "turmoil": [
        {
            "id": "production-strike",
            "name": "Production Strike",
            "tier": "TURMOIL",
            "description": "Workers refuse to produce critical resources.",
            "percentileMin": 16,
            "percentileMax": 24,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Strike ends, no effect", "failureEffect": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "criticalFailureExtra": "Lose 2d4+1 of a random resource"},
                {"skill": "society", "successEffect": "Arbitration successful, no effect", "failureEffect": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "criticalFailureExtra": "Lose 2d4+1 of a random resource"},
                {"skill": "crafting", "successEffect": "Work alongside strikers, no effect", "failureEffect": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "criticalFailureExtra": "Lose 2d4+1 of a random resource"},
                {"skill": "arcana", "successEffect": "Production automated, no effect", "failureEffect": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "criticalFailureExtra": "Lose 2d4+1 of a random resource"}
            ]
        },
        {
            "id": "diplomatic-incident",
            "name": "Diplomatic Incident",
            "tier": "TURMOIL",
            "description": "A serious diplomatic blunder threatens foreign relations.",
            "percentileMin": 25,
            "percentileMax": 33,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Relations maintained, no effect", "failureEffect": "One neighbouring kingdom's attitude worsens by 1 step", "criticalFailureExtra": "Two random kingdoms' attitudes worsen by 1 step"},
                {"skill": "deception", "successEffect": "Responsibility denied, no effect", "failureEffect": "One neighbouring kingdom's attitude worsens by 1 step", "criticalFailureExtra": "Two random kingdoms' attitudes worsen by 1 step"},
                {"skill": "society", "successEffect": "Formal apology accepted, no effect", "failureEffect": "One neighbouring kingdom's attitude worsens by 1 step", "criticalFailureExtra": "Two random kingdoms' attitudes worsen by 1 step"}
            ]
        },
        {
            "id": "tax-revolt",
            "name": "Tax Revolt",
            "tier": "TURMOIL",
            "description": "Citizens refuse to pay taxes.",
            "percentileMin": 34,
            "percentileMax": 42,
            "skillOptions": [
                {"skill": "intimidation", "successEffect": "Taxes collected normally", "failureEffect": "Lose 1d4 Gold (reduced tax collection)", "criticalFailureExtra": "Lose 2d4 Gold, +1 Unrest"},
                {"skill": "diplomacy", "successEffect": "Tax rates negotiated, no effect", "failureEffect": "Lose 1d4 Gold (reduced tax collection)", "criticalFailureExtra": "Lose 2d4 Gold, +1 Unrest"},
                {"skill": "society", "successEffect": "Tax reform accepted, no effect", "failureEffect": "Lose 1d4 Gold (reduced tax collection)", "criticalFailureExtra": "Lose 2d4 Gold, +1 Unrest"},
                {"skill": "deception", "successEffect": "Creative accounting works, no effect", "failureEffect": "Lose 1d4 Gold (reduced tax collection)", "criticalFailureExtra": "Lose 2d4 Gold, +1 Unrest"}
            ]
        },
        {
            "id": "infrastructure-damage",
            "name": "Infrastructure Damage",
            "tier": "TURMOIL",
            "description": "Critical infrastructure is damaged by sabotage or neglect.",
            "percentileMin": 43,
            "percentileMax": 51,
            "skillOptions": [
                {"skill": "crafting", "successEffect": "Damage prevented, no effect", "failureEffect": "One random structure in a random settlement becomes damaged", "criticalFailureExtra": "1d3 random structures become damaged, +1 unrest"},
                {"skill": "athletics", "successEffect": "Labor mobilized, no effect", "failureEffect": "One random structure in a random settlement becomes damaged", "criticalFailureExtra": "1d3 random structures become damaged, +1 unrest"},
                {"skill": "society", "successEffect": "Response organized, no effect", "failureEffect": "One random structure in a random settlement becomes damaged", "criticalFailureExtra": "1d3 random structures become damaged, +1 unrest"},
                {"skill": "arcana", "successEffect": "Magical restoration, no effect", "failureEffect": "One random structure in a random settlement becomes damaged", "criticalFailureExtra": "1d3 random structures become damaged, +1 unrest"}
            ]
        },
        {
            "id": "disease-outbreak",
            "name": "Disease Outbreak",
            "tier": "TURMOIL",
            "description": "A dangerous disease spreads through the kingdom.",
            "percentileMin": 52,
            "percentileMax": 60,
            "skillOptions": [
                {"skill": "medicine", "successEffect": "Disease contained, no effect", "failureEffect": "Lose 1d4 Food, +1 Unrest", "criticalFailureExtra": "Lose 2d4 Food, one Medicine or Faith structure damaged, +1 Unrest"},
                {"skill": "nature", "successEffect": "Natural remedies work, no effect", "failureEffect": "Lose 1d4 Food, +1 Unrest", "criticalFailureExtra": "Lose 2d4 Food, one Medicine or Faith structure damaged, +1 Unrest"},
                {"skill": "religion", "successEffect": "Divine healing succeeds, no effect", "failureEffect": "Lose 1d4 Food, +1 Unrest", "criticalFailureExtra": "Lose 2d4 Food, one Medicine or Faith structure damaged, +1 Unrest"}
            ]
        },
        {
            "id": "riot",
            "name": "Riot",
            "tier": "TURMOIL",
            "description": "Angry mobs riot in the streets, destroying property.",
            "percentileMin": 61,
            "percentileMax": 69,
            "skillOptions": [
                {"skill": "intimidation", "successEffect": "Riot quelled, no effect", "failureEffect": "+1 Unrest, 1 structure damaged", "criticalFailureExtra": "+1 Unrest, 1 structure destroyed"},
                {"skill": "diplomacy", "successEffect": "Negotiation succeeds, no effect", "failureEffect": "+1 Unrest, 1 structure damaged", "criticalFailureExtra": "+1 Unrest, 1 structure destroyed"},
                {"skill": "athletics", "successEffect": "Riot contained, no effect", "failureEffect": "+1 Unrest, 1 structure damaged", "criticalFailureExtra": "+1 Unrest, 1 structure destroyed"},
                {"skill": "medicine", "successEffect": "Injured treated, tensions ease, no effect", "failureEffect": "+1 Unrest, 1 structure damaged", "criticalFailureExtra": "+1 Unrest, 1 structure destroyed"}
            ]
        },
        {
            "id": "settlement-crisis",
            "name": "Settlement Crisis",
            "tier": "TURMOIL",
            "description": "An entire settlement faces economic or social collapse.",
            "percentileMin": 70,
            "percentileMax": 78,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Settlement stabilized, no effect", "failureEffect": "Random settlement loses 1d4 Gold OR 1 structure damaged", "criticalFailureExtra": "Random settlement loses one level (minimum 1), +1 unrest"},
                {"skill": "society", "successEffect": "Emergency aid effective, no effect", "failureEffect": "Random settlement loses 1d4 Gold OR 1 structure damaged", "criticalFailureExtra": "Random settlement loses one level (minimum 1), +1 unrest"},
                {"skill": "religion", "successEffect": "Hope restored, no effect", "failureEffect": "Random settlement loses 1d4 Gold OR 1 structure damaged", "criticalFailureExtra": "Random settlement loses one level (minimum 1), +1 unrest"}
            ]
        },
        {
            "id": "assassination-attempt",
            "name": "Assassination Attempt",
            "tier": "TURMOIL",
            "description": "An attempt is made on a kingdom leader's life.",
            "percentileMin": 79,
            "percentileMax": 87,
            "skillOptions": [
                {"skill": "athletics", "successEffect": "Assassination prevented, no effect", "failureEffect": "Leader escapes; +1 Unrest", "criticalFailureExtra": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"},
                {"skill": "medicine", "successEffect": "Wounds treated quickly, no effect", "failureEffect": "Leader escapes; +1 Unrest", "criticalFailureExtra": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"},
                {"skill": "stealth", "successEffect": "Assassin avoided, no effect", "failureEffect": "Leader escapes; +1 Unrest", "criticalFailureExtra": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"}
            ]
        },
        {
            "id": "turmoil-trade-embargo",
            "name": "Trade Embargo",
            "tier": "TURMOIL",
            "description": "Neighboring kingdoms impose trade restrictions.",
            "percentileMin": 88,
            "percentileMax": 93,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Trade continues, no effect", "failureEffect": "Lose 1d4 Gold OR 1d4+1 Resources", "criticalFailureExtra": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"},
                {"skill": "society", "successEffect": "Loopholes found, no effect", "failureEffect": "Lose 1d4 Gold OR 1d4+1 Resources", "criticalFailureExtra": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"},
                {"skill": "deception", "successEffect": "Smuggling routes established, no effect", "failureEffect": "Lose 1d4 Gold OR 1d4+1 Resources", "criticalFailureExtra": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"},
                {"skill": "occultism", "successEffect": "Trade routes divined, no effect", "failureEffect": "Lose 1d4 Gold OR 1d4+1 Resources", "criticalFailureExtra": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"}
            ]
        },
        {
            "id": "mass-exodus",
            "name": "Mass Exodus",
            "tier": "TURMOIL",
            "description": "Large numbers of citizens flee the kingdom.",
            "percentileMin": 94,
            "percentileMax": 100,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Population remains, no effect", "failureEffect": "Lose 1 worksite permanently, +1 Unrest", "criticalFailureExtra": "Lose 1 worksite permanently, +1 Unrest, -1 Fame"},
                {"skill": "performance", "successEffect": "Hope inspired, no effect", "failureEffect": "Lose 1 worksite permanently, +1 Unrest", "criticalFailureExtra": "Lose 1 worksite permanently, +1 Unrest, -1 Fame"},
                {"skill": "religion", "successEffect": "Spiritual guidance works, no effect", "failureEffect": "Lose 1 worksite permanently, +1 Unrest", "criticalFailureExtra": "Lose 1 worksite permanently, +1 Unrest, -1 Fame"}
            ]
        }
    ],
    "rebellion": [
        {
            "id": "guerrilla-movement",
            "name": "Guerrilla Movement",
            "tier": "REBELLION",
            "description": "Armed rebels begin guerrilla warfare against the kingdom.",
            "percentileMin": 11,
            "percentileMax": 17,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Rebellion dispersed", "failureEffect": "Rebels seize 1d3 hexes", "criticalFailureExtra": "Rebels seize 2d3 hexes and gain an army"},
                {"skill": "intimidation", "successEffect": "Rebellion crushed", "failureEffect": "Rebels seize 1d3 hexes", "criticalFailureExtra": "Rebels seize 2d3 hexes and gain an army"},
                {"skill": "society", "successEffect": "Grievances addressed", "failureEffect": "Rebels seize 1d3 hexes", "criticalFailureExtra": "Rebels seize 2d3 hexes and gain an army"},
                {"skill": "religion", "successEffect": "Faith unites kingdom", "failureEffect": "Rebels seize 1d3 hexes", "criticalFailureExtra": "Rebels seize 2d3 hexes and gain an army"}
            ]
        },
        {
            "id": "mass-desertion-threat",
            "name": "Mass Desertion Threat",
            "tier": "REBELLION",
            "description": "Military forces threaten to desert or mutiny.",
            "percentileMin": 18,
            "percentileMax": 24,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Troops remain loyal, no effect", "failureEffect": "1 army makes morale check, highest tier military structure damaged", "criticalFailureExtra": "2 armies make morale checks, highest tier military structure destroyed"},
                {"skill": "intimidation", "successEffect": "Deserters threatened into compliance, no effect", "failureEffect": "1 army makes morale check, highest tier military structure damaged", "criticalFailureExtra": "2 armies make morale checks, highest tier military structure destroyed"},
                {"skill": "performance", "successEffect": "Loyalty inspired, no effect", "failureEffect": "1 army makes morale check, highest tier military structure damaged", "criticalFailureExtra": "2 armies make morale checks, highest tier military structure destroyed"}
            ]
        },
        {
            "id": "rebellion-trade-embargo",
            "name": "Trade Embargo",
            "tier": "REBELLION",
            "description": "Complete trade blockade by neighboring kingdoms.",
            "percentileMin": 25,
            "percentileMax": 31,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Trade continues, no effect", "failureEffect": "Lose 2d4 Gold OR 2d4+1 Resources", "criticalFailureExtra": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"},
                {"skill": "society", "successEffect": "Loopholes exploited, no effect", "failureEffect": "Lose 2d4 Gold OR 2d4+1 Resources", "criticalFailureExtra": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"},
                {"skill": "deception", "successEffect": "Smuggling network established, no effect", "failureEffect": "Lose 2d4 Gold OR 2d4+1 Resources", "criticalFailureExtra": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"},
                {"skill": "arcana", "successEffect": "Teleportation network created, no effect", "failureEffect": "Lose 2d4 Gold OR 2d4+1 Resources", "criticalFailureExtra": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"}
            ]
        },
        {
            "id": "rebellion-settlement-crisis",
            "name": "Settlement Crisis",
            "tier": "REBELLION",
            "description": "A major settlement faces complete collapse.",
            "percentileMin": 32,
            "percentileMax": 38,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Settlement stabilized, no effect", "failureEffect": "Random settlement loses 2d4 Gold OR 2 structures damaged", "criticalFailureExtra": "Random settlement loses one level (minimum 1), 1 structure destroyed, +1 unrest"},
                {"skill": "society", "successEffect": "Emergency aid prevents collapse, no effect", "failureEffect": "Random settlement loses 2d4 Gold OR 2 structures damaged", "criticalFailureExtra": "Random settlement loses one level (minimum 1), 1 structure destroyed, +1 unrest"},
                {"skill": "religion", "successEffect": "Faith provides hope, no effect", "failureEffect": "Random settlement loses 2d4 Gold OR 2 structures damaged", "criticalFailureExtra": "Random settlement loses one level (minimum 1), 1 structure destroyed, +1 unrest"}
            ]
        },
        {
            "id": "international-scandal",
            "name": "International Scandal",
            "tier": "REBELLION",
            "description": "A major scandal damages the kingdom's international reputation.",
            "percentileMin": 39,
            "percentileMax": 45,
            "skillOptions": [
                {"skill": "performance", "successEffect": "Reputation maintained, no effect", "failureEffect": "Lose 1 Fame AND 1d4 gold", "criticalFailureExtra": "King has zero fame this round, lose 2d4 gold, +1 Unrest"},
                {"skill": "diplomacy", "successEffect": "Public relations managed, no effect", "failureEffect": "Lose 1 Fame AND 1d4 gold", "criticalFailureExtra": "King has zero fame this round, lose 2d4 gold, +1 Unrest"},
                {"skill": "deception", "successEffect": "Propaganda campaign succeeds, no effect", "failureEffect": "Lose 1 Fame AND 1d4 gold", "criticalFailureExtra": "King has zero fame this round, lose 2d4 gold, +1 Unrest"}
            ]
        },
        {
            "id": "prison-breaks",
            "name": "Prison Breaks",
            "tier": "REBELLION",
            "description": "Mass prison break threatens public safety.",
            "percentileMin": 46,
            "percentileMax": 52,
            "skillOptions": [
                {"skill": "intimidation", "successEffect": "Break prevented, no effect", "failureEffect": "Half imprisoned unrest becomes regular unrest, justice structure damaged", "criticalFailureExtra": "All imprisoned unrest becomes regular unrest, justice structure destroyed"},
                {"skill": "athletics", "successEffect": "Prisoners pursued and caught, no effect", "failureEffect": "Half imprisoned unrest becomes regular unrest, justice structure damaged", "criticalFailureExtra": "All imprisoned unrest becomes regular unrest, justice structure destroyed"},
                {"skill": "society", "successEffect": "Negotiation prevents break, no effect", "failureEffect": "Half imprisoned unrest becomes regular unrest, justice structure damaged", "criticalFailureExtra": "All imprisoned unrest becomes regular unrest, justice structure destroyed"}
            ]
        },
        {
            "id": "noble-conspiracy",
            "name": "Noble Conspiracy",
            "tier": "REBELLION",
            "description": "Nobles plot against the throne.",
            "percentileMin": 53,
            "percentileMax": 59,
            "skillOptions": [
                {"skill": "stealth", "successEffect": "Conspiracy exposed and dealt with, no effect", "failureEffect": "Lose 1d4 Gold, -1 fame", "criticalFailureExtra": "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"},
                {"skill": "intimidation", "successEffect": "Conspirators arrested, no effect", "failureEffect": "Lose 1d4 Gold, -1 fame", "criticalFailureExtra": "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"},
                {"skill": "society", "successEffect": "Political maneuvering succeeds, no effect", "failureEffect": "Lose 1d4 Gold, -1 fame", "criticalFailureExtra": "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"},
                {"skill": "occultism", "successEffect": "Truth divined, conspiracy prevented, no effect", "failureEffect": "Lose 1d4 Gold, -1 fame", "criticalFailureExtra": "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"}
            ]
        },
        {
            "id": "economic-crash",
            "name": "Economic Crash",
            "tier": "REBELLION",
            "description": "Complete economic collapse threatens the kingdom.",
            "percentileMin": 60,
            "percentileMax": 66,
            "skillOptions": [
                {"skill": "society", "successEffect": "Economy stabilized, no effect", "failureEffect": "Lose 2d6 gold, highest tier commerce structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier commerce structure destroyed"},
                {"skill": "diplomacy", "successEffect": "Loans secured, no effect", "failureEffect": "Lose 2d6 gold, highest tier commerce structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier commerce structure destroyed"},
                {"skill": "crafting", "successEffect": "Production boosted, no effect", "failureEffect": "Lose 2d6 gold, highest tier commerce structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier commerce structure destroyed"},
                {"skill": "arcana", "successEffect": "Resources transmuted, no effect", "failureEffect": "Lose 2d6 gold, highest tier commerce structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier commerce structure destroyed"}
            ]
        },
        {
            "id": "religious-schism",
            "name": "Religious Schism",
            "tier": "REBELLION",
            "description": "Religious factions threaten to split the kingdom.",
            "percentileMin": 67,
            "percentileMax": 73,
            "skillOptions": [
                {"skill": "religion", "successEffect": "Schism averted, no effect", "failureEffect": "Lose 2d6 gold, highest tier religious structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier religious structure destroyed"},
                {"skill": "diplomacy", "successEffect": "Factions mediated, no effect", "failureEffect": "Lose 2d6 gold, highest tier religious structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier religious structure destroyed"},
                {"skill": "occultism", "successEffect": "Divine intervention succeeds, no effect", "failureEffect": "Lose 2d6 gold, highest tier religious structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier religious structure destroyed"},
                {"skill": "society", "successEffect": "Secular compromise found, no effect", "failureEffect": "Lose 2d6 gold, highest tier religious structure damaged", "criticalFailureExtra": "Lose 4d6 gold, highest tier religious structure destroyed"}
            ]
        },
        {
            "id": "border-raid",
            "name": "Border Raid",
            "tier": "REBELLION",
            "description": "Enemy forces raid the kingdom's borders.",
            "percentileMin": 74,
            "percentileMax": 80,
            "skillOptions": [
                {"skill": "athletics", "successEffect": "Raiders repelled, no effect", "failureEffect": "Lose 1 border hex permanently, lose 1d4 Gold", "criticalFailureExtra": "Lose 1d3 border hexes permanently, lose 2d4 Gold"},
                {"skill": "intimidation", "successEffect": "Retaliation deters raiders, no effect", "failureEffect": "Lose 1 border hex permanently, lose 1d4 Gold", "criticalFailureExtra": "Lose 1d3 border hexes permanently, lose 2d4 Gold"},
                {"skill": "survival", "successEffect": "Raiders tracked and stopped, no effect", "failureEffect": "Lose 1 border hex permanently, lose 1d4 Gold", "criticalFailureExtra": "Lose 1d3 border hexes permanently, lose 2d4 Gold"},
                {"skill": "nature", "successEffect": "Terrain used defensively, no effect", "failureEffect": "Lose 1 border hex permanently, lose 1d4 Gold", "criticalFailureExtra": "Lose 1d3 border hexes permanently, lose 2d4 Gold"}
            ]
        },
        {
            "id": "secession-crisis",
            "name": "Secession Crisis",
            "tier": "REBELLION",
            "description": "A settlement declares independence from the kingdom.",
            "percentileMin": 81,
            "percentileMax": 87,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Independence movement quelled, no effect", "failureEffect": "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold", "criticalFailureExtra": "Settlement declares independence with all adjacent hexes, +2 Unrest"},
                {"skill": "intimidation", "successEffect": "Movement suppressed, no effect", "failureEffect": "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold", "criticalFailureExtra": "Settlement declares independence with all adjacent hexes, +2 Unrest"},
                {"skill": "society", "successEffect": "Grievances addressed, no effect", "failureEffect": "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold", "criticalFailureExtra": "Settlement declares independence with all adjacent hexes, +2 Unrest"},
                {"skill": "performance", "successEffect": "Loyalty inspired, no effect", "failureEffect": "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold", "criticalFailureExtra": "Settlement declares independence with all adjacent hexes, +2 Unrest"}
            ]
        },
        {
            "id": "international-crisis",
            "name": "International Crisis",
            "tier": "REBELLION",
            "description": "Multiple kingdoms turn against you due to internal chaos.",
            "percentileMin": 88,
            "percentileMax": 100,
            "skillOptions": [
                {"skill": "diplomacy", "successEffect": "Crisis contained, no effect", "failureEffect": "One kingdom's attitude worsens by 2 steps", "criticalFailureExtra": "Two kingdoms' attitudes worsen by 2 steps, -1 fame"},
                {"skill": "deception", "successEffect": "Blame shifted, no effect", "failureEffect": "One kingdom's attitude worsens by 2 steps", "criticalFailureExtra": "Two kingdoms' attitudes worsen by 2 steps, -1 fame"},
                {"skill": "society", "successEffect": "Formal reparations accepted, no effect", "failureEffect": "One kingdom's attitude worsens by 2 steps", "criticalFailureExtra": "Two kingdoms' attitudes worsen by 2 steps, -1 fame"},
                {"skill": "performance", "successEffect": "Public relations campaign succeeds, no effect", "failureEffect": "One kingdom's attitude worsens by 2 steps", "criticalFailureExtra": "Two kingdoms' attitudes worsen by 2 steps, -1 fame"}
            ]
        }
    ]
}

# Create all incident files
for tier, tier_incidents in incidents.items():
    for incident in tier_incidents:
        path = f"data/incidents/{tier}/{incident['id']}.json"
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Write the JSON file
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(incident, f, indent=2)
        
        print(f"Created: {path}")

print("\nAll incident files have been created successfully!")
print("Total files created:", sum(len(v) for v in incidents.values()))
