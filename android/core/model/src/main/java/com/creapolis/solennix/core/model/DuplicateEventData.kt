package com.creapolis.solennix.core.model

data class DuplicateEventData(
    val event: Event,
    val products: List<EventProduct>,
    val extras: List<EventExtra>,
    val equipment: List<EventEquipment>,
    val supplies: List<EventSupply>
)

object DuplicateEventDataHolder {
    var pendingData: DuplicateEventData? = null
}
