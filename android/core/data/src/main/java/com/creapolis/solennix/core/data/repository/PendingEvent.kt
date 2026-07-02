package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.Event

/**
 * The pending sync action for a locally-modified event.
 *
 * Domain-side mirror of the DB-only `SyncStatus`; only the three pending
 * states surface to consumers (SYNCED events are never "pending").
 */
enum class PendingAction { INSERT, UPDATE, DELETE }

/**
 * A domain view of an event awaiting sync, without leaking the Room entity.
 *
 * `app` (and `SyncWorker`) consume this instead of `core.database.entity.CachedEvent`,
 * keeping the persistence layer encapsulated behind `core:data`.
 */
data class PendingEvent(
    val event: Event,
    val action: PendingAction
)
