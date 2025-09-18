package at.kmlite.pfrpg2e.utils

import at.kmlite.pfrpg2e.Config
import com.foundryvtt.core.AnyObject
import io.socket.Socket


fun Socket.emitPfrpg2eKingdomCampingWeather(data: AnyObject) =
    emit("module.${Config.moduleId}", data)

fun Socket.onPfrpg2eKingdomCampingWeather(callback: (Any) -> Unit) =
    on("module.${Config.moduleId}", callback)