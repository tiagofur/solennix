// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SolennixCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SolennixCore", targets: ["SolennixCore"])
    ],
    targets: [
        .target(name: "SolennixCore")
    ]
)
