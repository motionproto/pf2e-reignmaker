package at.kmlite.pfrpg2e.kingdom.incidents

import at.kmlite.pfrpg2e.kingdom.data.*
import kotlin.test.*

class UnrestIncidentTablesTest {

    @Test
    fun testMinorIncidentsStructure() {
        // Verify minor incidents are properly structured
        val incidents = UnrestIncidentTables.minorIncidents
        
        // Should have incidents
        assertTrue(incidents.isNotEmpty())
        
        // All incidents should be minor tier
        incidents.forEach { incident ->
            assertEquals(UnrestTier.MINOR.name, incident.tier)
            assertNotNull(incident.percentileRange)
        }
        
        // Check percentile coverage (should cover 1-100)
        val ranges = incidents.mapNotNull { it.percentileRange }
        assertEquals(1, ranges.minOf { it.first })
        assertEquals(100, ranges.maxOf { it.last })
    }

    @Test
    fun testModerateIncidentsStructure() {
        // Verify moderate incidents are properly structured
        val incidents = UnrestIncidentTables.moderateIncidents
        
        // Should have incidents
        assertTrue(incidents.isNotEmpty())
        
        // All incidents should be moderate tier
        incidents.forEach { incident ->
            assertEquals(UnrestTier.MODERATE.name, incident.tier)
            assertNotNull(incident.percentileRange)
        }
        
        // Check percentile coverage (should cover 1-100)
        val ranges = incidents.mapNotNull { it.percentileRange }
        assertEquals(1, ranges.minOf { it.first })
        assertEquals(100, ranges.maxOf { it.last })
    }

    @Test
    fun testMajorIncidentsStructure() {
        // Verify major incidents are properly structured
        val incidents = UnrestIncidentTables.majorIncidents
        
        // Should have incidents
        assertTrue(incidents.isNotEmpty())
        
        // All incidents should be major tier
        incidents.forEach { incident ->
            assertEquals(UnrestTier.MAJOR.name, incident.tier)
            assertNotNull(incident.percentileRange)
        }
        
        // Check percentile coverage (should cover 1-100)
        val ranges = incidents.mapNotNull { it.percentileRange }
        assertEquals(1, ranges.minOf { it.first })
        assertEquals(100, ranges.maxOf { it.last })
    }

    @Test
    fun testGetIncidentsForTier_Stable() {
        // Stable tier should have no incidents
        val incidents = UnrestIncidentTables.getIncidentsForTier(UnrestTier.STABLE)
        assertTrue(incidents.isEmpty())
    }

    @Test
    fun testGetIncidentsForTier_Minor() {
        val incidents = UnrestIncidentTables.getIncidentsForTier(UnrestTier.MINOR)
        assertEquals(UnrestIncidentTables.minorIncidents, incidents)
        assertTrue(incidents.isNotEmpty())
    }

    @Test
    fun testGetIncidentsForTier_Moderate() {
        val incidents = UnrestIncidentTables.getIncidentsForTier(UnrestTier.MODERATE)
        assertEquals(UnrestIncidentTables.moderateIncidents, incidents)
        assertTrue(incidents.isNotEmpty())
    }

    @Test
    fun testGetIncidentsForTier_Major() {
        val incidents = UnrestIncidentTables.getIncidentsForTier(UnrestTier.MAJOR)
        assertEquals(UnrestIncidentTables.majorIncidents, incidents)
        assertTrue(incidents.isNotEmpty())
    }

    @Test
    fun testRollIncident_StableReturnsNull() {
        // Stable tier should always return null
        val incident = UnrestIncidentTables.rollIncident(UnrestTier.STABLE)
        assertNull(incident)
    }

    @Test
    fun testRollIncident_MinorTier() {
        // Roll multiple times to ensure we get various results
        val results = mutableSetOf<String?>()
        repeat(100) {
            val incident = UnrestIncidentTables.rollIncident(UnrestTier.MINOR)
            results.add(incident?.id)
        }
        
        // Should get multiple different incidents including "no incident"
        assertTrue(results.size > 1, "Should get varied results from rolling")
        
        // All non-null results should be minor tier
        results.filterNotNull().forEach { id ->
            val incident = UnrestIncidentTables.minorIncidents.find { it.id == id }
            assertNotNull(incident)
            assertEquals(UnrestTier.MINOR.name, incident.tier)
        }
    }

