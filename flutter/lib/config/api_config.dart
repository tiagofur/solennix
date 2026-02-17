class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8080',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
  static const Duration sendTimeout = Duration(seconds: 15);

  // Endpoints
  static const String auth = '/api/auth';
  static const String users = '/api/users';
  static const String clients = '/api/clients';
  static const String events = '/api/events';
  static const String products = '/api/products';
  static const String inventory = '/api/inventory';
  static const String payments = '/api/payments';
  static const String dashboard = '/api/dashboard';
  static const String search = '/api/search';
}
