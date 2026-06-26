// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SolennixFeatures",
    defaultLocalization: "es",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SolennixFeatures", targets: ["SolennixFeatures"])
    ],
    dependencies: [
        .package(path: "../SolennixCore"),
        .package(path: "../SolennixNetwork"),
        .package(path: "../SolennixDesign"),
        .package(url: "https://github.com/RevenueCat/purchases-ios-spm.git", from: "5.0.0"),
        .package(url: "https://github.com/getsentry/sentry-cocoa.git", from: "8.43.0"),
        // Snapshot testing harness for layout/UI behavior assertions (ADR-8).
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing.git", from: "1.17.0"),
    ],
    targets: [
        .target(name: "SolennixFeatures",
                dependencies: [
                    "SolennixCore",
                    "SolennixNetwork",
                    "SolennixDesign",
                    .product(name: "RevenueCat", package: "purchases-ios-spm"),
                    .product(name: "Sentry", package: "sentry-cocoa"),
                ],
                resources: [
                    .process("Resources"),
                ]),
        // Unit + snapshot tests for the Features package. Depends on SolennixCore
        // and SolennixNetwork directly so test doubles (e.g. MockEventAPI) can
        // import their public protocols/models.
        .testTarget(
            name: "SolennixFeaturesTests",
            dependencies: [
                .target(name: "SolennixFeatures"),
                .product(name: "SolennixCore", package: "SolennixCore"),
                .product(name: "SolennixNetwork", package: "SolennixNetwork"),
                // Needed so full-view snapshots can simulate the app's AccentColor
                // asset (brand gold) on the snapshot host — package tests cannot read
                // the app's asset catalog, so accent-governed controls (toggles,
                // segmented pickers, label buttons) would otherwise render the system
                // default instead of the inherited brand accent.
                .product(name: "SolennixDesign", package: "SolennixDesign"),
                .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
            ]
        )
    ]
)
