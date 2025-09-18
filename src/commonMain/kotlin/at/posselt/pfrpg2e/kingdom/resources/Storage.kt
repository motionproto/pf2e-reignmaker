package at.kmlite.pfrpg2e.kingdom.resources

import at.kmlite.pfrpg2e.data.kingdom.RealmData
import at.kmlite.pfrpg2e.data.kingdom.findKingdomSize
import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement
import at.kmlite.pfrpg2e.data.kingdom.structures.CommodityStorage

fun calculateStorage(realm: RealmData, settlements: List<Settlement>): CommodityStorage {
    val baseStorage = findKingdomSize(size = realm.size).commodityCapacity
    return settlements
        .map { it.storage }
        .fold(CommodityStorage(
            ore = baseStorage,
            food = baseStorage,
            lumber = baseStorage,
            stone = baseStorage,
            luxuries = baseStorage,
        )) { prev, curr -> prev + curr }
}