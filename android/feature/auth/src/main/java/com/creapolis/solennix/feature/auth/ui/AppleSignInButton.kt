package com.creapolis.solennix.feature.auth.ui

import android.annotation.SuppressLint
import android.net.Uri
import android.util.Log
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import java.net.URLEncoder
import java.util.UUID

@Composable
fun AppleSignInButton(
    onSuccess: (String, String?) -> Unit,
    onError: ((String) -> Unit)? = null
) {
    val context = LocalContext.current
    var isLoading by remember { mutableStateOf(false) }
    var showWebView by remember { mutableStateOf(false) }

    val appleClientId = remember {
        try {
            val resId = context.resources.getIdentifier("apple_client_id", "string", context.packageName)
            if (resId != 0) context.getString(resId) else null
        } catch (e: Exception) {
            null
        }
    }

    val redirectUri = remember {
        try {
            val resId = context.resources.getIdentifier("apple_redirect_uri", "string", context.packageName)
            if (resId != 0) context.getString(resId) else null
        } catch (e: Exception) {
            null
        }
    }

    // Don't render if not configured
    if (appleClientId == null || appleClientId.startsWith("YOUR_")) {
        return
    }

    if (showWebView && redirectUri != null) {
        AppleSignInDialog(
            clientId = appleClientId,
            redirectUri = redirectUri,
            onResult = { idToken, fullName ->
                showWebView = false
                isLoading = false
                if (idToken != null) {
                    onSuccess(idToken, fullName)
                }
            },
            onCancel = {
                showWebView = false
                isLoading = false
            },
            onError = { error ->
                showWebView = false
                isLoading = false
                onError?.invoke(error)
            }
        )
    }

    OutlinedButton(
        onClick = {
            if (redirectUri == null || redirectUri.startsWith("YOUR_")) {
                Log.e("AppleSignIn", "Apple redirect URI not configured in strings.xml")
                onError?.invoke("Apple Sign-In no esta configurado")
                return@OutlinedButton
            }
            isLoading = true
            showWebView = true
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp),
        shape = MaterialTheme.shapes.small,
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.Black,
            contentColor = Color.White
        ),
        border = BorderStroke(1.dp, Color.Black),
        enabled = !isLoading
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = Color.White
            )
            Spacer(modifier = Modifier.width(12.dp))
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = "\uD83C\uDF4E",
                style = MaterialTheme.typography.titleLarge
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Continuar con Apple",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun AppleSignInDialog(
    clientId: String,
    redirectUri: String,
    onResult: (idToken: String?, fullName: String?) -> Unit,
    onCancel: () -> Unit,
    onError: (String) -> Unit
) {
    val state = remember { UUID.randomUUID().toString() }

    val authUrl = remember(clientId, redirectUri, state) {
        buildString {
            append("https://appleid.apple.com/auth/authorize?")
            append("client_id=")
            append(URLEncoder.encode(clientId, "UTF-8"))
            append("&redirect_uri=")
            append(URLEncoder.encode(redirectUri, "UTF-8"))
            append("&response_type=code%20id_token")
            append("&scope=name%20email")
            append("&response_mode=fragment")
            append("&state=")
            append(state)
        }
    }

    Dialog(
        onDismissRequest = onCancel,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false
        )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Iniciar sesion con Apple",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                    IconButton(onClick = onCancel) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar")
                    }
                }

                HorizontalDivider()

                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        WebView(ctx).apply {
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.userAgentString = settings.userAgentString?.replace(
                                "wv", ""
                            )

                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(
                                    view: WebView?,
                                    request: WebResourceRequest?
                                ): Boolean {
                                    val url = request?.url?.toString() ?: return false
                                    return handleRedirect(url)
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    super.onPageFinished(view, url)
                                    if (url?.startsWith(redirectUri) == true) {
                                        view?.evaluateJavascript(
                                            "(function() { return window.location.hash.substring(1); })()"
                                        ) { hash ->
                                            val cleanHash = hash.trim('"')
                                            if (cleanHash.isNotEmpty()) {
                                                parseFragment(cleanHash)
                                            }
                                        }
                                    }
                                }

                                private fun handleRedirect(url: String): Boolean {
                                    if (!url.startsWith(redirectUri)) return false

                                    val uri = Uri.parse(url)
                                    val fragment = uri.fragment
                                    if (fragment != null) {
                                        parseFragment(fragment)
                                        return true
                                    }

                                    val error = uri.getQueryParameter("error")
                                    if (error == "user_cancelled_authorize") {
                                        onCancel()
                                        return true
                                    }
                                    if (error != null) {
                                        onError("Error al iniciar sesion con Apple")
                                        return true
                                    }

                                    return false
                                }

                                private fun parseFragment(fragment: String) {
                                    val params = fragment.split("&").mapNotNull {
                                        val parts = it.split("=", limit = 2)
                                        if (parts.size == 2) parts[0] to parts[1] else null
                                    }.toMap()

                                    val returnedState = params["state"]
                                    if (returnedState != null && returnedState != state) {
                                        onError("Error de seguridad. Intenta de nuevo.")
                                        return
                                    }

                                    val idToken = params["id_token"]
                                    if (idToken != null) {
                                        onResult(
                                            Uri.decode(idToken),
                                            null // Apple only sends name on first auth via form_post
                                        )
                                    } else {
                                        onError("No se recibio el token de Apple")
                                    }
                                }
                            }

                            loadUrl(authUrl)
                        }
                    }
                )
            }
        }
    }
}
