import 'package:flutter_test/flutter_test.dart';
import 'package:eventosapp/features/events/domain/entities/event_entity.dart';

void main() {
  group('EventEntity', () {
    const testId = 'event-1';
    const testClientId = 'client-1';
    const testClientName = 'Cliente Demo';
    const testServiceType = 'Boda';
    final testDate = DateTime(2024, 6, 15);
    const testStartTime = '14:00';
    const testEndTime = '18:00';
    const testLocation = 'Salon Principal';
    const testStatus = 'confirmed';
    final testCreatedAt = DateTime(2024, 1, 1);
    final testUpdatedAt = DateTime(2024, 1, 2);

    test('creates with required fields', () {
      final event = EventEntity(
        id: testId,
        clientId: testClientId,
        clientName: testClientName,
        eventDate: testDate,
        startTime: testStartTime,
        endTime: testEndTime,
        location: testLocation,
        serviceType: testServiceType,
        numPeople: 100,
        status: testStatus,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(event.id, equals(testId));
      expect(event.serviceType, equals(testServiceType));
      expect(event.totalAmount, equals(0));
      expect(event.depositPercent, equals(0));
    });

    test('status getters work', () {
      final event = EventEntity(
        id: testId,
        clientId: testClientId,
        clientName: testClientName,
        eventDate: testDate,
        startTime: testStartTime,
        endTime: testEndTime,
        location: testLocation,
        serviceType: testServiceType,
        numPeople: 100,
        status: 'quoted',
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(event.isQuoted, isTrue);
      expect(event.isConfirmed, isFalse);
    });

    test('payment calculations', () {
      final payment1 = Payment(
        id: 'p1',
        eventId: testId,
        paymentDate: DateTime(2024, 1, 10),
        amount: 5000,
      );
      final payment2 = Payment(
        id: 'p2',
        eventId: testId,
        paymentDate: DateTime(2024, 1, 15),
        amount: 3000,
      );

      final event = EventEntity(
        id: testId,
        clientId: testClientId,
        clientName: testClientName,
        eventDate: testDate,
        startTime: testStartTime,
        endTime: testEndTime,
        location: testLocation,
        serviceType: testServiceType,
        numPeople: 100,
        status: testStatus,
        totalAmount: 20000,
        depositPercent: 30,
        payments: [payment1, payment2],
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(event.collectedAmount, equals(8000));
      expect(event.pendingAmount, equals(12000));
      expect(event.depositAmount, equals(6000));
      expect(event.remainingDeposit, equals(-2000));
    });
  });
}
