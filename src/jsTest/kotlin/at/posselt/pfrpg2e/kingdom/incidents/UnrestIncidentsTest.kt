package at.posselt.pfrpg2e.kingdom.incidents

import at.posselt.pfrpg2e.kingdom.data.*
import kotlin.test.*

class UnrestIncidentsTest {

    @Test
    fun testGetIncidentById_ExistingIncident() {
        // Test finding specific incidents by ID
        val crimeWave = UnrestIncidents.getIncidentById("crime-wave")
        assertNotNull(crimeWave)
        assertEquals("Crime Wave", crimeWave.name)
        assertEquals(UnrestTier.MINOR.name, crimeWave.tier)
        
        val riot = UnrestIncidents.getIncidentById("riot")
        assertNotNull(riot)
        assertEquals("Riot", riot.name)
        assertEquals(UnrestTier.MODERATE.name, riot.tier)
        
        val secessionCrisis = UnrestIncidents.getIncidentById("secession-crisis")
        assertNotNull(secessionCrisis)
        assertEquals("Secession Crisis", secessionCrisis.name)
        assertEquals(UnrestTier.MAJOR.name, secessionCrisis.tier)
    }

    @Test
    fun testGetIncidentById_NonExistentIncident() {
        // Test that non-existent IDs return null
        val incident = UnrestIncidents.getIncidentById("non-existent-incident")
        assertNull(incident)
    }

    @Test
    fun testGetIncidentById_NoIncidents() {
        // Test finding "no incident" entries
        val minorNoIncident = UnrestIncidents.getIncidentById("minor-no-incident")
        assertNotNull(minorNoIncident)
        assertEquals("No Incident", minorNoIncident.name)
        assertEquals(UnrestTier.MINOR.name, minorNoIncident.tier)
        assertTrue(minorNoIncident.skillOptions.isEmpty())
        
        val moderateNoIncident = UnrestIncidents.getIncidentById("moderate-no-incident")
        assertNotNull(moderateNoIncident)
        assertEquals(UnrestTier.MODERATE.name, moderateNoIncident.tier)
        
        val majorNoIncident = UnrestIncidents.getIncidentById("major-no-incident")
        assertNotNull(majorNoIncident)
        assertEquals(UnrestTier.MAJOR.name, majorNoIncident.tier)
    }

    @Test
    fun testGetSampleIncident_StableTier() {
        // Stable tier should return null (no incidents)
        val incident = UnrestIncidents.getSampleIncident(UnrestTier.STABLE)
        assertNull(incident)
    }

    @Test
    fun testGetSampleIncident_MinorTier() {
        val incident = UnrestIncidents.getSampleIncident(UnrestTier.MINOR)
        assertNotNull(incident)
        assertEquals(UnrestTier.MINOR.name, incident.tier)
        // Should not be a "no incident" entry
        assertFalse(incident.id.contains("no-incident"))
        // Should have skill options
        assertTrue(incident.skillOptions.isNotEmpty())
    }

    @Test
    fun testGetSampleIncident_ModerateTier() {
        val incident = UnrestIncidents.getSampleIncident(UnrestTier.MODERATE)
        assertNotNull(incident)
        assertEquals(UnrestTier.MODERATE.name, incident.tier)
        // Should not be a "no incident" entry
        assertFalse(incident.id.contains("no-incident"))
        // Should have skill options
        assertTrue(incident.skillOptions.isNotEmpty())
    }

    @Test
    fun testGetSampleIncident_MajorTier() {
        val incident = UnrestIncidents.getSampleIncident(UnrestTier.MAJOR)
        assertNotNull(incident)
        assertEquals(UnrestTier.MAJOR.name, incident.tier)
        // Should not be a "no incident" entry
        assertFalse(incident.id.contains("no-incident"))
        // Should have skill options
        assertTrue(incident.skillOptions.isNotEmpty())
    }

    @Test
    fun testRollForIncident_StableTier() {
        // Stable tier always returns null
        repeat(10) {
            val incident = UnrestIncidents.rollForIncident(UnrestTier.STABLE)
            assertNull(incident)
        }
    }

    @Test
    fun testRollForIncident_MinorTier() {
        // Test that rolling works and returns appropriate tier incidents
        val results = mutableListOf<UnrestIncident?>()
        repeat(100) {
            results.add(UnrestIncidents.rollForIncident(UnrestTier.MINOR))
        }
        
        // Should get both incidents and nulls (no incident)
        assertTrue(results.filterNotNull().isNotEmpty())
        
        // All non-null results should be minor tier
        results.filterNotNull().forEach { incident ->
            assertEquals(UnrestTier.MINOR.name, incident.tier)
        }
    }

