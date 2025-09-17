package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.kingdom.KingdomData
import at.posselt.pfrpg2e.kingdom.data.*
import kotlin.test.*

class UnrestIncidentManagerTest {

    @Test
    fun testPassiveUnrestCalculation_NoSources() {
        // Test that the calculation returns correct values for no unrest sources
        val sources = PassiveUnrestSources.calculate(
            atWar = false,
            hexCount = 0,
            metropolisCount = 0
        )
        
        assertEquals(0, sources.fromWar)
        assertEquals(0, sources.fromTerritory)
        assertEquals(0, sources.fromMetropolises)
        assertEquals(0, sources.total)
    }
    
    @Test
    fun testPassiveUnrestCalculation_AtWar() {
        // Test that being at war adds 1 unrest
        val sources = PassiveUnrestSources.calculate(
            atWar = true,
            hexCount = 0,
            metropolisCount = 0
        )
        
        assertEquals(1, sources.fromWar)
        assertEquals(1, sources.total)
    }
    
    @Test
    fun testPassiveUnrestCalculation_TerritorySize() {
        // Test territory size unrest thresholds
        val testCases = listOf(
            0 to 0,    // Small kingdom
            7 to 0,    // Just under threshold
            8 to 1,    // First threshold
            15 to 1,   // Still at first threshold
            16 to 2,   // Second threshold
            24 to 3,   // Third threshold
            32 to 4,   // Fourth threshold
            40 to 4    // Beyond max threshold
        )
        
        for ((hexCount, expectedUnrest) in testCases) {
            val sources = PassiveUnrestSources.calculate(
                atWar = false,
                hexCount = hexCount,
                metropolisCount = 0
            )
            assertEquals(expectedUnrest, sources.fromTerritory, 
                "Hex count $hexCount should generate $expectedUnrest unrest from territory")
        }
    }
    
    @Test
    fun testPassiveUnrestCalculation_Metropolises() {
        // Test that each metropolis adds 1 unrest
        val sources = PassiveUnrestSources.calculate(
            atWar = false,
            hexCount = 0,
            metropolisCount = 3
        )
        
        assertEquals(3, sources.fromMetropolises)
        assertEquals(3, sources.total)
    }
    
    @Test
    fun testPassiveUnrestCalculation_AllSources() {
        // Test all sources combine correctly
        val sources = PassiveUnrestSources.calculate(
            atWar = true,       // +1
            hexCount = 20,      // +2
            metropolisCount = 2 // +2
        )
        
        assertEquals(1, sources.fromWar)
        assertEquals(2, sources.fromTerritory)
        assertEquals(2, sources.fromMetropolises)
        assertEquals(5, sources.total)
    }


    @Test
    fun testUnrestTierDetermination() {
        // Test tier boundaries using the enum directly
        assertEquals(UnrestTier.STABLE, UnrestTier.fromUnrest(0))
        assertEquals(UnrestTier.STABLE, UnrestTier.fromUnrest(1))
        assertEquals(UnrestTier.STABLE, UnrestTier.fromUnrest(2))
        
        assertEquals(UnrestTier.MINOR, UnrestTier.fromUnrest(3))
        assertEquals(UnrestTier.MINOR, UnrestTier.fromUnrest(4))
        assertEquals(UnrestTier.MINOR, UnrestTier.fromUnrest(5))
        
        assertEquals(UnrestTier.MODERATE, UnrestTier.fromUnrest(6))
        assertEquals(UnrestTier.MODERATE, UnrestTier.fromUnrest(7))
        assertEquals(UnrestTier.MODERATE, UnrestTier.fromUnrest(8))
        
        assertEquals(UnrestTier.MAJOR, UnrestTier.fromUnrest(9))
        assertEquals(UnrestTier.MAJOR, UnrestTier.fromUnrest(10))
        assertEquals(UnrestTier.MAJOR, UnrestTier.fromUnrest(100))
    }
    
    @Test
    fun testUnrestPenalties() {
        // Test that each tier has the correct penalty
        assertEquals(0, UnrestTier.STABLE.penalty)
        assertEquals(-1, UnrestTier.MINOR.penalty)
        assertEquals(-2, UnrestTier.MODERATE.penalty)
        assertEquals(-3, UnrestTier.MAJOR.penalty)
    }
    
    @Test
    fun testIncidentResolutionResult() {
        // Test the data class creation with default values
        val defaultResult = IncidentResolutionResult()
        assertEquals(0, defaultResult.unrestChange)
        assertEquals(0, defaultResult.goldLost)
        assertEquals(0, defaultResult.foodLost)
        assertEquals(0, defaultResult.fameLost)
        assertEquals(0, defaultResult.hexesLost)
        assertTrue(defaultResult.resourcesLost.isEmpty())
        assertTrue(defaultResult.structuresDamaged.isEmpty())
        assertTrue(defaultResult.structuresDestroyed.isEmpty())
        
        // Test with specific values
        val result = IncidentResolutionResult(
            unrestChange = 2,
            goldLost = 5,
            foodLost = 3,
            fameLost = 1,
            hexesLost = 1
        )
        assertEquals(2, result.unrestChange)
        assertEquals(5, result.goldLost)
        assertEquals(3, result.foodLost)
        assertEquals(1, result.fameLost)
        assertEquals(1, result.hexesLost)
    }
}
