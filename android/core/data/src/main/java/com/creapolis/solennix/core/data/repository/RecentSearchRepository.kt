package com.creapolis.solennix.core.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RecentSearchRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    private val RECENT_QUERIES_KEY = stringPreferencesKey("recent_search_queries")
    private val MAX_RECENT = 6

    val recentQueries: Flow<List<String>> = dataStore.data.map { prefs ->
        prefs[RECENT_QUERIES_KEY]?.split(",")
            ?.take(MAX_RECENT)
            ?.filter { it.isNotBlank() }
            ?: emptyList()
    }

    suspend fun addQuery(query: String) {
        val normalized = query.trim()
        if (normalized.length < 2) return
        dataStore.edit { prefs ->
            val current = prefs[RECENT_QUERIES_KEY]?.split(",")?.filter { it.isNotBlank() } ?: emptyList()
            val filtered = current.filter { !it.equals(normalized, ignoreCase = true) }
            val updated = (listOf(normalized) + filtered).take(MAX_RECENT)
            prefs[RECENT_QUERIES_KEY] = updated.joinToString(",")
        }
    }

    suspend fun clearQueries() {
        dataStore.edit { prefs ->
            prefs.remove(RECENT_QUERIES_KEY)
        }
    }
}
