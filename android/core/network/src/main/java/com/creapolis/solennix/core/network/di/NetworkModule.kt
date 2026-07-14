package com.creapolis.solennix.core.network.di

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.KtorClient
import com.creapolis.solennix.core.network.NetworkMonitor
import com.creapolis.solennix.core.network.log.AndroidSolennixLogger
import com.creapolis.solennix.core.network.log.SolennixLogger
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideEncryptedSharedPreferences(
        @ApplicationContext context: Context
    ): SharedPreferences {
        // NOTE: This mirrors SecurePrefsProvider in :core:data (#854). It cannot
        // delegate because :core:network cannot depend on :core:data (circular).
        // The provider name/scheme must stay in sync manually.
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            "solennix_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    @Provides
    @Singleton
    fun provideAuthManager(
        encryptedPrefs: SharedPreferences,
        @ApplicationContext context: Context
    ): AuthManager = AuthManager(encryptedPrefs, context)

    @Provides
    @Singleton
    fun provideKtorClient(authManager: AuthManager): KtorClient =
        KtorClient(authManager)

    @Provides
    @Singleton
    fun provideApiService(
        client: KtorClient,
        @ApplicationContext context: Context
    ): ApiService = ApiService(client, context)

    @Provides
    @Singleton
    fun provideNetworkMonitor(
        @ApplicationContext context: Context
    ): NetworkMonitor = NetworkMonitor(context)

    @Provides
    @Singleton
    fun provideSolennixLogger(): SolennixLogger = AndroidSolennixLogger()
}
