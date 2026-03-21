// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SolennixNetwork",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SolennixNetwork", targets: ["SolennixNetwork"])
    ],
    dependencies: [
        .package(path: "../SolennixCore"),
        .package(url: "https://github.com/RevenueCat/purchases-ios-spm.git", from: "5.0.0"),
    ],
    targets: [
        .target(name: "SolennixNetwork", dependencies: [
            "SolennixCore",
            .product(name: "RevenueCat", package: "purchases-ios-spm"),
        ])
    ]
)
