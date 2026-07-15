import Foundation
import XCTest
@testable import SolennixNetwork

final class OfflineMutationQueueTests: XCTestCase {

    func testEnqueueAndDequeueAllPreservesOrder() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)

        let first = QueuedMutation(
            id: "m1",
            endpoint: "/events",
            method: "POST",
            bodyBase64: nil,
            idempotencyKey: "k1",
            createdAt: Date()
        )
        let second = QueuedMutation(
            id: "m2",
            endpoint: "/events/123",
            method: "PUT",
            bodyBase64: Data("{}".utf8).base64EncodedString(),
            idempotencyKey: "k2",
            createdAt: Date().addingTimeInterval(1)
        )

        await queue.enqueue(first)
        await queue.enqueue(second)

        let dequeued = await queue.dequeueAll()
        XCTAssertEqual(dequeued.map(\.id), ["m1", "m2"])
        let after = await queue.dequeueAll()
        XCTAssertTrue(after.isEmpty)
    }

    func testReplaceOverwritesCurrentQueue() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)

        await queue.enqueue(
            QueuedMutation(
                id: "old",
                endpoint: "/events",
                method: "POST",
                bodyBase64: nil,
                idempotencyKey: "old-key",
                createdAt: Date()
            )
        )

        await queue.replace(with: [
            QueuedMutation(
                id: "new",
                endpoint: "/events/1",
                method: "DELETE",
                bodyBase64: nil,
                idempotencyKey: "new-key",
                createdAt: Date()
            )
        ])

        let dequeued = await queue.dequeueAll()
        XCTAssertEqual(dequeued.map(\.id), ["new"])
    }

    func testEnqueue_CoalescesPutByMethodAndEndpoint_KeepsLatestBody() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)
        let endpoint = "/staff/assignments/es_1/execution-state"

        await queue.enqueue(
            QueuedMutation(
                id: "a",
                endpoint: endpoint,
                method: "PUT",
                bodyBase64: Data(#"{"quick_note":"offline-A"}"#.utf8).base64EncodedString(),
                idempotencyKey: "k-a",
                createdAt: Date()
            )
        )
        await queue.enqueue(
            QueuedMutation(
                id: "b",
                endpoint: endpoint,
                method: "PUT",
                bodyBase64: Data(#"{"quick_note":"offline-B"}"#.utf8).base64EncodedString(),
                idempotencyKey: "k-b",
                createdAt: Date().addingTimeInterval(1)
            )
        )
        // Different endpoint must not be coalesced away.
        await queue.enqueue(
            QueuedMutation(
                id: "other",
                endpoint: "/staff/assignments/es_2/execution-state",
                method: "PUT",
                bodyBase64: Data(#"{}"#.utf8).base64EncodedString(),
                idempotencyKey: "k-other",
                createdAt: Date()
            )
        )

        let pending = await queue.peekAll()
        XCTAssertEqual(pending.map(\.id), ["b", "other"])
        let bodyB = Data(base64Encoded: pending[0].bodyBase64 ?? "")
        XCTAssertEqual(bodyB.flatMap { String(data: $0, encoding: .utf8) }, #"{"quick_note":"offline-B"}"#)
    }

    func testEnqueue_DoesNotCoalescePostCreates() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)

        await queue.enqueue(
            QueuedMutation(
                id: "p1",
                endpoint: "/events",
                method: "POST",
                bodyBase64: Data(#"{"name":"one"}"#.utf8).base64EncodedString(),
                idempotencyKey: "k1",
                createdAt: Date()
            )
        )
        await queue.enqueue(
            QueuedMutation(
                id: "p2",
                endpoint: "/events",
                method: "POST",
                bodyBase64: Data(#"{"name":"two"}"#.utf8).base64EncodedString(),
                idempotencyKey: "k2",
                createdAt: Date()
            )
        )

        let pending = await queue.peekAll()
        XCTAssertEqual(pending.map(\.id), ["p1", "p2"], "POST creates must remain append-only")
    }

    func testRemoveMatching_DropsQueuedPutsForSameEndpoint() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)
        let endpoint = "/staff/assignments/es_1/execution-state"

        await queue.enqueue(
            QueuedMutation(
                id: "stale",
                endpoint: endpoint,
                method: "PUT",
                bodyBase64: Data(#"{"quick_note":"stale"}"#.utf8).base64EncodedString(),
                idempotencyKey: "k-stale",
                createdAt: Date()
            )
        )
        await queue.enqueue(
            QueuedMutation(
                id: "keep",
                endpoint: "/events",
                method: "POST",
                bodyBase64: nil,
                idempotencyKey: "k-keep",
                createdAt: Date()
            )
        )

        // Simulates successful live PUT of the same endpoint after offline enqueue.
        await queue.removeMatching(method: "PUT", endpoint: endpoint)

        let pending = await queue.peekAll()
        XCTAssertEqual(pending.map(\.id), ["keep"])
        XCTAssertFalse(pending.contains { $0.id == "stale" })
    }

    /// Regression (#875 R6): flush must remove by id, never rewrite from a frozen
    /// snapshot. Simulates: peek A → concurrent removeMatching(A)+enqueue(C) →
    /// remove(id: A) must not reintroduce A or drop C.
    func testFlushRemoveById_DoesNotReintroduceRemovedOrDropConcurrentEnqueue() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)
        let endpointA = "/staff/assignments/es_a/execution-state"
        let endpointC = "/staff/assignments/es_c/execution-state"

        let mutationA = QueuedMutation(
            id: "A",
            endpoint: endpointA,
            method: "PUT",
            bodyBase64: Data(#"{"quick_note":"A"}"#.utf8).base64EncodedString(),
            idempotencyKey: "k-a",
            createdAt: Date()
        )
        await queue.enqueue(mutationA)

        // Flush peeks frozen head A (old buggy path kept a full snapshot).
        let peekedHead = await queue.peekFirst()
        XCTAssertEqual(peekedHead?.id, "A")

        // Concurrent live success drops A; a newer mutation C is enqueued.
        await queue.removeMatching(method: "PUT", endpoint: endpointA)
        await queue.enqueue(
            QueuedMutation(
                id: "C",
                endpoint: endpointC,
                method: "PUT",
                bodyBase64: Data(#"{"quick_note":"C"}"#.utf8).base64EncodedString(),
                idempotencyKey: "k-c",
                createdAt: Date()
            )
        )

        // Correct flush: remove by id only (A already gone → no-op).
        let removed = await queue.remove(id: "A")
        XCTAssertFalse(removed, "A was already removed by removeMatching")

        let pending = await queue.peekAll()
        XCTAssertEqual(pending.map(\.id), ["C"], "C must survive; A must not reappear")
        XCTAssertFalse(pending.contains { $0.id == "A" })

        // Contrast: the old replace(with: remainder-of-snapshot) would reintroduce A
        // and wipe C. Document that replace is unsafe after concurrent mutations.
        await queue.replace(with: [mutationA]) // simulate stale snapshot remainder
        let afterBadReplace = await queue.peekAll()
        XCTAssertEqual(afterBadReplace.map(\.id), ["A"], "stale replace reintroduces A / drops C")
        // Recover for isolation cleanliness.
        await queue.replace(with: [])
    }

    func testRemoveById_NoopsWhenMissing_AndRemovesWhenPresent() async {
        let defaults = makeIsolatedDefaults()
        let queue = OfflineMutationQueue(userDefaults: defaults)

        await queue.enqueue(
            QueuedMutation(
                id: "x",
                endpoint: "/events",
                method: "POST",
                bodyBase64: nil,
                idempotencyKey: "k",
                createdAt: Date()
            )
        )

        let hasX = await queue.contains(id: "x")
        XCTAssertTrue(hasX)
        let removedOnce = await queue.remove(id: "x")
        XCTAssertTrue(removedOnce)
        let stillHasX = await queue.contains(id: "x")
        XCTAssertFalse(stillHasX)
        let removedTwice = await queue.remove(id: "x")
        XCTAssertFalse(removedTwice)
        let remaining = await queue.peekAll()
        XCTAssertTrue(remaining.isEmpty)
    }

    private func makeIsolatedDefaults() -> UserDefaults {
        let suiteName = "OfflineMutationQueueTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        return defaults
    }
}
