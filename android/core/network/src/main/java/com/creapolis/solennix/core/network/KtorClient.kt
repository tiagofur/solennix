package com.creapolis.solennix.core.network

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
import java.security.MessageDigest
import java.security.cert.Certificate
import java.security.cert.CertificateFactory
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KtorClient @Inject constructor(
    private val authManager: AuthManager
) {
    private val certificatePinner by lazy {
        CertificatePinner.Builder()
            .add("api.solennix.com", "sha256/HASH_PLACEHOLDER_1")
            .add("api.solennix.com", "sha256/HASH_PLACEHOLDER_2")
            .build()
    }

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
        })

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
                certificatePinner(certificatePinner)
            }
        }
    }
}