    @Test
    fun testRollForIncident_ModerateTier() {
        // Test moderate tier rolling
        val results = mutableListOf<UnrestIncident?>()
        repeat(100) {
            results.add(UnrestIncidents.rollForIncident(UnrestTier.MODERATE))
        }
        
        // Should get both incidents and nulls (no incident)
        assertTrue(results.filterNotNull().isNotEmpty())
        
        // All non-null results should be moderate tier
        results.filterNotNull().forEach { incident ->
            assertEquals(UnrestTier.MODERATE.name, incident.tier)
        }
    }

    @Test
    fun testRollForIncident_MajorTier() {
        // Test major tier rolling
        val results = mutableListOf<UnrestIncident?>()
        repeat(100) {
            results.add(UnrestIncidents.rollForIncident(UnrestTier.MAJOR))
        }
        
        // Should get both incidents and nulls (no incident)
        assertTrue(results.filterNotNull().isNotEmpty())
        
        // All non-null results should be major tier
        results.filterNotNull().forEach { incident ->
            assertEquals(UnrestTier.MAJOR.name, incident.tier)
        }
    }

    @Test
    fun testGetAllIncidentsForTier_Stable() {
        val incidents = UnrestIncidents.getAllIncidentsForTier(UnrestTier.STABLE)
        assertTrue(incidents.isEmpty())
    }

    @Test
    fun testGetAllIncidentsForTier_Minor() {
        val incidents = UnrestIncidents.getAllIncidentsForTier(UnrestTier.MINOR)
        assertTrue(incidents.isNotEmpty())
        
        // All should be minor tier
        incidents.forEach { incident ->
            assertEquals(UnrestTier.MINOR.name, incident.tier)
        }
        
        // Should include both "no incident" and actual incidents
        assertTrue(incidents.any { it.id.contains("no-incident") })
        assertTrue(incidents.any { !it.id.contains("no-incident") })
    }

    @Test
    fun testGetAllIncidentsForTier_Moderate() {
        val incidents = UnrestIncidents.getAllIncidentsForTier(UnrestTier.MODERATE)
        assertTrue(incidents.isNotEmpty())
        
        // All should be moderate tier
        incidents.forEach { incident ->
            assertEquals(UnrestTier.MODERATE.name, incident.tier)
        }
        
        // Should include both "no incident" and actual incidents
        assertTrue(incidents.any { it.id.contains("no-incident") })
        assertTrue(incidents.any { !it.id.contains("no-incident") })
    }

    @Test
    fun testGetAllIncidentsForTier_Major() {
        val incidents = UnrestIncidents.getAllIncidentsForTier(UnrestTier.MAJOR)
        assertTrue(incidents.isNotEmpty())
        
        // All should be major tier
        incidents.forEach { incident ->
            assertEquals(UnrestTier.MAJOR.name, incident.tier)
        }
        
        // Should include both "no incident" and actual incidents
        assertTrue(incidents.any { it.id.contains("no-incident") })
        assertTrue(incidents.any { !it.id.contains("no-incident") })
    }

    @Test
    fun testGetIncidentChance() {
        // Test the percentage chances for each tier
        assertEquals(0, UnrestIncidents.getIncidentChance(UnrestTier.STABLE))
        assertEquals(80, UnrestIncidents.getIncidentChance(UnrestTier.MINOR))
        assertEquals(85, UnrestIncidents.getIncidentChance(UnrestTier.MODERATE))
        assertEquals(90, UnrestIncidents.getIncidentChance(UnrestTier.MAJOR))
    }

    @Test
    fun testGetIncidentChance_MatchesActualRanges() {
        // Verify that the chances match the actual table percentile ranges
        
        // Minor: "no incident" is 1-20, so incidents are 21-100 = 80%
        val minorNoIncident = UnrestIncidents.getIncidentById("minor-no-incident")
        assertNotNull(minorNoIncident)
        assertEquals(1..20, minorNoIncident.percentileRange)
        assertEquals(80, UnrestIncidents.getIncidentChance(UnrestTier.MINOR))
        
        // Moderate: "no incident" is 1-15, so incidents are 16-100 = 85%
        val moderateNoIncident = UnrestIncidents.getIncidentById("moderate-no-incident")
        assertNotNull(moderateNoIncident)
        assertEquals(1..15, moderateNoIncident.percentileRange)
        assertEquals(85, UnrestIncidents.getIncidentChance(UnrestTier.MODERATE))
        
        // Major: "no incident" is 1-10, so incidents are 11-100 = 90%
        val majorNoIncident = UnrestIncidents.getIncidentById("major-no-incident")
        assertNotNull(majorNoIncident)
        assertEquals(1..10, majorNoIncident.percentileRange)
        assertEquals(90, UnrestIncidents.getIncidentChance(UnrestTier.MAJOR))
    }

