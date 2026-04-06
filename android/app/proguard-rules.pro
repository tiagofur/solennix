# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\Users\tfurt\AppData\Local\Android\Sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.kts.

# Keep Kotlin Serialization models
-keepattributes *Annotation*, EnclosingMethod, Signature, InnerClasses
-keep @kotlinx.serialization.Serializable class ** { *; }
-keepclassmembers class **@kotlinx.serialization.Serializable {
    *** Companion;
    *** Serializer;
}
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class kotlinx.serialization.** { *; }
-keep class com.creapolis.solennix.core.model.** { *; }

# Keep Hilt
-keep class com.creapolis.solennix.**_HiltModules { *; }

# Keep Room
-keep class * extends androidx.room.RoomDatabase
-keep class androidx.room.Room

# Ktor Client
-keep class io.ktor.** { *; }
-keepclassmembers class io.ktor.** { *; }
-dontwarn io.ktor.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile **;
}

# Coil image loading
-keep class coil3.** { *; }
-dontwarn coil3.**

# OkHttp (used by Ktor)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Kotlin Reflect
-dontwarn kotlin.reflect.**

# App models - keep all serializable data classes
-keepclassmembers class com.creapolis.solennix.core.model.** { *; }
