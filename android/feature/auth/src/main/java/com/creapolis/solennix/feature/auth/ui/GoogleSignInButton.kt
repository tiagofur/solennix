package com.creapolis.solennix.feature.auth.ui

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.creapolis.solennix.feature.auth.R
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

/**
 * Official Google Sign-In button following Google's branding guidelines:
 * https://developers.google.com/identity/branding-guidelines
 *
 * - Light theme: white background, dark text, multicolor G logo
 * - 20dp logo, 12dp padding between logo and text
 * - Roboto medium typography (we use Material's titleMedium)
 * - Disabled state while the credential flow is running
 */
@Composable
fun GoogleSignInButton(
    onSuccess: (String, String?) -> Unit,
    onError: ((String) -> Unit)? = null
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }

    // Get the Web Client ID from app resources
    val webClientId = remember {
        try {
            val resId = context.resources.getIdentifier("google_web_client_id", "string", context.packageName)
            if (resId != 0) context.getString(resId) else null
        } catch (e: Exception) {
            null
        }
    }

    OutlinedButton(
        onClick = {
            if (webClientId == null || webClientId.startsWith("YOUR_")) {
                Log.e("GoogleSignIn", "Google Web Client ID not configured in strings.xml")
                onError?.invoke(context.getString(R.string.auth_social_google_not_configured))
                return@OutlinedButton
            }

            isLoading = true
            coroutineScope.launch {
                try {
                    val googleIdOption = GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setServerClientId(webClientId)
                        .setAutoSelectEnabled(true)
                        .build()

                    val request = GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()

                    val credentialManager = CredentialManager.create(context)
                    val result = credentialManager.getCredential(
                        request = request,
                        context = context
                    )

                    val credential = result.credential
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken
                    val displayName = googleIdTokenCredential.displayName

                    onSuccess(idToken, displayName)
                } catch (e: GetCredentialCancellationException) {
                    // User cancelled — not an error
                    Log.d("GoogleSignIn", "User cancelled Google Sign-In")
                } catch (e: NoCredentialException) {
                    // No Google account on device OR SHA-1 of this APK is not
                    // registered in Firebase/Google Cloud for this applicationId.
                    Log.e(
                        "GoogleSignIn",
                        "NoCredentialException: device has no eligible Google account, " +
                            "OR this APK's signing SHA-1 is not registered for " +
                            "applicationId=${context.packageName} in Firebase Console. " +
                            "type=${e::class.java.name} msg=${e.message}",
                        e
                    )
                    onError?.invoke(context.getString(R.string.auth_social_google_no_accounts))
                } catch (e: GetCredentialException) {
                    Log.e(
                        "GoogleSignIn",
                        "GetCredentialException: type=${e.type} errorClass=${e::class.java.name} msg=${e.message}",
                        e
                    )
                    onError?.invoke(context.getString(R.string.auth_social_google_error))
                } catch (e: GoogleIdTokenParsingException) {
                    Log.e("GoogleSignIn", "Failed to parse Google ID token", e)
                    onError?.invoke(context.getString(R.string.auth_social_google_parse_error))
                } catch (e: Exception) {
                    Log.e(
                        "GoogleSignIn",
                        "Unexpected Google Sign-In failure: class=${e::class.java.name} msg=${e.message}",
                        e
                    )
                    onError?.invoke(context.getString(R.string.auth_social_google_error))
                } finally {
                    isLoading = false
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp),
        shape = MaterialTheme.shapes.small,
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.White,
            contentColor = GoogleTextColor,
        ),
        border = BorderStroke(1.dp, GoogleBorderColor),
        enabled = !isLoading
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = GoogleTextColor,
                )
            } else {
                Icon(
                    painter = painterResource(id = R.drawable.ic_google_logo),
                    contentDescription = null,
                    tint = Color.Unspecified,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = stringResource(R.string.auth_social_google_continue),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = GoogleTextColor,
            )
        }
    }
}

// Google brand colors for the Sign-In button (light theme)
private val GoogleTextColor = Color(0xFF3C4043)
private val GoogleBorderColor = Color(0xFFDADCE0)
