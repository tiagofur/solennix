import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.gradle.testing.jacoco.tasks.JacocoCoverageVerification
import org.gradle.testing.jacoco.tasks.JacocoReport

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.google.services)
    alias(libs.plugins.baselineprofile)
    alias(libs.plugins.android.junit5)
    jacoco
}

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
    compileSdk = 36

    defaultConfig {
        applicationId = "com.solennix.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "1.2.0"

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
            ndk {
                debugSymbolLevel = "FULL"
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    testOptions {
        unitTests {
            all {
                it.javaClass.methods
                    .firstOrNull { method ->
                        method.name == "setFailOnNoDiscoveredTests" && method.parameterTypes.contentEquals(arrayOf(Boolean::class.javaPrimitiveType))
                    }
                    ?.invoke(it, false)
            }
        }
    }
}

jacoco {
    toolVersion = "0.8.12"
}

val coverageExclusions = listOf(
    "**/R.class",
    "**/R$*.class",
    "**/BuildConfig.*",
    "**/Manifest*.*",
    "**/*_Factory*.*",
    "**/*_HiltModules*.*",
    "**/*Hilt*.*",
    "**/*ComposableSingletons*.*"
)

val coverageIncludes = listOf(
    "**/com/creapolis/solennix/DeepLinkRoutes*",
    "**/com/creapolis/solennix/ui/navigation/TopLevelDestination*"
)

val debugKotlinClassesDir = layout.buildDirectory.dir("tmp/kotlin-classes/debug").get().asFile
val debugJavacClassesDir = layout.buildDirectory.dir("intermediates/javac/debug/classes").get().asFile
val debugJacocoExecFile = layout.buildDirectory.file("jacoco/testDebugUnitTest.exec").get().asFile
val debugCoverageExecFile = layout.buildDirectory.file("outputs/unit_test_code_coverage/debugUnitTest/testDebugUnitTest.exec").get().asFile

tasks.register<JacocoReport>("jacocoDebugCoverageReport") {
    dependsOn("testDebugUnitTest")

    reports {
        xml.required.set(true)
        html.required.set(true)
    }

    classDirectories.setFrom(
        files(
            fileTree(debugKotlinClassesDir) {
                include(coverageIncludes)
                exclude(coverageExclusions)
            },
            fileTree(debugJavacClassesDir) {
                include(coverageIncludes)
                exclude(coverageExclusions)
            }
        )
    )
    sourceDirectories.setFrom(files("src/main/java", "src/main/kotlin"))
    executionData.setFrom(files(debugJacocoExecFile, debugCoverageExecFile))
}

tasks.register<JacocoCoverageVerification>("jacocoDebugCoverageVerification") {
    dependsOn("testDebugUnitTest")

    classDirectories.setFrom(
        files(
            fileTree(debugKotlinClassesDir) {
                include(coverageIncludes)
                exclude(coverageExclusions)
            },
            fileTree(debugJavacClassesDir) {
                include(coverageIncludes)
                exclude(coverageExclusions)
            }
        )
    )
    sourceDirectories.setFrom(files("src/main/java", "src/main/kotlin"))
    executionData.setFrom(files(debugJacocoExecFile, debugCoverageExecFile))

    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.20".toBigDecimal()
            }
        }
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
    implementation(project(":feature:staff"))
    implementation(project(":feature:events"))
    implementation(project(":feature:payments"))
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
    implementation(libs.appcompat)

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

    testImplementation(libs.junit.jupiter.api)
    testRuntimeOnly(libs.junit.jupiter.engine)
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

val releaseTaskRequested = gradle.startParameter.taskNames.any { name ->
    val lower = name.lowercase()
    ("release" in lower) && ("assemble" in lower || "bundle" in lower)
}

if (releaseTaskRequested) {
    tasks.matching { it.name.startsWith("assembleRelease") || it.name.startsWith("bundleRelease") }
        .configureEach {
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
}
