import Foundation
import SolennixCore
import SolennixNetwork

extension EventFormViewModel {
    // MARK: - Save

    @MainActor
    public func save() async throws {
        guard !isSaving else { return }
        isSaving = true
        errorMessage = nil

        defer { isSaving = false }

        // Blocked-date save guard (ADR-4): short-circuit BEFORE building the
        // request body or hitting the network when the selected eventDate falls
        // inside an unavailable range. `unavailableDateFor` compares
        // `Date.utcDayFormatter.string(from: eventDate)` against the server
        // ranges — eventDate is UTC-midnight, so a UTC formatter is the correct
        // key and stays in sync with the grid's `isDateBlocked` (LOCAL string
        // of the matching cell). Mirrors Android/Web client-side interception.
        if unavailableDateFor(eventDate) != nil {
            errorMessage = tr("events.form.error.unavailable_date", "La fecha seleccionada no está disponible.")
            HapticsHelper.play(.error)
            return
        }

        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.dateFormat = "yyyy-MM-dd"
        // Pin to UTC — matches fromServerDay parse contract so the calendar day
        // round-trips correctly for users in negative UTC-offset zones (MX = UTC-6).
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)

        let timeFormatter = DateFormatter()
        timeFormatter.locale = Locale(identifier: "en_US_POSIX")
        timeFormatter.dateFormat = "HH:mm"

        // Round all money fields to 2 decimal places before sending.
        // Backend validation rejects |client − server| > 0.01 (crud_handler.go:805).
        let clampedDiscount: Double
        switch discountType {
        case .percent: clampedDiscount = max(0, min(100, discount))
        case .fixed:   clampedDiscount = max(0, min(discount, discountableBase))
        }

        var body: [String: Any] = [
            "client_id": clientId,
            "event_date": dateFormatter.string(from: eventDate),
            "service_type": serviceType.trimmingCharacters(in: .whitespacesAndNewlines),
            "num_people": numPeople,
            "status": status.rawValue,
            "discount": clampedDiscount,
            "discount_type": discountType.rawValue,
            "requires_invoice": requiresInvoice,
            "tax_rate": taxRate,
            "tax_amount": EventFinancials.round2(taxAmount),
            "total_amount": EventFinancials.round2(total),
            "deposit_percent": depositPercent,
            "cancellation_days": cancellationDays,
            "refund_percent": refundPercent,
        ]

        if let startTime {
            body["start_time"] = timeFormatter.string(from: startTime)
        }
        if let endTime {
            body["end_time"] = timeFormatter.string(from: endTime)
        }

        let trimmedLocation = location.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedLocation.isEmpty {
            body["location"] = trimmedLocation
        }

        let trimmedCity = city.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedCity.isEmpty {
            body["city"] = trimmedCity
        }

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedNotes.isEmpty {
            body["notes"] = trimmedNotes
        }

        // Defensive validation: avoid sending malformed staff rows that can fail
        // server-side in legacy environments. This runs BEFORE the repository
        // call because the repository's `create`/`update` take BOTH bodies
        // atomically (POST /events then PUT /events/{id}/items) — `itemsBody`
        // below uses `normalizedStaff`, so it must be built up front. Net effect
        // vs. the old ordering: invalid staff now fails fast instead of leaving
        // an orphan event behind on the server (strictly better).
        var normalizedStaff = [SelectedStaffAssignment]()
        for (idx, assignment) in selectedStaff.enumerated() {
            let trimmedId = assignment.staffId.trimmingCharacters(in: .whitespacesAndNewlines)
            
            // Validate UUID
            if UUID(uuidString: trimmedId) == nil {
                HapticsHelper.play(.error)
                throw APIError.serverError(
                    statusCode: 400,
                    message: tr("events.form.error.staff_invalid_id", "Personal #\(idx + 1): ID inválido")
                )
            }
            
            // Validate fee >= 0
            if assignment.feeAmount < 0 {
                HapticsHelper.play(.error)
                throw APIError.serverError(
                    statusCode: 400,
                    message: tr("events.form.error.staff_fee_negative", "Personal #\(idx + 1): El pago no puede ser negativo")
                )
            }
            
            normalizedStaff.append(assignment)
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]

