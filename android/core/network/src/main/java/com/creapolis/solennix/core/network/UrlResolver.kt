package com.creapolis.solennix.core.network

object UrlResolver {
    // Base URL without the API suffix, used to resolve relative asset paths.
    private val BASE_URL: String = BuildConfig.API_BASE_URL.removeSuffix("api/").removeSuffix("/")

    fun resolve(path: String?): String? {
        if (path == null) return null
        if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
            return path
        }
        return "$BASE_URL$path"
    }
}
