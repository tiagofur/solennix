import org.gradle.testing.jacoco.tasks.JacocoCoverageVerification
import org.gradle.testing.jacoco.tasks.JacocoReport

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.android.junit5)
    jacoco
}

android {
    namespace = "com.creapolis.solennix.core.model"
    compileSdk = 36

    defaultConfig {
        minSdk = 26

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
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
    kotlin { compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    } }
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
    "**/Manifest*.*"
)

val coverageIncludes = listOf(
    "**/com/creapolis/solennix/core/model/extensions/**"
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
    executionData.setFrom(
        files(debugJacocoExecFile, debugCoverageExecFile)
    )
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
    executionData.setFrom(
        files(debugJacocoExecFile, debugCoverageExecFile)
    )

    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.30".toBigDecimal()
            }
        }
    }
}

dependencies {
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit.jupiter.api)
    testRuntimeOnly(libs.junit.jupiter.engine)
    testImplementation(libs.junit.jupiter.params)
}
