plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.google.services)
    alias(libs.plugins.baselineprofile)
}

import java.util.Properties

// Release signing config — see obsidian/Solennix/Android/Firma y Secretos de Release.md
//
// Credentials are resolved in this order:
//   1. Environment variables (CI-friendly):
//        SOLENNIX_KEYSTORE_FILE, SOLENNIX_KEYSTORE_PASSWORD,
//        SOLENNIX_KEY_ALIAS, SOLENNIX_KEY_PASSWORD
//   2. android/key.properties (local dev; gitignored)
//
// If neither is present, release signing config is NOT created and `./gradlew assembleRelease`
// will fail fast with a clear error instead of producing an unsigned APK.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

fun signingValue(key: String, envVar: String): String? {
    val fromEnv = System.getenv(envVar)
    if (!fromEnv.isNullOrBlank()) return fromEnv
    val fromFile = keystoreProperties[key] as? String
    return fromFile?.takeIf { it.isNotBlank() }
}

val releaseStoreFile = signingValue("storeFile", "SOLENNIX_KEYSTORE_FILE")
val releaseStorePassword = signingValue("storePassword", "SOLENNIX_KEYSTORE_PASSWORD")
val releaseKeyAlias = signingValue("keyAlias", "SOLENNIX_KEY_ALIAS")
val releaseKeyPassword = signingValue("keyPassword", "SOLENNIX_KEY_PASSWORD")

val hasReleaseSigningConfig = releaseStoreFile != null &&
    releaseStorePassword != null &&
    releaseKeyAlias != null &&
    releaseKeyPassword != null

// RevenueCat API key — required for any non-debug build. Resolved from:
//   1. Env var REVENUECAT_API_KEY (CI)
//   2. Gradle property REVENUECAT_API_KEY (in ~/.gradle/gradle.properties)
// If missing, debug builds compile with an empty key and log a warning; release builds fail fast.
val revenueCatApiKey: String = System.getenv("REVENUECAT_API_KEY")
    ?: (project.findProperty("REVENUECAT_API_KEY") as? String)
    ?: ""

if (revenueCatApiKey.isBlank()) {
    logger.warn(
        "⚠️  REVENUECAT_API_KEY is not set. Debug builds will compile but subscriptions " +
            "will NOT work. Set it in ~/.gradle/gradle.properties or as an env var before " +
            "building release."
    )
}

// SSL pins — required for release builds only. Same resolution as :core:network.
// `core/network/build.gradle.kts` is the one that actually emits BuildConfig.SSL_PINS; this
// check exists only to fail the :app release build early if pins are missing.
val sslPinsProperty: String = System.getenv("SOLENNIX_SSL_PINS")
    ?: (project.findProperty("SOLENNIX_SSL_PINS") as? String)
    ?: ""
val sslPinsList: List<String> = sslPinsProperty
    .split(",")
    .map { it.trim() }
    .filter { it.isNotBlank() }

android {
    namespace = "com.creapolis.solennix"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.solennix.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "REVENUECAT_API_KEY", "\"$revenueCatApiKey\"")
    }

    signingConfigs {
        if (hasReleaseSigningConfig) {
            create("release") {
                storeFile = rootProject.file(releaseStoreFile!!)
                storePassword = releaseStorePassword!!
                keyAlias = releaseKeyAlias!!
                keyPassword = releaseKeyPassword!!
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (hasReleaseSigningConfig) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:network"))
    implementation(project(":core:designsystem"))
    implementation(project(":core:database"))
    implementation(project(":core:data"))
    implementation(project(":feature:auth"))
    implementation(project(":feature:dashboard"))
    implementation(project(":feature:clients"))
    implementation(project(":feature:calendar"))
    implementation(project(":feature:search"))
    implementation(project(":feature:products"))
    implementation(project(":feature:inventory"))
    implementation(project(":feature:settings"))
    implementation(project(":feature:events"))
    implementation(project(":widget"))

    implementation(libs.kotlinx.serialization.json)
    implementation(libs.compose.material.icons)

    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.material3)
    implementation(libs.compose.material3.adaptive)
    implementation(libs.compose.material3.windowsizeclass)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.navigation.compose)

    implementation(libs.coil.compose)
    implementation(libs.coil.network.ktor)

    implementation(libs.revenuecat)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    implementation(libs.work.runtime)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    implementation(libs.profileinstaller)
    baselineProfile(project(":baselineprofile"))
}

// Fail fast on release builds if required secrets are missing.
// Prevents accidentally producing an unsigned APK, a release with empty RevenueCat key, or
// a release without SSL pinning (trivially MITM-able).
//
// NOTE: We pre-compute `missingReleaseSecrets` at configuration time as a plain
// `List<String>` so the closure captured by `doFirst` below only references serializable
// values. Referencing `hasReleaseSigningConfig` / `revenueCatApiKey` / `sslPinsList`
// directly inside the closure breaks Gradle's configuration cache — they are script
// object references that cannot be serialized.
val missingReleaseSecrets: List<String> = buildList {
    if (!hasReleaseSigningConfig) add(
        "Release signing config (SOLENNIX_KEYSTORE_* env vars or android/key.properties)"
    )
    if (revenueCatApiKey.isBlank()) add(
        "REVENUECAT_API_KEY (env var or ~/.gradle/gradle.properties)"
    )
    if (sslPinsList.size < 2) add(
        "SOLENNIX_SSL_PINS with at least 2 comma-separated sha256/<base64>= pins " +
            "(current leaf/intermediate + backup). Found ${sslPinsList.size}."
    )
}

tasks.matching { it.name.startsWith("assembleRelease") || it.name.startsWith("bundleRelease") }
    .configureEach {
        // Opt out of configuration cache for this task — the doFirst closure below
        // captures the `missingReleaseSecrets` list which, despite being a plain
        // List<String>, still triggers Gradle script object serialization errors when
        // embedded inside the task action. This only affects release tasks; debug and
        // library tasks remain configuration-cache compatible.
        notCompatibleWithConfigurationCache(
            "Release secret verification uses buildscript values that cannot be serialized"
        )
        doFirst {
            if (missingReleaseSecrets.isNotEmpty()) {
                throw GradleException(
                    "Cannot build release: missing required config:\n" +
                        missingReleaseSecrets.joinToString("\n") { "  - $it" } +
                        "\n\nSee obsidian/Solennix/Android/Firma y Secretos de Release.md"
                )
            }
        }
    }
