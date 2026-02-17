import 'package:flutter_test/flutter_test.dart';
import 'package:eventosapp/features/auth/domain/entities/user_entity.dart';

void main() {
  group('UserEntity', () {
    const testId = 'user-1';
    const testEmail = 'user@example.com';
    const testName = 'Usuario Demo';
    const testPlan = 'premium';
    const testBusinessName = 'Eventos Demo';
    final testCreatedAt = DateTime(2024, 1, 1);
    final testUpdatedAt = DateTime(2024, 1, 2);

    test('creates with required fields', () {
      final user = UserEntity(
        id: testId,
        email: testEmail,
        name: testName,
        plan: testPlan,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(user.id, equals(testId));
      expect(user.email, equals(testEmail));
      expect(user.name, equals(testName));
      expect(user.plan, equals(testPlan));
    });

    test('creates with optional fields', () {
      final user = UserEntity(
        id: testId,
        email: testEmail,
        name: testName,
        businessName: testBusinessName,
        defaultDepositPercent: 30.0,
        defaultCancellationDays: 3.0,
        defaultRefundPercent: 100.0,
        plan: testPlan,
        stripeCustomerId: 'stripe-1',
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(user.businessName, equals(testBusinessName));
      expect(user.defaultDepositPercent, equals(30.0));
      expect(user.isPremium, isTrue);
    });

    test('displayName uses businessName when available', () {
      final user = UserEntity(
        id: testId,
        email: testEmail,
        name: testName,
        businessName: testBusinessName,
        plan: testPlan,
        createdAt: testCreatedAt,
        updatedAt: testUpdatedAt,
      );

      expect(user.displayName, equals(testBusinessName));
    });
  });
}
