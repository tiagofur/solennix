# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\Users\tfurt\AppData\Local\Android\Sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.kts.

# Keep Kotlin Serialization models
-keepattributes *Annotation*, EnclosingMethod, Signature
-keepclassmembers class **@kotlinx.serialization.Serializable {
    *** Companion;
}
-keepclassmembers class **@kotlinx.serialization.Serializable {
    *** Companion;
}
-keep class com.creapolis.solennix.core.model.** { *; }

# Keep Hilt
-keep class com.creapolis.solennix.**_HiltModules { *; }

# Keep Room
-keep class * extends androidx.room.RoomDatabase
-keep class androidx.room.Room
