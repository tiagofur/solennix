import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() {
    return 'ApiException: $message (statusCode: $statusCode)';
  }

  factory ApiException.fromDioError(DioException error) {
    String message;
    int? statusCode;
    dynamic data;

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message = 'Tiempo de conexion agotado';
        break;
      case DioExceptionType.badResponse:
        statusCode = error.response?.statusCode;
        data = error.response?.data;
        message = _mapStatusCodeToMessage(statusCode, error.response);
        break;
      case DioExceptionType.cancel:
        message = 'Peticion cancelada';
        break;
      case DioExceptionType.connectionError:
        message = 'Error de conexion';
        break;
      case DioExceptionType.badCertificate:
        message = 'Error de certificado SSL';
        break;
      case DioExceptionType.unknown:
      default:
        message = error.message ?? 'Error desconocido';
    }

    return ApiException(
      message: message,
      statusCode: statusCode,
      data: data,
    );
  }

  static String _mapStatusCodeToMessage(int? statusCode, dynamic response) {
    final detail = _extractErrorMessage(response);
    switch (statusCode) {
      case 400:
        return 'Solicitud invalida. $detail';
      case 401:
        return 'Sesion expirada, inicia sesion de nuevo.';
      case 403:
        return 'No tienes permiso para esta accion.';
      case 404:
        return 'Recurso no encontrado.';
      case 409:
        return 'Conflicto: el recurso ya existe.';
      case 422:
        return 'Datos invalidos. $detail';
      case 429:
        return 'Demasiadas solicitudes, espera un momento.';
      default:
        if (statusCode != null && statusCode >= 500) {
          return 'Error interno del servidor.';
        }
        return detail;
    }
  }

  static String _extractErrorMessage(dynamic response) {
    if (response?.data is Map<String, dynamic>) {
      final data = response!.data as Map<String, dynamic>;
      return data['details']?.toString() ??
          data['error']?.toString() ??
          data['message']?.toString() ??
          'Error en la respuesta del servidor';
    }
    return response?.data?.toString() ?? 'Error en la respuesta del servidor';
  }

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode != null && statusCode! >= 500;
}