    @Test
    fun testSpecificMinorIncidents() {
        // Test specific minor incidents exist with correct properties
        val crimeWave = UnrestIncidentTables.minorIncidents.find { it.id == "crime-wave" }
        assertNotNull(crimeWave)
        assertEquals("Crime Wave", crimeWave.name)
        assertEquals(21..30, crimeWave.percentileRange)
        assertEquals(4, crimeWave.skillOptions.size)
        
        val workStoppage = UnrestIncidentTables.minorIncidents.find { it.id == "work-stoppage" }
        assertNotNull(workStoppage)
        assertEquals("Work Stoppage", workStoppage.name)
        assertEquals(31..40, workStoppage.percentileRange)
        
        val protests = UnrestIncidentTables.minorIncidents.find { it.id == "protests" }
        assertNotNull(protests)
        assertEquals("Protests", protests.name)
        assertEquals(51..60, protests.percentileRange)
    }

    @Test
    fun testSpecificModerateIncidents() {
        // Test specific moderate incidents exist with correct properties
        val productionStrike = UnrestIncidentTables.moderateIncidents.find { it.id == "production-strike" }
        assertNotNull(productionStrike)
        assertEquals("Production Strike", productionStrike.name)
        assertEquals(16..24, productionStrike.percentileRange)
        
        val diseaseOutbreak = UnrestIncidentTables.moderateIncidents.find { it.id == "disease-outbreak" }
        assertNotNull(diseaseOutbreak)
        assertEquals("Disease Outbreak", diseaseOutbreak.name)
        assertEquals(52..60, diseaseOutbreak.percentileRange)
        
        val riot = UnrestIncidentTables.moderateIncidents.find { it.id == "riot" }
        assertNotNull(riot)
        assertEquals("Riot", riot.name)
        assertEquals(61..69, riot.percentileRange)
    }

    @Test
    fun testSpecificMajorIncidents() {
        // Test specific major incidents exist with correct properties
        val guerrillaMovement = UnrestIncidentTables.majorIncidents.find { it.id == "guerrilla-movement" }
        assertNotNull(guerrillaMovement)
        assertEquals("Guerrilla Movement", guerrillaMovement.name)
        assertEquals(11..17, guerrillaMovement.percentileRange)
        
        val economicCrash = UnrestIncidentTables.majorIncidents.find { it.id == "economic-crash" }
        assertNotNull(economicCrash)
        assertEquals("Economic Crash", economicCrash.name)
        assertEquals(60..66, economicCrash.percentileRange)
        
        val secessionCrisis = UnrestIncidentTables.majorIncidents.find { it.id == "secession-crisis" }
        assertNotNull(secessionCrisis)
        assertEquals("Secession Crisis", secessionCrisis.name)
        assertEquals(81..87, secessionCrisis.percentileRange)
    }

    @Test
    fun testNoIncidentRanges() {
        // Verify "No Incident" entries have correct percentile ranges
        val minorNoIncident = UnrestIncidentTables.minorIncidents.find { it.id == "minor-no-incident" }
        assertNotNull(minorNoIncident)
        assertEquals(1..20, minorNoIncident.percentileRange)
        
        val moderateNoIncident = UnrestIncidentTables.moderateIncidents.find { it.id == "moderate-no-incident" }
        assertNotNull(moderateNoIncident)
        assertEquals(1..15, moderateNoIncident.percentileRange)
        
        val majorNoIncident = UnrestIncidentTables.majorIncidents.find { it.id == "major-no-incident" }
        assertNotNull(majorNoIncident)
        assertEquals(1..10, majorNoIncident.percentileRange)
    }