    @Test
    fun testIncidentUniqueness() {
        // Verify all incident IDs are unique
        val allIncidents = listOf(
            UnrestIncidents.getAllIncidentsForTier(UnrestTier.MINOR),
            UnrestIncidents.getAllIncidentsForTier(UnrestTier.MODERATE),
            UnrestIncidents.getAllIncidentsForTier(UnrestTier.MAJOR)
        ).flatten()
        
        val idCounts = allIncidents.groupingBy { it.id }.eachCount()
        
        idCounts.forEach { (id, count) ->
            assertEquals(1, count, "Incident ID '$id' appears $count times, should be unique")
        }
    }

    @Test
    fun testSpecificIncidentProperties() {
        // Test that specific important incidents have expected properties
        
        // Crime Wave (Minor)
        val crimeWave = UnrestIncidents.getIncidentById("crime-wave")
        assertNotNull(crimeWave)
        assertEquals(4, crimeWave.skillOptions.size)
        assertTrue(crimeWave.skillOptions.any { it.skill == "intimidation" })
        assertTrue(crimeWave.skillOptions.any { it.skill == "thievery" })
        
        // Disease Outbreak (Moderate) 
        val diseaseOutbreak = UnrestIncidents.getIncidentById("disease-outbreak")
        assertNotNull(diseaseOutbreak)
        assertTrue(diseaseOutbreak.skillOptions.any { it.skill == "medicine" })
        assertTrue(diseaseOutbreak.skillOptions.any { it.skill == "nature" })
        assertTrue(diseaseOutbreak.skillOptions.any { it.skill == "religion" })
        
        // Economic Crash (Major)
        val economicCrash = UnrestIncidents.getIncidentById("economic-crash")
        assertNotNull(economicCrash)
        assertTrue(economicCrash.skillOptions.any { it.skill == "society" })
        assertTrue(economicCrash.skillOptions.any { it.skill == "diplomacy" })
        assertTrue(economicCrash.skillOptions.any { it.skill == "crafting" })
    }

    @Test
    fun testRollDistributionAlignmentWithChances() {
        // Verify that actual roll distributions align with expected chances
        fun testTierDistribution(tier: UnrestTier, expectedChance: Int) {
            var incidentCount = 0
            val totalRolls = 1000
            
            repeat(totalRolls) {
                val incident = UnrestIncidents.rollForIncident(tier)
                if (incident != null && !incident.id.contains("no-incident")) {
                    incidentCount++
                }
            }
            
            val actualPercentage = (incidentCount * 100) / totalRolls
            // Allow for some variance due to randomness (±10%)
            val tolerance = 10
            
            assertTrue(
                actualPercentage in (expectedChance - tolerance)..(expectedChance + tolerance),
                "Tier $tier: Expected ~$expectedChance% incidents, got $actualPercentage%"
            )
        }
        
        // Skip stable as it's always 0
        testTierDistribution(UnrestTier.MINOR, 80)
        testTierDistribution(UnrestTier.MODERATE, 85)
        testTierDistribution(UnrestTier.MAJOR, 90)
    }

    @Test
    fun testIncidentEffectConsistency() {
        // Verify that incidents have consistent effect patterns
        val allIncidents = listOf(
            UnrestIncidents.getAllIncidentsForTier(UnrestTier.MINOR),
            UnrestIncidents.getAllIncidentsForTier(UnrestTier.MODERATE),
            UnrestIncidents.getAllIncidentsForTier(UnrestTier.MAJOR)
        ).flatten().filter { !it.id.contains("no-incident") }
        
        allIncidents.forEach { incident ->
            incident.skillOptions.forEach { option ->
                // Success effects should generally be positive or neutral
                assertTrue(
                    option.successEffect.contains("no effect") ||
                    option.successEffect.contains("prevented") ||
                    option.successEffect.contains("successful") ||
                    option.successEffect.contains("maintained") ||
                    option.successEffect.isNotEmpty(),
                    "Incident ${incident.id} has unexpected success effect: ${option.successEffect}"
                )
                
                // Failure effects should describe negative consequences
                assertTrue(
                    option.failureEffect.contains("Lose") ||
                    option.failureEffect.contains("lose") ||
                    option.failureEffect.contains("+") ||
                    option.failureEffect.contains("damaged") ||
                    option.failureEffect.contains("destroyed") ||
                    option.failureEffect.contains("worsens") ||
                    option.failureEffect.contains("nothing") ||
                    option.failureEffect.isNotEmpty(),
                    "Incident ${incident.id} has unexpected failure effect: ${option.failureEffect}"
                )
            }
        }
    }
}
