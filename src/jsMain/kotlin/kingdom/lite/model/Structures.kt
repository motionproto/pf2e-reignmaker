package kingdom.lite.model

/**
 * Data model for Kingdom Structures based on Reignmaker Lite rules
 */

/**
 * Categories of structures
 */
enum class StructureCategory(val displayName: String) {
    // Skill-based categories
    CRIME_INTRIGUE("Crime & Intrigue"),
    CIVIC_GOVERNANCE("Civic & Governance"),
    MILITARY_TRAINING("Military & Training"),
    CRAFTING_TRADE("Crafting & Trade"),
    KNOWLEDGE_MAGIC("Knowledge & Magic"),
    FAITH_NATURE("Faith & Nature"),
    MEDICINE_HEALING("Medicine & Healing"),
    PERFORMANCE_CULTURE("Performance & Culture"),
    EXPLORATION_WILDERNESS("Exploration & Wilderness"),
    
    // Support categories
    FOOD_STORAGE("Food Storage"),
    FORTIFICATIONS("Fortifications"),
    LOGISTICS("Logistics"),
    COMMERCE("Commerce"),
    CULTURE("Culture"),
    REVENUE("Revenue"),
    JUSTICE("Justice"),
    DIPLOMACY("Diplomacy")
}

/**
 * Skills that can be used with structures
 */
enum class StructureSkill(val displayName: String) {
    // Core skills
    THIEVERY("Thievery"),
    DECEPTION("Deception"),
    STEALTH("Stealth"),
    SOCIETY("Society"),
    DIPLOMACY("Diplomacy"),
    ATHLETICS("Athletics"),
    ACROBATICS("Acrobatics"),
    INTIMIDATION("Intimidation"),
    CRAFTING("Crafting"),
    LORE("Lore"),
    ARCANA("Arcana"),
    OCCULTISM("Occultism"),
    RELIGION("Religion"),
    MEDICINE("Medicine"),
    NATURE("Nature"),
    PERFORMANCE("Performance"),
    SURVIVAL("Survival")
}

/**
 * Base class for all structure effects
 */
sealed class StructureEffect {
    abstract val description: String
}

/**
 * Provides an income level bonus for earn income actions
 */
data class EarnIncomeEffect(
    val levelBonus: Int, // 0, 2, 4, or 6 based on tier
    override val description: String
) : StructureEffect()

/**
 * Provides a circumstance bonus to skill checks
 */
data class SkillBonusEffect(
    val bonus: Int, // 0, 1, 2, or 3 based on tier
    val skills: List<StructureSkill>,
    override val description: String
) : StructureEffect()

/**
 * Allows one reroll per turn on failed skill checks
 */
data class RerollEffect(
    val usesPerTurn: Int = 1,
    override val description: String = "Reroll 1 failed skill check per turn"
) : StructureEffect()

/**
 * Provides storage capacity for resources
 */
data class StorageEffect(
    val foodCapacity: Int = 0,
    val lumberCapacity: Int = 0,
    val stoneCapacity: Int = 0,
    val oreCapacity: Int = 0,
    override val description: String
) : StructureEffect()

/**
 * Provides defensive bonuses
 */
data class DefenseEffect(
    val acBonus: Int,
    val effectiveLevelBonus: Int,
    val specialDefense: String? = null,
    override val description: String
) : StructureEffect()

/**
 * Increases military unit capacity
 */
data class MilitaryCapacityEffect(
    val additionalUnits: Int,
    override val description: String
) : StructureEffect()

/**
 * Provides gold income per turn
 */
data class GoldIncomeEffect(
    val goldPerTurn: Int,
    override val description: String
) : StructureEffect()

/**
 * Reduces unrest per turn
 */
data class UnrestReductionEffect(
    val unrestReduction: Int,
    override val description: String
) : StructureEffect()

/**
 * Provides fame per turn
 */
data class FameEffect(
    val famePerTurn: Int,
    override val description: String
) : StructureEffect()

/**
 * Enables trade with different conversion rates
 */
data class TradeEffect(
    val sellRatio: Pair<Int, Int>? = null, // e.g. 3 to 2 means 3 resources for 2 gold
    val buyRatio: Pair<Int, Int>? = null,  // e.g. 1 to 1 means 1 gold for 1 resource
    val enablesPurchasing: String? = null, // "non-magical", "consumables", "magical"
    override val description: String
) : StructureEffect()

/**
 * Holds imprisoned unrest
 */
data class ImprisonmentEffect(
    val capacity: Int,
    val allowsExecute: Boolean = true,
    val allowsPardon: Boolean = false,
    val autoConvert: Boolean = false, // T4 Donjon can convert 1 unrest per turn
    override val description: String
) : StructureEffect()

/**
 * Diplomatic relationship capacity
 */
data class DiplomaticEffect(
    val helpfulRelationships: Int,
    override val description: String
) : StructureEffect()

/**
 * Represents a single structure that can be built
 */
