package kingdom.lite.utils

import com.foundryvtt.pf2e.item.itemFromUuid

suspend fun openItem(uuid: String) {
    itemFromUuid(uuid)?.sheet?.launch()
}