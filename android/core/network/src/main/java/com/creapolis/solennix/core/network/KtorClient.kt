package com.creapolis.solennix.core.network

import android.util.Log
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.auth.*
import io.ktor.client.plugins.auth.providers.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import okhttp3.CertificatePinner
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KtorClient @Inject constructor(
    private val authManager: AuthManager
) {
    val httpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
                encodeDefaults = false
                coerceInputValues = true
            })
        }
        
        install(HttpRequestRetry) {
            maxRetries = 3
            retryIf { _, response ->
                !response.status.isSuccess() && response.status.value >= 500
            }
            retryOnExceptionIf { _, cause ->
                cause is java.net.ConnectException || cause is java.net.SocketTimeoutException
            }
            exponentialDelay()
        }

        install(Auth) {
            bearer {
                loadTokens {
                    authManager.getBearerTokens()
                }
                refreshTokens {
                    val freshTokens = authManager.getBearerTokens()
                    if (freshTokens != null && freshTokens.accessToken != oldTokens?.accessToken) {
                        freshTokens
                    } else {
                        authManager.refreshAndGetTokens()
                    }
                }
                sendWithoutRequest { true }
            }
        }

        install(Logging) {
            level = LogLevel.HEADERS
            logger = Logger.DEFAULT
        }

        defaultRequest {
            url(BuildConfig.API_BASE_URL)
            contentType(ContentType.Application.Json)
        }

        expectSuccess = true

        engine {
            config {
                connectTimeout(30, TimeUnit.SECONDS)
                readTimeout(30, TimeUnit.SECONDS)
                writeTimeout(30, TimeUnit.SECONDS)

                buildCertificatePinner()?.let { certificatePinner(it) }
            }
        }
    }
}

private const val TAG = "KtorClient"

/**
 * Builds a [CertificatePinner] from `BuildConfig.SSL_PINS`, or returns null if no pins are
 * configured (debug/development against localhost).
 *
 * Pins must be supplied as a comma-separated list of `sha256/<base64>=` entries via the
 * `SOLENNIX_SSL_PINS` env var or gradle property. At least two pins (current + backup) are
 * required for release builds — enforced in `app/build.gradle.kts`.
 *
 * See `obsidian/Solennix/Android/Firma y Secretos de Release.md` for the openssl commands
 * used to compute pins.
 */
private fun buildCertificatePinner(): CertificatePinner? {
    val pins = BuildConfig.SSL_PINS
        .split(",")
        .map { it.trim() }
        .filter { it.isNotBlank() }

    if (pins.isEmpty()) {
        Log.w(
            TAG,
            "SSL pinning DISABLED: BuildConfig.SSL_PINS is empty. This is only safe for " +
                "debug builds against localhost/staging. Release builds must define " +
                "SOLENNIX_SSL_PINS — see Firma y Secretos de Release.md"
        )
        return null
    }

    return CertificatePinner.Builder().apply {
        pins.forEach { pin -> add(BuildConfig.API_HOST, pin) }
    }.build()
}
