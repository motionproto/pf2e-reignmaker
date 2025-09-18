package kingdom.lite.combat

import kotlinx.js.JsPlainObject

@JsPlainObject
external interface Track {
    val playlistUuid: String
    val trackUuid: String?
}

fun Track(playlistUuid: String, trackUuid: String? = null): Track {
    return js("{ playlistUuid: playlistUuid, trackUuid: trackUuid }").unsafeCast<Track>()
}
