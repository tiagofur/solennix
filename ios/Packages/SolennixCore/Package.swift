// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SolennixCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SolennixCore", targets: ["SolennixCore"])
    ],
    targets: [
        .target(name: "SolennixCore"),
        .testTarget(
            name: "SolennixCoreTests",
            dependencies: ["SolennixCore"]
        )
    ]
)
