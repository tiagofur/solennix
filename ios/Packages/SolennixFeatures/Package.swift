// swift-tools-version: 6.0
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
                ])
    ]
)
