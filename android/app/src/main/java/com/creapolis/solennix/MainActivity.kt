package com.creapolis.solennix

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.fragment.app.FragmentActivity
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SolennixTheme {
                MainNavHost(deepLinkIntent = intent)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Recomponer con el nuevo intent de deep link
        setContent {
            SolennixTheme {
                MainNavHost(deepLinkIntent = intent)
            }
        }
    }
}