    @Test
    fun testPercentileRangesContinuous() {
        // Verify percentile ranges are continuous with no gaps or overlaps
        fun checkContinuity(incidents: List<UnrestIncident>) {
            val sorted = incidents.sortedBy { it.percentileRange?.first ?: 0 }
            for (i in 1 until sorted.size) {
                val prev = sorted[i - 1].percentileRange
                val curr = sorted[i].percentileRange
                assertNotNull(prev)
                assertNotNull(curr)
                assertEquals(prev.last + 1, curr.first, 
                    "Gap or overlap between ${sorted[i-1].id} and ${sorted[i].id}")
            }
        }
        
        checkContinuity(UnrestIncidentTables.minorIncidents)
        checkContinuity(UnrestIncidentTables.moderateIncidents)
        checkContinuity(UnrestIncidentTables.majorIncidents)
    }

    @Test
    fun testIncidentSkillOptions() {
        // Verify incidents have valid skill options
        val allIncidents = listOf(
            UnrestIncidentTables.minorIncidents,
            UnrestIncidentTables.moderateIncidents,
            UnrestIncidentTables.majorIncidents
        ).flatten()
        
        allIncidents.forEach { incident ->
            when {
                incident.id.contains("no-incident") -> {
                    // No incident entries should have no skill options
                    assertTrue(incident.skillOptions.isEmpty(), 
                        "${incident.id} should have no skill options")
                }
                else -> {
                    // Regular incidents should have skill options
                    assertTrue(incident.skillOptions.isNotEmpty(),
                        "${incident.id} should have skill options")
                    
                    // Each skill option should have required fields
                    incident.skillOptions.forEach { option ->
                        assertTrue(option.skill.isNotEmpty())
                        assertTrue(option.successEffect.isNotEmpty())
                        assertTrue(option.failureEffect.isNotEmpty())
                    }
                }
            }
        }
    }

    @Test
    fun testSkillVariety() {
        // Verify a variety of skills are used across incidents
        val allSkills = mutableSetOf<String>()
        
        val allIncidents = listOf(
            UnrestIncidentTables.minorIncidents,
            UnrestIncidentTables.moderateIncidents,
            UnrestIncidentTables.majorIncidents
        ).flatten()
        
        allIncidents.forEach { incident ->
            incident.skillOptions.forEach { option ->
                allSkills.add(option.skill)
            }
        }
        
        // Should have a good variety of skills
        assertTrue(allSkills.size >= 10, 
            "Should have at least 10 different skills across all incidents")
        
        // Check for common expected skills
        val expectedSkills = listOf(
            "diplomacy", "intimidation", "society", "deception",
            "athletics", "stealth", "medicine", "religion"
        )
        
        expectedSkills.forEach { skill ->
            assertTrue(allSkills.contains(skill), 
                "Expected skill '$skill' not found in incidents")
        }
    }

    @Test
    fun testRollDistribution() {
        // Test that roll distribution covers expected ranges
        val minorRolls = mutableMapOf<String, Int>()
        val moderateRolls = mutableMapOf<String, Int>()
        val majorRolls = mutableMapOf<String, Int>()
        
        // Roll many times to get distribution
        repeat(1000) {
            UnrestIncidentTables.rollIncident(UnrestTier.MINOR)?.let {
                minorRolls[it.id] = (minorRolls[it.id] ?: 0) + 1
            }
            UnrestIncidentTables.rollIncident(UnrestTier.MODERATE)?.let {
                moderateRolls[it.id] = (moderateRolls[it.id] ?: 0) + 1
            }
            UnrestIncidentTables.rollIncident(UnrestTier.MAJOR)?.let {
                majorRolls[it.id] = (majorRolls[it.id] ?: 0) + 1
            }
        }
        
        // Check that we get a reasonable distribution
        assertTrue(minorRolls.size > 3, "Should get variety in minor incidents")
        assertTrue(moderateRolls.size > 3, "Should get variety in moderate incidents")
        assertTrue(majorRolls.size > 3, "Should get variety in major incidents")
        
        // "No incident" should appear but not dominate
        val minorNoIncidentCount = minorRolls["minor-no-incident"] ?: 0
        assertTrue(minorNoIncidentCount > 0, "Should get some 'no incident' results")
        assertTrue(minorNoIncidentCount < 300, "No incident shouldn't dominate (20% expected)")
    }
}
