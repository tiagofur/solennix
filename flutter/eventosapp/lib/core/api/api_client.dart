import 'package:dio/dio.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient({required String baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: true,
    ));

    _dio.interceptors.add(
      LogInterceptor(),
    );
  }

  Dio get dio => _dio;
}

class LogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    print('REQUEST: ${options.method} ${options.uri}');
    print('HEADERS: ${options.headers}');
    print('DATA: ${options.data}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    print('RESPONSE: ${response.statusCode} ${response.uri}');
    print('DATA: ${response.data}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    print('ERROR: ${err.message}');
    handler.next(err);
  }
}

class ApiException implements Exception {
  final int? statusCode;
  final String? message;
  final dynamic data;

  ApiException({
    this.statusCode,
    this.message,
    this.data,
  });

  @override
  String toString() {
    return 'ApiException: $statusCode - $message';
  }
}

void handleError(DioException error) {
  if (error.type == DioExceptionType.connectionTimeout) {
    throw ApiException(
      statusCode: null,
      message: 'Tiempo de conexión agotado. Verifica tu internet.',
    );
  }

  if (error.type == DioExceptionType.receiveTimeout) {
    throw ApiException(
      statusCode: null,
      message: 'Tiempo de espera agotado. Intenta de nuevo.',
    );
  }

  if (error.response != null) {
    final statusCode = error.response!.statusCode;
    final message = _getErrorMessage(statusCode);

    throw ApiException(
      statusCode: statusCode,
      message: message,
      data: error.response!.data,
    );
  }

  throw ApiException(
    statusCode: null,
    message: error.message ?? 'Error desconocido. Intenta de nuevo.',
  );
}

String _getErrorMessage(int? statusCode) {
  switch (statusCode) {
    case 400:
      return 'Solicitud inválida. Verifica los datos.';
    case 401:
      return 'No autorizado. Inicia sesión nuevamente.';
    case 403:
      return 'Acceso denegado.';
    case 404:
      return 'Recurso no encontrado.';
    case 409:
      return 'El recurso ya existe.';
    case 500:
      return 'Error del servidor. Intenta más tarde.';
    case 503:
      return 'Servicio no disponible. Intenta más tarde.';
    default:
      return 'Error al conectar con el servidor.';
  }
}
