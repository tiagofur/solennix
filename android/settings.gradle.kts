pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Solennix"
include(":app")
include(":core:model")
include(":core:network")
include(":core:designsystem")
include(":core:database")
include(":core:data")
include(":feature:auth")
include(":feature:dashboard")
include(":feature:clients")
include(":feature:calendar")
include(":feature:search")
include(":feature:events")
include(":feature:products")
include(":feature:inventory")
include(":feature:settings")
include(":feature:staff")
include(":feature:payments")
include(":widget")
include(":baselineprofile")
