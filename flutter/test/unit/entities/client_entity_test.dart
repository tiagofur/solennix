import 'package:flutter_test/flutter_test.dart';
import 'package:eventosapp/features/clients/domain/entities/client_entity.dart';

void main() {
  group('ClientEntity', () {
    const testId = 'client-1';
    const testName = 'Cliente Demo';
    const testEmail = 'cliente@demo.com';
    const testPhone = '+525512345678';
    const testAddress = 'Calle 123';
    const testCity = 'CDMX';
    const testNotes = 'Notas';
    const testTotalSpent = 2500.0;
    const testEventsCount = 3;
    final testCreatedAt = DateTime(2024, 1, 1);
    final testUpdatedAt = DateTime(2024, 1, 2);

    test('creates with required fields', () {
      final client = ClientEntity(
        id: testId,
        name: testName,
        email: testEmail,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(client.id, equals(testId));
      expect(client.name, equals(testName));
      expect(client.email, equals(testEmail));
      expect(client.phone, isNull);
      expect(client.address, isNull);
      expect(client.city, isNull);
      expect(client.notes, isNull);
      expect(client.totalSpent, equals(0));
      expect(client.eventsCount, equals(0));
    });

    test('creates with optional fields', () {
      final client = ClientEntity(
        id: testId,
        name: testName,
        email: testEmail,
        phone: testPhone,
        address: testAddress,
        city: testCity,
        notes: testNotes,
        totalSpent: testTotalSpent,
        eventsCount: testEventsCount,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(client.phone, equals(testPhone));
      expect(client.address, equals(testAddress));
      expect(client.city, equals(testCity));
      expect(client.notes, equals(testNotes));
      expect(client.totalSpent, equals(testTotalSpent));
      expect(client.eventsCount, equals(testEventsCount));
    });

    test('formattedPhone returns N/A when empty', () {
      final client = ClientEntity(
        id: testId,
        name: testName,
        email: testEmail,
        phone: '',
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(client.formattedPhone, equals('N/A'));
    });

    test('formattedLastEventDate returns default string', () {
      final client = ClientEntity(
        id: testId,
        name: testName,
        email: testEmail,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(client.formattedLastEventDate, equals('No hay eventos'));
    });

    test('toJson maps fields correctly', () {
      final client = ClientEntity(
        id: testId,
        name: testName,
        email: testEmail,
        phone: testPhone,
        address: testAddress,
        city: testCity,
        notes: testNotes,
        totalSpent: testTotalSpent,
        eventsCount: testEventsCount,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      final json = client.toJson();
      expect(json['id'], equals(testId));
      expect(json['name'], equals(testName));
      expect(json['email'], equals(testEmail));
      expect(json['phone'], equals(testPhone));
      expect(json['address'], equals(testAddress));
      expect(json['city'], equals(testCity));
      expect(json['notes'], equals(testNotes));
      expect(json['totalSpent'], equals(testTotalSpent));
      expect(json['eventsCount'], equals(testEventsCount));
      expect(json['createdAt'], equals(testCreatedAt.toIso8601String()));
      expect(json['updatedAt'], equals(testUpdatedAt.toIso8601String()));
    });
  });
}