data class Structure(
    val id: String,
    val name: String,
    val category: StructureCategory,
    val tier: Int, // 1-4
    val description: String,
    val cost: Map<String, Int>, // Resource costs (lumber, stone, ore)
    val skillsSupported: List<StructureSkill> = emptyList(),
    val effects: List<StructureEffect> = emptyList(),
    val upgradesFrom: String? = null, // ID of the structure this upgrades from
    val settlementTierRequired: SettlementTier,
    val special: String? = null // Special rules or notes
)

/**
 * Data object containing all structure definitions
 */
object StructuresData {
    
    /**
     * Get all skill-based structures
     */
    fun getSkillStructures(): List<Structure> {
        return listOf(
            // Crime & Intrigue structures
            Structure(
                id = "rats_warren",
                name = "Rats' Warren",
                category = StructureCategory.CRIME_INTRIGUE,
                tier = 1,
                description = "A network of underground tunnels and hideouts for thieves",
                cost = mapOf("lumber" to 2),
                skillsSupported = listOf(StructureSkill.THIEVERY),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "smugglers_den",
                name = "Smugglers' Den",
                category = StructureCategory.CRIME_INTRIGUE,
                tier = 2,
                description = "A secret warehouse for contraband and illicit trade",
                cost = mapOf("lumber" to 2, "stone" to 2),
                skillsSupported = listOf(StructureSkill.THIEVERY, StructureSkill.DECEPTION),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.THIEVERY, StructureSkill.DECEPTION), "+1 to Thievery and Deception")
                ),
                upgradesFrom = "rats_warren",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "thieves_guild",
                name = "Thieves' Guild",
                category = StructureCategory.CRIME_INTRIGUE,
                tier = 3,
                description = "An organized criminal syndicate with extensive reach",
                cost = mapOf("lumber" to 2, "stone" to 3, "ore" to 3),
                skillsSupported = listOf(StructureSkill.THIEVERY, StructureSkill.DECEPTION, StructureSkill.STEALTH),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.THIEVERY, StructureSkill.DECEPTION, StructureSkill.STEALTH), 
                        "+2 to Thievery, Deception, and Stealth")
                ),
                upgradesFrom = "smugglers_den",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "shadow_network",
                name = "Shadow Network",
                category = StructureCategory.CRIME_INTRIGUE,
                tier = 4,
                description = "A vast network of spies and thieves spanning the kingdom",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                skillsSupported = listOf(StructureSkill.THIEVERY, StructureSkill.DECEPTION, StructureSkill.STEALTH),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.THIEVERY, StructureSkill.DECEPTION, StructureSkill.STEALTH), 
                        "+3 to Thievery, Deception, and Stealth"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "thieves_guild",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Civic & Governance structures
            Structure(
                id = "town_hall",
                name = "Town Hall",
                category = StructureCategory.CIVIC_GOVERNANCE,
                tier = 1,
                description = "A modest administrative building for local governance",
                cost = mapOf("stone" to 2),
                skillsSupported = listOf(StructureSkill.SOCIETY),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "city_hall",
                name = "City Hall",
                category = StructureCategory.CIVIC_GOVERNANCE,
                tier = 2,
                description = "A larger administrative complex with diplomatic facilities",
                cost = mapOf("lumber" to 2, "stone" to 2),
                skillsSupported = listOf(StructureSkill.SOCIETY, StructureSkill.DIPLOMACY),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.SOCIETY, StructureSkill.DIPLOMACY), "+1 to Society and Diplomacy")
                ),
                upgradesFrom = "town_hall",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "diplomatic_quarter",
                name = "Diplomatic Quarter",
                category = StructureCategory.CIVIC_GOVERNANCE,
                tier = 3,
                description = "Embassies and meeting halls for international relations",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                skillsSupported = listOf(StructureSkill.SOCIETY, StructureSkill.DIPLOMACY, StructureSkill.DECEPTION),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.SOCIETY, StructureSkill.DIPLOMACY, StructureSkill.DECEPTION), 
                        "+2 to Society, Diplomacy, and Deception")
                ),
                upgradesFrom = "city_hall",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "grand_forum",
                name = "Grand Forum",
                category = StructureCategory.CIVIC_GOVERNANCE,
                tier = 4,
                description = "A magnificent center of governance and public discourse",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                skillsSupported = listOf(StructureSkill.SOCIETY, StructureSkill.DIPLOMACY, StructureSkill.DECEPTION),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.SOCIETY, StructureSkill.DIPLOMACY, StructureSkill.DECEPTION), 
                        "+3 to Society, Diplomacy, and Deception"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "diplomatic_quarter",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Military & Training structures
            Structure(
                id = "gymnasium",
                name = "Gymnasium",
                category = StructureCategory.MILITARY_TRAINING,
                tier = 1,
                description = "A basic training ground for physical fitness",
                cost = mapOf("lumber" to 2),
                skillsSupported = listOf(StructureSkill.ATHLETICS),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "training_yard",
                name = "Training Yard",
                category = StructureCategory.MILITARY_TRAINING,
                tier = 2,
                description = "An expanded facility for combat and athletic training",
                cost = mapOf("lumber" to 2, "stone" to 2),
                skillsSupported = listOf(StructureSkill.ATHLETICS, StructureSkill.ACROBATICS),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.ATHLETICS, StructureSkill.ACROBATICS), 
                        "+1 to Athletics and Acrobatics")
                ),
                upgradesFrom = "gymnasium",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "warriors_hall",
                name = "Warrior's Hall",
                category = StructureCategory.MILITARY_TRAINING,
                tier = 3,
                description = "A prestigious training facility for elite warriors",
                cost = mapOf("lumber" to 2, "stone" to 3, "ore" to 3),
                skillsSupported = listOf(StructureSkill.ATHLETICS, StructureSkill.ACROBATICS, StructureSkill.INTIMIDATION),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.ATHLETICS, StructureSkill.ACROBATICS, StructureSkill.INTIMIDATION), 
                        "+2 to Athletics, Acrobatics, and Intimidation")
                ),
                upgradesFrom = "training_yard",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "military_academy",
                name = "Military Academy",
                category = StructureCategory.MILITARY_TRAINING,
                tier = 4,
                description = "The kingdom's premier institution for military excellence",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                skillsSupported = listOf(StructureSkill.ATHLETICS, StructureSkill.ACROBATICS, StructureSkill.INTIMIDATION),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.ATHLETICS, StructureSkill.ACROBATICS, StructureSkill.INTIMIDATION), 
                        "+3 to Athletics, Acrobatics, and Intimidation"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "warriors_hall",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Crafting & Trade structures
            Structure(
                id = "workshop",
                name = "Workshop",
                category = StructureCategory.CRAFTING_TRADE,
                tier = 1,
                description = "A small workshop for artisans and crafters",
                cost = mapOf("lumber" to 2),
                skillsSupported = listOf(StructureSkill.CRAFTING),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "artisans_hall",
                name = "Artisan's Hall",
                category = StructureCategory.CRAFTING_TRADE,
                tier = 2,
                description = "A guildhall for skilled artisans and their apprentices",
                cost = mapOf("lumber" to 2, "stone" to 2),
                skillsSupported = listOf(StructureSkill.CRAFTING, StructureSkill.LORE),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.CRAFTING, StructureSkill.LORE), "+1 to Crafting and Lore")
                ),
                upgradesFrom = "workshop",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "blacksmiths_guild",
                name = "Blacksmiths' Guild",
                category = StructureCategory.CRAFTING_TRADE,
                tier = 3,
                description = "A powerful guild controlling metalwork and smithing",
                cost = mapOf("lumber" to 2, "stone" to 2, "ore" to 4),
                skillsSupported = listOf(StructureSkill.CRAFTING, StructureSkill.LORE, StructureSkill.SOCIETY),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.CRAFTING, StructureSkill.LORE, StructureSkill.SOCIETY), 
                        "+2 to Crafting, Lore, and Society")
                ),
                upgradesFrom = "artisans_hall",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "masterworks_foundry",
                name = "Masterworks Foundry",
                category = StructureCategory.CRAFTING_TRADE,
                tier = 4,
                description = "The pinnacle of craftsmanship and metalworking",
                cost = mapOf("lumber" to 4, "stone" to 4, "ore" to 8),
                skillsSupported = listOf(StructureSkill.CRAFTING, StructureSkill.LORE, StructureSkill.SOCIETY),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.CRAFTING, StructureSkill.LORE, StructureSkill.SOCIETY), 
                        "+3 to Crafting, Lore, and Society"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "blacksmiths_guild",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Knowledge & Magic structures
            Structure(
                id = "scholars_table",
                name = "Scholars' Table",
                category = StructureCategory.KNOWLEDGE_MAGIC,
                tier = 1,
                description = "A small gathering place for scholars and scribes",
                cost = mapOf("stone" to 2),
                skillsSupported = listOf(StructureSkill.LORE),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "library",
                name = "Library",
                category = StructureCategory.KNOWLEDGE_MAGIC,
                tier = 2,
                description = "A repository of books and arcane knowledge",
                cost = mapOf("lumber" to 1, "stone" to 3),
                skillsSupported = listOf(StructureSkill.LORE, StructureSkill.ARCANA),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.LORE, StructureSkill.ARCANA), "+1 to Lore and Arcana")
                ),
                upgradesFrom = "scholars_table",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "university",
                name = "University",
                category = StructureCategory.KNOWLEDGE_MAGIC,
                tier = 3,
                description = "A center of higher learning and magical research",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                skillsSupported = listOf(StructureSkill.LORE, StructureSkill.ARCANA, StructureSkill.OCCULTISM),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.LORE, StructureSkill.ARCANA, StructureSkill.OCCULTISM), 
                        "+2 to Lore, Arcana, and Occultism")
                ),
                upgradesFrom = "library",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "arcane_academy",
                name = "Arcane Academy",
                category = StructureCategory.KNOWLEDGE_MAGIC,
                tier = 4,
                description = "The most prestigious institution of magical learning",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                skillsSupported = listOf(StructureSkill.LORE, StructureSkill.ARCANA, StructureSkill.OCCULTISM),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.LORE, StructureSkill.ARCANA, StructureSkill.OCCULTISM), 
                        "+3 to Lore, Arcana, and Occultism"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "university",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Faith & Nature structures
            Structure(
                id = "shrine",
                name = "Shrine",
                category = StructureCategory.FAITH_NATURE,
                tier = 1,
                description = "A small place of worship and reflection",
                cost = mapOf("stone" to 2),
                skillsSupported = listOf(StructureSkill.RELIGION),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "temple",
                name = "Temple",
                category = StructureCategory.FAITH_NATURE,
                tier = 2,
                description = "A dedicated house of worship with healing facilities",
                cost = mapOf("lumber" to 1, "stone" to 3),
                skillsSupported = listOf(StructureSkill.RELIGION, StructureSkill.MEDICINE),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.RELIGION, StructureSkill.MEDICINE), 
                        "+1 to Religion and Medicine")
                ),
                upgradesFrom = "shrine",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "temple_district",
                name = "Temple District",
                category = StructureCategory.FAITH_NATURE,
                tier = 3,
                description = "Multiple temples serving various faiths and nature spirits",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                skillsSupported = listOf(StructureSkill.RELIGION, StructureSkill.MEDICINE, StructureSkill.NATURE),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.RELIGION, StructureSkill.MEDICINE, StructureSkill.NATURE), 
                        "+2 to Religion, Medicine, and Nature")
                ),
                upgradesFrom = "temple",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "grand_basilica",
                name = "Grand Basilica",
                category = StructureCategory.FAITH_NATURE,
                tier = 4,
                description = "A magnificent cathedral serving as spiritual center of the kingdom",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                skillsSupported = listOf(StructureSkill.RELIGION, StructureSkill.MEDICINE, StructureSkill.NATURE),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.RELIGION, StructureSkill.MEDICINE, StructureSkill.NATURE), 
                        "+3 to Religion, Medicine, and Nature"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "temple_district",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Medicine & Healing structures
            Structure(
                id = "healers_hut",
                name = "Healer's Hut",
                category = StructureCategory.MEDICINE_HEALING,
                tier = 1,
                description = "A small clinic for treating injuries and illness",
                cost = mapOf("lumber" to 2),
                skillsSupported = listOf(StructureSkill.MEDICINE),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "infirmary",
                name = "Infirmary",
                category = StructureCategory.MEDICINE_HEALING,
                tier = 2,
                description = "A larger medical facility with trained healers",
                cost = mapOf("lumber" to 1, "stone" to 3),
                skillsSupported = listOf(StructureSkill.MEDICINE, StructureSkill.LORE),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.MEDICINE, StructureSkill.LORE), "+1 to Medicine and Lore")
                ),
                upgradesFrom = "healers_hut",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "hospital",
                name = "Hospital",
                category = StructureCategory.MEDICINE_HEALING,
                tier = 3,
                description = "A comprehensive medical center with magical healing",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                skillsSupported = listOf(StructureSkill.MEDICINE, StructureSkill.LORE, StructureSkill.ARCANA),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.MEDICINE, StructureSkill.LORE, StructureSkill.ARCANA), 
                        "+2 to Medicine, Lore, and Arcana")
                ),
                upgradesFrom = "infirmary",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "medical_college",
                name = "Medical College",
                category = StructureCategory.MEDICINE_HEALING,
                tier = 4,
                description = "The kingdom's premier institution for medical knowledge",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                skillsSupported = listOf(StructureSkill.MEDICINE, StructureSkill.LORE, StructureSkill.ARCANA),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.MEDICINE, StructureSkill.LORE, StructureSkill.ARCANA), 
                        "+3 to Medicine, Lore, and Arcana"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "hospital",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Performance & Culture structures
            Structure(
                id = "buskers_alley",
                name = "Buskers' Alley",
                category = StructureCategory.PERFORMANCE_CULTURE,
                tier = 1,
                description = "Street corners where performers entertain for coin",
                cost = mapOf("lumber" to 2),
                skillsSupported = listOf(StructureSkill.PERFORMANCE),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "famous_tavern",
                name = "Famous Tavern",
                category = StructureCategory.PERFORMANCE_CULTURE,
                tier = 2,
                description = "A renowned establishment for entertainment and diplomacy",
                cost = mapOf("lumber" to 2, "stone" to 2),
                skillsSupported = listOf(StructureSkill.PERFORMANCE, StructureSkill.DIPLOMACY),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.PERFORMANCE, StructureSkill.DIPLOMACY), 
                        "+1 to Performance and Diplomacy")
                ),
                upgradesFrom = "buskers_alley",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "performance_hall",
                name = "Performance Hall",
                category = StructureCategory.PERFORMANCE_CULTURE,
                tier = 3,
                description = "A grand theater for performances and cultural events",
                cost = mapOf("lumber" to 4, "stone" to 2, "ore" to 2),
                skillsSupported = listOf(StructureSkill.PERFORMANCE, StructureSkill.DIPLOMACY, StructureSkill.LORE),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.PERFORMANCE, StructureSkill.DIPLOMACY, StructureSkill.LORE), 
                        "+2 to Performance, Diplomacy, and Lore")
                ),
                upgradesFrom = "famous_tavern",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "grand_amphitheater",
                name = "Grand Amphitheater",
                category = StructureCategory.PERFORMANCE_CULTURE,
                tier = 4,
                description = "A magnificent venue for the greatest performances",
                cost = mapOf("lumber" to 6, "stone" to 6, "ore" to 4),
                skillsSupported = listOf(StructureSkill.PERFORMANCE, StructureSkill.DIPLOMACY, StructureSkill.LORE),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.PERFORMANCE, StructureSkill.DIPLOMACY, StructureSkill.LORE), 
                        "+3 to Performance, Diplomacy, and Lore"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "performance_hall",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Exploration & Wilderness structures
            Structure(
                id = "hunters_lodge",
                name = "Hunter's Lodge",
                category = StructureCategory.EXPLORATION_WILDERNESS,
                tier = 1,
                description = "A gathering place for hunters and trackers",
                cost = mapOf("lumber" to 2),
                skillsSupported = listOf(StructureSkill.SURVIVAL),
                effects = listOf(
                    EarnIncomeEffect(0, "Earn Income at settlement level")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "rangers_outpost",
                name = "Ranger's Outpost",
                category = StructureCategory.EXPLORATION_WILDERNESS,
                tier = 2,
                description = "A frontier post for wilderness guides and scouts",
                cost = mapOf("lumber" to 2, "stone" to 2),
                skillsSupported = listOf(StructureSkill.SURVIVAL, StructureSkill.NATURE),
                effects = listOf(
                    EarnIncomeEffect(2, "Earn Income at settlement level + 2"),
                    SkillBonusEffect(1, listOf(StructureSkill.SURVIVAL, StructureSkill.NATURE), 
                        "+1 to Survival and Nature")
                ),
                upgradesFrom = "hunters_lodge",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "druids_grove",
                name = "Druids' Grove",
                category = StructureCategory.EXPLORATION_WILDERNESS,
                tier = 3,
                description = "A sacred grove where druids commune with nature",
                cost = mapOf("lumber" to 4, "stone" to 2, "ore" to 2),
                skillsSupported = listOf(StructureSkill.SURVIVAL, StructureSkill.NATURE, StructureSkill.STEALTH),
                effects = listOf(
                    EarnIncomeEffect(4, "Earn Income at settlement level + 4"),
                    SkillBonusEffect(2, listOf(StructureSkill.SURVIVAL, StructureSkill.NATURE, StructureSkill.STEALTH), 
                        "+2 to Survival, Nature, and Stealth")
                ),
                upgradesFrom = "rangers_outpost",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "wildskeepers_enclave",
                name = "Wildskeepers' Enclave",
                category = StructureCategory.EXPLORATION_WILDERNESS,
                tier = 4,
                description = "The ultimate sanctuary for those who protect the wild",
                cost = mapOf("lumber" to 6, "stone" to 6, "ore" to 4),
                skillsSupported = listOf(StructureSkill.SURVIVAL, StructureSkill.NATURE, StructureSkill.STEALTH),
                effects = listOf(
                    EarnIncomeEffect(6, "Earn Income at settlement level + 6"),
                    SkillBonusEffect(3, listOf(StructureSkill.SURVIVAL, StructureSkill.NATURE, StructureSkill.STEALTH), 
                        "+3 to Survival, Nature, and Stealth"),
                    RerollEffect(1, "Reroll 1 failed skill check per turn")
                ),
                upgradesFrom = "druids_grove",
                settlementTierRequired = SettlementTier.METROPOLIS
            )
        )
    }
    
    /**
     * Get all support structures
     */
    fun getSupportStructures(): List<Structure> {
        return listOf(
            // Food Storage structures
            Structure(
                id = "granary",
                name = "Granary",
                category = StructureCategory.FOOD_STORAGE,
                tier = 1,
                description = "Basic food storage facility",
                cost = mapOf("lumber" to 2),
                effects = listOf(
                    StorageEffect(foodCapacity = 4, description = "Store up to 4 Food")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "storehouses",
                name = "Storehouses",
                category = StructureCategory.FOOD_STORAGE,
                tier = 2,
                description = "Expanded storage for food and materials",
                cost = mapOf("lumber" to 2, "stone" to 2),
                effects = listOf(
                    StorageEffect(foodCapacity = 8, description = "Store up to 8 Food")
                ),
                upgradesFrom = "granary",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "warehouses",
                name = "Warehouses",
                category = StructureCategory.FOOD_STORAGE,
                tier = 3,
                description = "Large storage complex for all resources",
                cost = mapOf("lumber" to 3, "stone" to 3, "ore" to 2),
                effects = listOf(
                    StorageEffect(foodCapacity = 16, description = "Store up to 16 Food")
                ),
                upgradesFrom = "storehouses",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "strategic_reserves",
                name = "Strategic Reserves",
                category = StructureCategory.FOOD_STORAGE,
                tier = 4,
                description = "Massive storage with preservation magic",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                effects = listOf(
                    StorageEffect(foodCapacity = 36, description = "Store up to 36 Food")
                ),
                special = "Once per Kingdom Turn, roll flat check DC 15; on success, negate a spoilage/loss event affecting Food",
                upgradesFrom = "warehouses",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Fortifications structures
            Structure(
                id = "wooden_palisade",
                name = "Wooden Palisade",
                category = StructureCategory.FORTIFICATIONS,
                tier = 1,
                description = "Basic wooden defensive walls",
                cost = mapOf("lumber" to 2),
                effects = listOf(
                    DefenseEffect(1, 0, null, "Army AC +1")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "stone_walls",
                name = "Stone Walls",
                category = StructureCategory.FORTIFICATIONS,
                tier = 2,
                description = "Sturdy stone fortifications",
                cost = mapOf("lumber" to 1, "stone" to 3),
                effects = listOf(
                    DefenseEffect(1, 1, null, "Army AC +1, Effective Level +1")
                ),
                upgradesFrom = "wooden_palisade",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "fortified_walls",
                name = "Fortified Walls",
                category = StructureCategory.FORTIFICATIONS,
                tier = 3,
                description = "Reinforced walls with defensive towers",
                cost = mapOf("lumber" to 1, "stone" to 4, "ore" to 3),
                effects = listOf(
                    DefenseEffect(1, 2, null, "Army AC +1, Effective Level +2")
                ),
                upgradesFrom = "stone_walls",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "grand_battlements",
                name = "Grand Battlements",
                category = StructureCategory.FORTIFICATIONS,
                tier = 4,
                description = "Impregnable fortress walls",
                cost = mapOf("lumber" to 2, "stone" to 8, "ore" to 6),
                effects = listOf(
                    DefenseEffect(2, 3, "Defenders recover each turn with food", 
                        "Army AC +2, Effective Level +3")
                ),
                upgradesFrom = "fortified_walls",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Logistics structures
            Structure(
                id = "barracks",
                name = "Barracks",
                category = StructureCategory.LOGISTICS,
                tier = 1,
                description = "Basic military housing",
                cost = mapOf("stone" to 2),
                effects = listOf(
                    MilitaryCapacityEffect(1, "Settlement unit capacity +1")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "garrison",
                name = "Garrison",
                category = StructureCategory.LOGISTICS,
                tier = 2,
                description = "Expanded military quarters",
                cost = mapOf("lumber" to 1, "stone" to 3),
                effects = listOf(
                    MilitaryCapacityEffect(2, "Settlement unit capacity +2")
                ),
                upgradesFrom = "barracks",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "fortress",
                name = "Fortress",
                category = StructureCategory.LOGISTICS,
                tier = 3,
                description = "Fortified military complex",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                effects = listOf(
                    MilitaryCapacityEffect(3, "Settlement unit capacity +3")
                ),
                upgradesFrom = "garrison",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "citadel",
                name = "Citadel",
                category = StructureCategory.LOGISTICS,
                tier = 4,
                description = "Supreme military stronghold",
                cost = mapOf("lumber" to 2, "stone" to 8, "ore" to 6),
                effects = listOf(
                    MilitaryCapacityEffect(4, "Settlement unit capacity +4"),
                    UnrestReductionEffect(1, "Reduce Unrest by 1 each turn")
                ),
                upgradesFrom = "fortress",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Commerce structures
            Structure(
                id = "market_square",
                name = "Market Square",
                category = StructureCategory.COMMERCE,
                tier = 1,
                description = "Basic marketplace for trade",
                cost = mapOf("lumber" to 2),
                effects = listOf(
                    TradeEffect(Pair(2, 1), null, "non-magical", 
                        "Sell surplus at 2:1, purchase non-magical items")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "bazaar",
                name = "Bazaar",
                category = StructureCategory.COMMERCE,
                tier = 2,
                description = "Expanded marketplace with exotic goods",
                cost = mapOf("lumber" to 2, "stone" to 2),
                effects = listOf(
                    TradeEffect(Pair(2, 1), null, "consumables", 
                        "Purchase scrolls and consumables")
                ),
                upgradesFrom = "market_square",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "merchant_guild",
                name = "Merchant Guild",
                category = StructureCategory.COMMERCE,
                tier = 3,
                description = "Powerful trade organization",
                cost = mapOf("lumber" to 3, "stone" to 3, "ore" to 2),
                effects = listOf(
                    TradeEffect(Pair(3, 2), null, "magical", 
                        "Sell surplus at 3:2, purchase magical items"),
                    GoldIncomeEffect(1, "+1 Gold per turn")
                ),
                upgradesFrom = "bazaar",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "imperial_bank",
                name = "Imperial Bank",
                category = StructureCategory.COMMERCE,
                tier = 4,
                description = "Central banking and trade hub",
                cost = mapOf("lumber" to 4, "stone" to 4, "ore" to 8),
                effects = listOf(
                    TradeEffect(Pair(1, 1), Pair(1, 1), "magical", 
                        "Sell surplus at 1:1"),
                    GoldIncomeEffect(2, "+2 Gold per turn")
                ),
                upgradesFrom = "merchant_guild",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Culture structures
            Structure(
                id = "open_stage",
                name = "Open Stage",
                category = StructureCategory.CULTURE,
                tier = 1,
                description = "Simple performance space",
                cost = mapOf("lumber" to 2),
                effects = listOf(
                    SkillBonusEffect(1, listOf(StructureSkill.PERFORMANCE), 
                        "+1 to checks to reduce Unrest")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "amphitheater",
                name = "Amphitheater",
                category = StructureCategory.CULTURE,
                tier = 2,
                description = "Outdoor theater venue",
                cost = mapOf("lumber" to 3, "stone" to 1),
                effects = listOf(
                    SkillBonusEffect(2, listOf(StructureSkill.PERFORMANCE), 
                        "+2 to checks to reduce Unrest")
                ),
                upgradesFrom = "open_stage",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "playhouse",
                name = "Playhouse",
                category = StructureCategory.CULTURE,
                tier = 3,
                description = "Dedicated theater building",
                cost = mapOf("lumber" to 4, "stone" to 3, "ore" to 1),
                effects = listOf(
                    SkillBonusEffect(2, listOf(StructureSkill.PERFORMANCE), 
                        "+2 to checks to reduce Unrest")
                ),
                upgradesFrom = "amphitheater",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "auditorium",
                name = "Auditorium",
                category = StructureCategory.CULTURE,
                tier = 4,
                description = "Grand cultural center",
                cost = mapOf("lumber" to 6, "stone" to 6, "ore" to 4),
                effects = listOf(
                    FameEffect(1, "+1 Fame per turn"),
                    UnrestReductionEffect(1, "Reduce Unrest by 1 each turn"),
                    SkillBonusEffect(2, listOf(StructureSkill.PERFORMANCE), 
                        "+2 to checks to reduce Unrest")
                ),
                upgradesFrom = "playhouse",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Revenue structures
            Structure(
                id = "tax_office",
                name = "Tax Office",
                category = StructureCategory.REVENUE,
                tier = 1,
                description = "Basic tax collection",
                cost = mapOf("stone" to 2),
                effects = listOf(
                    GoldIncomeEffect(1, "+1 Gold per turn")
                ),
                special = "Only one Taxation structure may exist in the kingdom at a time",
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "counting_house",
                name = "Counting House",
                category = StructureCategory.REVENUE,
                tier = 2,
                description = "Advanced financial management",
                cost = mapOf("lumber" to 1, "stone" to 3),
                effects = listOf(
                    GoldIncomeEffect(2, "+2 Gold per turn")
                ),
                special = "Only one Taxation structure may exist in the kingdom at a time. Enables Personal Income action",
                upgradesFrom = "tax_office",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "treasury",
                name = "Treasury",
                category = StructureCategory.REVENUE,
                tier = 3,
                description = "Royal treasury and mint",
                cost = mapOf("lumber" to 2, "stone" to 5, "ore" to 1),
                effects = listOf(
                    GoldIncomeEffect(4, "+4 Gold per turn")
                ),
                special = "Only one Taxation structure may exist in the kingdom at a time. Personal Income (T3)",
                upgradesFrom = "counting_house",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "exchequer",
                name = "Exchequer",
                category = StructureCategory.REVENUE,
                tier = 4,
                description = "Supreme financial authority",
                cost = mapOf("lumber" to 3, "stone" to 9, "ore" to 4),
                effects = listOf(
                    GoldIncomeEffect(8, "+8 Gold per turn")
                ),
                special = "Only one Taxation structure may exist in the kingdom at a time. Personal Income (T4)",
                upgradesFrom = "treasury",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Justice structures
            Structure(
                id = "stocks",
                name = "Stocks",
                category = StructureCategory.JUSTICE,
                tier = 1,
                description = "Public punishment device",
                cost = mapOf("stone" to 2),
                effects = listOf(
                    ImprisonmentEffect(1, true, false, false, 
                        "Hold 1 imprisoned Unrest, Execute only")
                ),
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "jail",
                name = "Jail",
                category = StructureCategory.JUSTICE,
                tier = 2,
                description = "Small detention facility",
                cost = mapOf("lumber" to 2, "stone" to 2),
                effects = listOf(
                    ImprisonmentEffect(2, true, false, false, 
                        "Hold 2 imprisoned Unrest, Execute only")
                ),
                upgradesFrom = "stocks",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "prison",
                name = "Prison",
                category = StructureCategory.JUSTICE,
                tier = 3,
                description = "Secure detention complex",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                effects = listOf(
                    ImprisonmentEffect(4, true, true, false, 
                        "Hold 4 imprisoned Unrest, Execute or Pardon")
                ),
                upgradesFrom = "jail",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "donjon",
                name = "Donjon",
                category = StructureCategory.JUSTICE,
                tier = 4,
                description = "Impregnable dungeon complex",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                effects = listOf(
                    ImprisonmentEffect(8, true, true, true, 
                        "Hold 8 imprisoned Unrest, Execute or Pardon")
                ),
                special = "Once per turn, can convert 1 regular Unrest to imprisoned Unrest without an action",
                upgradesFrom = "prison",
                settlementTierRequired = SettlementTier.METROPOLIS
            ),
            
            // Diplomacy structures
            Structure(
                id = "envoys_office",
                name = "Envoy's Office",
                category = StructureCategory.DIPLOMACY,
                tier = 1,
                description = "Basic diplomatic facilities",
                cost = mapOf("stone" to 2),
                effects = listOf(
                    DiplomaticEffect(1, "+1 Helpful relationship capacity")
                ),
                special = "Enables 'Establish Diplomatic Relations' action",
                settlementTierRequired = SettlementTier.VILLAGE
            ),
            Structure(
                id = "embassy",
                name = "Embassy",
                category = StructureCategory.DIPLOMACY,
                tier = 2,
                description = "Foreign diplomatic mission",
                cost = mapOf("lumber" to 2, "stone" to 2),
                effects = listOf(
                    DiplomaticEffect(2, "+2 Helpful relationship capacity")
                ),
                upgradesFrom = "envoys_office",
                settlementTierRequired = SettlementTier.TOWN
            ),
            Structure(
                id = "grand_embassy",
                name = "Grand Embassy",
                category = StructureCategory.DIPLOMACY,
                tier = 3,
                description = "Major diplomatic complex",
                cost = mapOf("lumber" to 2, "stone" to 4, "ore" to 2),
                effects = listOf(
                    DiplomaticEffect(3, "+3 Helpful relationship capacity"),
                    FameEffect(1, "+1 Fame")
                ),
                upgradesFrom = "embassy",
                settlementTierRequired = SettlementTier.CITY
            ),
            Structure(
                id = "diplomatic_quarter_support",
                name = "Diplomatic Quarter",
                category = StructureCategory.DIPLOMACY,
                tier = 4,
                description = "International relations district",
                cost = mapOf("lumber" to 4, "stone" to 6, "ore" to 6),
                effects = listOf(
                    DiplomaticEffect(4, "+4 Helpful relationship capacity"),
                    FameEffect(1, "+1 Fame"),
                    UnrestReductionEffect(1, "-1 Unrest each turn")
                ),
                upgradesFrom = "grand_embassy",
                settlementTierRequired = SettlementTier.METROPOLIS
            )
        )
    }
    
    /**
     * Get all structures
     */
    fun getAllStructures(): List<Structure> {
        return getSkillStructures() + getSupportStructures()
    }
    
    /**
     * Get a structure by ID
     */
    fun getStructureById(id: String): Structure? {
        return getAllStructures().find { it.id == id }
    }
    
    /**
     * Get structures by category
     */
    fun getStructuresByCategory(category: StructureCategory): List<Structure> {
        return getAllStructures().filter { it.category == category }
    }
    
    /**
     * Get structures available for a settlement tier
     */
    fun getStructuresForSettlement(tier: SettlementTier): List<Structure> {
        val tierValue = when(tier) {
            SettlementTier.VILLAGE -> 1
            SettlementTier.TOWN -> 2
            SettlementTier.CITY -> 3
            SettlementTier.METROPOLIS -> 4
        }
        
        return getAllStructures().filter { structure ->
            structure.tier <= tierValue
        }
    }
    
    /**
     * Get structures that can be built in a settlement
     */
    fun getBuildableStructures(
        settlement: Settlement, 
        existingStructures: List<String>
    ): List<Structure> {
        return getStructuresForSettlement(settlement.tier).filter { structure ->
            // Check if we already have this structure
            !existingStructures.contains(structure.id) &&
            // Check if we have the prerequisite for upgrading
            (structure.upgradesFrom == null || existingStructures.contains(structure.upgradesFrom))
        }
    }
}