        let itemsBody: [String: Any] = [
            "products": selectedProducts.map { [
                "product_id": $0.productId,
                "quantity": $0.quantity,  // send as Double — backend stores float64
                "unit_price": $0.unitPrice,
                "discount": $0.discount
            ] },
            "extras": extras.map { [
                "description": $0.description,
                "cost": $0.cost,
                "price": $0.price,
                "exclude_utility": $0.excludeUtility,
                "include_in_checklist": $0.includeInChecklist
            ] },
            "equipment": selectedEquipment.map { [
                "inventory_id": $0.inventoryId,
                "quantity": $0.quantity,
                "notes": $0.notes
            ] },
            "supplies": selectedSupplies.map { [
                "inventory_id": $0.inventoryId,
                "quantity": $0.quantity,
                "unit_cost": $0.unitCost,
                "source": $0.source.rawValue,
                "exclude_cost": $0.excludeCost
            ] },
            "staff": normalizedStaff.map { assignment -> [String: Any] in
                let staffID = assignment.staffId.trimmingCharacters(in: .whitespacesAndNewlines)
                var dict: [String: Any] = [
                    "staff_id": staffID,
                    "fee_amount": assignment.feeAmount,
                    "status": assignment.status.rawValue,
                ]
                let trimmedRole = assignment.roleOverride.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedRole.isEmpty {
                    dict["role_override"] = trimmedRole
                }
                let trimmedNotes = assignment.notes.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedNotes.isEmpty {
                    dict["notes"] = trimmedNotes
                }
                if let start = assignment.shiftStart {
                    dict["shift_start"] = iso.string(from: start)
                    if let rawEnd = assignment.shiftEnd {
                        let end = rawEnd <= start
                            ? Calendar.current.date(byAdding: .day, value: 1, to: rawEnd) ?? rawEnd
                            : rawEnd
                        dict["shift_end"] = iso.string(from: end)
                    }
                } else if let end = assignment.shiftEnd {
                    dict["shift_end"] = iso.string(from: end)
                }
                return dict
            }
        ]

        // Route the mutation through the EventRepository (ADR-2/ADR-9). The
        // repository preserves the EXACT two-call body shape verbatim —
        // POST /events then PUT /events/{id}/items for create, or
        // PUT /events/{id} then PUT /events/{id}/items for edit — and fans the
        // write out to the system calendar. No `EventDraft` type is introduced.
        do {
            // Capture the saved event so we can mirror it into the widget cache
            // before posting `.solennixEventUpdated` (#804). The repository
            // returns the authoritative server record (with assigned id,
            // auto-confirmed status, etc.), which is exactly what the cache
            // should hold.
            let saved: Event
            if isEdit, let editId {
                saved = try await eventRepository.update(
                    editId,
                    body: AnyCodable(body),
                    itemsBody: AnyCodable(itemsBody)
                )
            } else {
                saved = try await eventRepository.create(
                    eventBody: AnyCodable(body),
                    itemsBody: AnyCodable(itemsBody)
                )
            }
            // Mirror into the widget cache BEFORE posting: the notification
            // triggers `WidgetSyncCoordinator.syncAll()` synchronously on the
            // main thread, so the cache must hold the new event when that
            // handler runs — otherwise the widget stays stale until the next
            // list load / background refresh (#804).
            mirrorEventToCache(saved)
        } catch {
            HapticsHelper.play(.error)
            throw error
        }

        HapticsHelper.play(.success)
        NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)
        takeSnapshot()
    }

    // MARK: - Step Navigation

    public func nextStep() {
        guard currentStep < 5 else { return }
        if currentStep == 1 && !isStep1Valid { return }
        currentStep += 1
    }

    public func previousStep() {
        guard currentStep > 1 else { return }
        currentStep -= 1
    }

    // MARK: - Error Mapping

    func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? tr("events.form.error.unexpected", "Ocurrió un error inesperado.")
        }
        return tr("events.form.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}
