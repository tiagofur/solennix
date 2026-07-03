package com.creapolis.solennix.core.network.log

import android.util.Log
import com.creapolis.solennix.core.network.BuildConfig

/**
 * Centralized logger for Solennix.
 *
 * Replaces the ~54 ad-hoc `android.util.Log.*` calls scattered across the app.
 * `d` (debug) is a **no-op in release builds** so user input — search queries,
 * form values, tokens — is never written to logcat in production. `w`/`e` are
 * kept (non-sensitive diagnostics for crash triage).
 *
 * Inject via Hilt (`@Inject constructor(logger: SolennixLogger)`); the impl is
 * bound in `NetworkModule`.
 */
interface SolennixLogger {
    /** Debug log. No-op in release — never log PII/user input via this. */
    fun d(tag: String, message: String)

    /** Warning log. Emitted in all build types. */
    fun w(tag: String, message: String, throwable: Throwable? = null)

    /** Error log. Emitted in all build types. */
    fun e(tag: String, message: String, throwable: Throwable? = null)
}

/**
 * Default [SolennixLogger] backed by `android.util.Log`.
 *
 * `d` is gated by [BuildConfig.DEBUG] to prevent PII leakage in release.
 */
class AndroidSolennixLogger : SolennixLogger {
    override fun d(tag: String, message: String) {
        if (BuildConfig.DEBUG) Log.d(tag, message)
    }

    override fun w(tag: String, message: String, throwable: Throwable?) {
        if (throwable != null) Log.w(tag, message, throwable) else Log.w(tag, message)
    }

    override fun e(tag: String, message: String, throwable: Throwable?) {
        if (throwable != null) Log.e(tag, message, throwable) else Log.e(tag, message)
    }
}
