plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.android.junit5)
}

// SSL pinning pins for api.solennix.com, comma-separated in `sha256/<base64>=` format.
// Resolved from env var SOLENNIX_SSL_PINS or gradle property SOLENNIX_SSL_PINS.
//
// MUST contain at least 2 pins in production (current + backup) to avoid bricking the app
// on certificate rotation. Debug builds may leave this empty to allow localhost development.
//
// See: obsidian/Solennix/Android/Firma y Secretos de Release.md (section "SSL Pinning")
val sslPins: String = System.getenv("SOLENNIX_SSL_PINS")
    ?: (project.findProperty("SOLENNIX_SSL_PINS") as? String)
    ?: ""

android {
    namespace = "com.creapolis.solennix.core.network"
    compileSdk = 35

    defaultConfig {
        minSdk = 26

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")

        buildConfigField("String", "API_BASE_URL", "\"https://api.solennix.com/api/\"")
        buildConfigField("String", "API_HOST", "\"api.solennix.com\"")
        buildConfigField("String", "SSL_PINS", "\"$sslPins\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
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
        buildConfig = true
    }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

dependencies {
    implementation(project(":core:model"))

    // Ktor
    api(libs.ktor.client.core)
    api(libs.ktor.client.okhttp)
    api(libs.ktor.client.content.negotiation)
    api(libs.ktor.serialization.json)
    api(libs.ktor.client.auth)
    api(libs.ktor.client.logging)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    // Security
    implementation(libs.security.crypto)
    implementation(libs.biometric)

    // DataStore
    implementation(libs.datastore.preferences)

    // Testing
    testImplementation(libs.junit.jupiter.api)
    testRuntimeOnly(libs.junit.jupiter.engine)
    testImplementation(libs.junit.jupiter.params)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.ktor.client.mock)
}
