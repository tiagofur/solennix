import Foundation
import SolennixCore
import SolennixNetwork

extension EventFormViewModel {
    // MARK: - Save

    @MainActor
    public func save() async throws {
        isSaving = true
        errorMessage = nil

        defer { isSaving = false }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        var body: [String: Any] = [
            "client_id": clientId,
            "event_date": dateFormatter.string(from: eventDate),
            "service_type": serviceType.trimmingCharacters(in: .whitespacesAndNewlines),
            "num_people": numPeople,
            "status": status.rawValue,
            "discount": discount,
            "discount_type": discountType.rawValue,
            "requires_invoice": requiresInvoice,
            "tax_rate": taxRate,
            "tax_amount": taxAmount,
            "total_amount": total,
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

        let event: Event
        do {
            if isEdit, let editId {
                event = try await apiClient.put(Endpoint.event(editId), body: AnyCodable(body))
            } else {
                event = try await apiClient.post(Endpoint.events, body: AnyCodable(body))
            }
        } catch {
            HapticsHelper.play(.error)
            throw error
        }

        // Defensive validation: avoid sending malformed staff rows that can fail
        // server-side in legacy environments.
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
                "quantity": Int($0.quantity),
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

        let _: EmptyResponse = try await apiClient.put(
            Endpoint.eventItems(event.id),
            body: AnyCodable(itemsBody)
        )

        HapticsHelper.play(.success)
        NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)
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
