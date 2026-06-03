-keepattributes *Annotation*, EnclosingMethod, Signature, InnerClasses
-keep @kotlinx.serialization.Serializable class * { *; }
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class kotlinx.serialization.** { *; }
-keep class com.creapolis.solennix.core.model.** { *; }

-keep class com.creapolis.solennix.**_HiltModules { *; }

-keep class * extends androidx.room.RoomDatabase
-keep class androidx.room.Room

-keep class io.ktor.** { *; }
-keepclassmembers class io.ktor.** { *; }
-dontwarn io.ktor.**

-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler
-keepclassmembers class kotlinx.coroutines.** { *; }

-keep class coil3.** { *; }
-dontwarn coil3.**

-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

-dontwarn kotlin.reflect.**

-keepclassmembers class com.creapolis.solennix.core.model.** { *; }
