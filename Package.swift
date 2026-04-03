// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterFireball",
    products: [
        .library(name: "TreeSitterFireball", targets: ["TreeSitterFireball"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterFireball",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterFireballTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterFireball",
            ],
            path: "bindings/swift/TreeSitterFireballTests"
        )
    ],
    cLanguageStandard: .c11
)
