package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.ThemeConfig
import kotlinx.coroutines.flow.Flow

interface SettingsRepository {
    val themeConfig: Flow<ThemeConfig>
    suspend fun setThemeConfig(config: ThemeConfig)
    suspend fun registerFcmToken(token: String)
}
