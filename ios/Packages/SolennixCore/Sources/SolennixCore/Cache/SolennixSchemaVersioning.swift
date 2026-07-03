import Foundation
import SwiftData

// MARK: - Versioned schema
//
// SwiftData evolves the store via lightweight migrations as long as the
// aggregate changes stay within automatic-migration capabilities. Without a
// `VersionedSchema`, the container has no concept of "version", so any model
// change in a future build risks failing to open an existing store (the app
// then falls back to the in-memory cache, losing the user's offline data).
//
// By pinning the current models as `SchemaV1` and providing a (currently
// empty) `SolennixMigrationPlan`, the container:
//   - opens existing unversioned stores as V1 with no migration needed (the
//     models are identical);
//   - has the hook ready for the next model change: bump to `SchemaV2`, add a
//     `.lightweight`/`.custom` stage, and existing stores migrate cleanly
//     instead of dropping to the in-memory fallback.

/// Version 1 of the offline-cache schema — the five cached models shipped in
/// iOS 1.3.0 (build 8). When a model gains/renames/loses a property, define
/// `SchemaV2` mirroring the new shape and add a migration stage to
/// `SolennixMigrationPlan`.
public enum SchemaV1: VersionedSchema {
    public static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }

    public static var models: [any PersistentModel.Type] {
        [
            CachedClient.self,
            CachedEvent.self,
            CachedProduct.self,
            CachedInventoryItem.self,
            CachedPayment.self
        ]
    }

    public static var schema: Schema {
        Schema(models)
    }
}

// MARK: - Migration plan

/// The app's schema-evolution plan. Currently single-version (V1 → V1): no
/// stages are needed because no breaking model change has shipped since the
/// schema was versioned. Add a `MigrationStage` here the next time a cached
/// `@Model` changes shape.
public enum SolennixMigrationPlan: SchemaMigrationPlan {
    public static var schemas: [any VersionedSchema.Type] {
        [SchemaV1.self]
    }

    public static var stages: [MigrationStage] { [] }
}
