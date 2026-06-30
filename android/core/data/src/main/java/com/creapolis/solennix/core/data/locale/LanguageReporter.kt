package com.creapolis.solennix.core.data.locale

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.put
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class ProfileUpdatePayload(
    @SerialName("preferred_language") val preferredLanguage: String,
    @SerialName("default_currency") val defaultCurrency: String
)

interface LanguageReportStoring {
    fun getLastReportedLanguage(): String?
    fun setLastReportedLanguage(language: String?)
    fun getLastReportedCurrency(): String?
    fun setLastReportedCurrency(currency: String?)
}

@Singleton
class SharedPreferencesLanguageStore @Inject constructor(
    @ApplicationContext context: Context
) : LanguageReportStoring {
    private val prefs: SharedPreferences = context.getSharedPreferences("language_report_prefs", Context.MODE_PRIVATE)

    override fun getLastReportedLanguage(): String? {
        return prefs.getString("lastReportedLanguage", null)
    }

    override fun setLastReportedLanguage(language: String?) {
        prefs.edit().putString("lastReportedLanguage", language).apply()
    }

    override fun getLastReportedCurrency(): String? {
        return prefs.getString("lastReportedCurrency", null)
    }

    override fun setLastReportedCurrency(currency: String?) {
        prefs.edit().putString("lastReportedCurrency", currency).apply()
    }
}

@Singleton
class LanguageReporter @Inject constructor(
    private val store: LanguageReportStoring,
    private val authManager: AuthManager,
    private val apiService: ApiService
) {
    // Allows injecting custom providers for tests, similar to Swift's testable init
    var currentLanguageProvider: () -> String = {
        Locale.getDefault().language.takeIf { it == "es" || it == "en" } ?: "es"
    }

    var currentCurrencyProvider: () -> String = {
        try {
            java.util.Currency.getInstance(Locale.getDefault()).currencyCode
        } catch (e: Exception) {
            "MXN"
        }
    }

    suspend fun reportIfNeeded(): Boolean = withContext(Dispatchers.IO) {
        val currentLang = currentLanguageProvider()
        val currentCurrency = currentCurrencyProvider()
        val lastReportedLang = store.getLastReportedLanguage()
        val lastReportedCurrency = store.getLastReportedCurrency()

        if (currentLang == lastReportedLang && currentCurrency == lastReportedCurrency) {
            return@withContext false
        }

        try {
            val updatedUser: User = apiService.put(
                Endpoints.UPDATE_PROFILE,
                ProfileUpdatePayload(preferredLanguage = currentLang, defaultCurrency = currentCurrency)
            )
            authManager.storeUser(updatedUser)
            store.setLastReportedLanguage(currentLang)
            store.setLastReportedCurrency(currentCurrency)
            true
        } catch (e: Exception) {
            Log.e("LanguageReporter", "Failed to report preferred language and currency: $currentLang, $currentCurrency", e)
            false
        }
    }
}
