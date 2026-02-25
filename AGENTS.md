# Guía para Agentes IA — EventosApp

Este documento contiene guías específicas para agentes que trabajan en el proyecto EventosApp.

## 📋 Resumen del Proyecto

EventosApp es una aplicación SaaS para organizadores de eventos (catering, banquetes, fiestas) que permite gestionar:
- Clientes y eventos
- Catálogo de productos con recetas
- Inventario de ingredientes
- Cotizaciones con IVA
- Pagos y abonos
- Calendario de eventos

### Stack Tecnológico

- **Frontend Web**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Go 1.25 + Chi router + PostgreSQL + pgx
- **State Management**: Zustand (web), React Hook Form + Zod (forms)
- **Testing**: Vitest + Testing Library (unit), Playwright (E2E)
- **Despliegue**: Docker Compose, Vercel-ready (web)

---

## 🎯 Objetivos de los Agentes

Los agentes IA pueden ayudar en:

1. **Desarrollo de Features**: Implementar nuevas funcionalidades siguiendo Clean Architecture
2. **Documentación**: Mantener y expandir la documentación en `/docs`
3. **Testing**: Escribir y ejecutar pruebas E2E con Playwright
4. **Refactoring**: Mejorar código existente manteniendo consistencia
5. **Bug Fixes**: Investigar y resolver issues reportados
6. **Code Review**: Analizar pull requests y sugerir mejoras

---

## 🏗️ Arquitectura del Proyecto

### Frontend Web (`web/`)

```
web/
├── src/
│   ├── components/    # Componentes reutilizables
│   ├── contexts/      # Contextos React (Auth, Theme)
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilidades compartidas
│   ├── pages/         # Páginas de la app
│   ├── services/      # Servicios de API (Supabase)
│   └── types/         # Tipos TypeScript
├── public/            # Archivos estáticos
└── tests/             # Tests E2E con Playwright
```

### Frontend Mobile (`flutter/`)

```
flutter/
├── lib/
│   ├── core/          # Configuración, API, Storage
│   ├── features/      # Features del negocio (Clean Arch)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── clients/
│   │   ├── products/
│   │   └── inventory/
│   ├── shared/        # Widgets y providers compartidos
│   └── config/        # Configuración global
├── test/              # Tests unit, widget, integration
└── pubspec.yaml       # Dependencias
```

---

## 🔧 Comandos de Desarrollo

### Web (React)

```bash
# Instalar dependencias
cd web && npm install

# Desarrollo
npm run dev

# Tests E2E
npm run test:e2e
npm run test:e2e:ui

# Build
npm run build
```

### Mobile (Flutter)

```bash
# Instalar dependencias
cd flutter && flutter pub get

# Ejecutar app
flutter run

# Tests
flutter test

# Build
flutter build apk --release
flutter build ios --release

# Code generation (si usas json_serializable)
flutter pub run build_runner build
```

---

## 📝 Convenciones de Código

### TypeScript (Web)

- **Nombres de archivos**: `camelCase.tsx` (componentes) o `kebab-case.ts` (utilidades)
- **Componentes**: `PascalCase` (`UserProfile.tsx`)
- **Variables/Funciones**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Interfaces/Types**: `PascalCase` con prefijo `I` (opcional) o sin prefijo

### Dart (Flutter)

- **Nombres de archivos**: `snake_case.dart`
- **Clases**: `PascalCase`
- **Variables/Métodos**: `camelCase`
- **Constantes**: `lowerCamelCase` o `UPPER_SNAKE_CASE` (globales)
- **Privados**: `_camelCase`

---

## 🚀 Guías por Tarea

### Agregar Nueva Feature (Web)

1. **Crear tipo en `types/`**:
   ```typescript
   // src/types/feature.ts
   export interface MyFeature {
     id: string;
     name: string;
     // ...
   }
   ```

2. **Crear servicio en `services/`**:
   ```typescript
   // src/services/myFeatureService.ts
   import { supabase } from './supabase';

   export const myFeatureService = {
     async getAll() {
       const { data, error } = await supabase
         .from('my_feature')
         .select('*');
       if (error) throw error;
       return data;
     },
   };
   ```

3. **Crear hook en `hooks/`** (opcional):
   ```typescript
   // src/hooks/useMyFeature.ts
   import { useQuery } from '@tanstack/react-query';
   import { myFeatureService } from '../services/myFeatureService';

   export function useMyFeature() {
     return useQuery({
       queryKey: ['my-feature'],
       queryFn: myFeatureService.getAll,
     });
   }
   ```

4. **Crear componente en `components/`**:
   ```typescript
   // src/components/MyFeature.tsx
   export function MyFeature() {
     const { data, isLoading } = useMyFeature();

     if (isLoading) return <div>Cargando...</div>;

     return (
       <div>
         {data?.map(item => (
           <div key={item.id}>{item.name}</div>
         ))}
       </div>
     );
   }
   ```

5. **Crear página en `pages/`** (si aplica):
   ```typescript
   // src/pages/MyFeaturePage.tsx
   export function MyFeaturePage() {
     return <MyFeature />;
   }
   ```

6. **Agregar ruta en `App.tsx`**

### Agregar Nueva Feature (Flutter)

1. **Crear estructura de feature**:
   ```
   lib/features/my_feature/
   ├── data/
   │   ├── models/my_feature_model.dart
   │   └── repositories/my_feature_repository_impl.dart
   ├── domain/
   │   ├── entities/my_feature_entity.dart
   │   ├── repositories/my_feature_repository.dart
   │   └── usecases/get_my_features_usecase.dart
   └── presentation/
       ├── pages/my_feature_page.dart
       ├── providers/my_feature_provider.dart
       └── widgets/my_feature_card.dart
   ```

2. **Crear Entity en `domain/entities/`**:
   ```dart
   class MyFeatureEntity {
     final String id;
     final String name;

     const MyFeatureEntity({
       required this.id,
       required this.name,
     });
   }
   ```

3. **Crear Model en `data/models/`**:
   ```dart
   class MyFeatureModel {
     final String id;
     final String name;

     MyFeatureModel({required this.id, required this.name});

     factory MyFeatureModel.fromJson(Map<String, dynamic> json) {
       return MyFeatureModel(
         id: json['id'],
         name: json['name'],
       );
     }

     MyFeatureEntity toEntity() {
       return MyFeatureEntity(id: id, name: name);
     }
   }
   ```

4. **Crear Repository interface en `domain/repositories/`**:
   ```dart
   abstract class MyFeatureRepository {
     Future<List<MyFeatureEntity>> getAll();
   }
   ```

5. **Crear Repository implementation en `data/repositories/`**:
   ```dart
   class MyFeatureRepositoryImpl implements MyFeatureRepository {
     final ApiClient _apiClient;

     MyFeatureRepositoryImpl(this._apiClient);

     @override
     Future<List<MyFeatureEntity>> getAll() async {
       final response = await _apiClient.get('/my-feature');
       return response.map((e) => MyFeatureModel.fromJson(e).toEntity()).toList();
     }
   }
   ```

6. **Crear Provider en `presentation/providers/`**:
   ```dart
   final myFeatureProvider = FutureProvider.autoDispose<List<MyFeatureEntity>>((ref) async {
     final repository = ref.watch(myFeatureRepositoryProvider);
     return repository.getAll();
   });
   ```

7. **Crear Page en `presentation/pages/`**:
   ```dart
   class MyFeaturePage extends ConsumerWidget {
     @override
     Widget build(BuildContext context, WidgetRef ref) {
       final features = ref.watch(myFeatureProvider);

       return features.when(
         data: (data) => ListView.builder(
           itemCount: data.length,
           itemBuilder: (context, index) => ListTile(title: Text(data[index].name)),
         ),
         loading: () => Center(child: CircularProgressIndicator()),
         error: (error, stack) => Center(child: Text('Error')),
       );
     }
   }
   ```

---

## 🧪 Guías de Testing

### Tests E2E (Playwright - Web)

1. **Crear test en `tests/`**:
   ```typescript
   // web/tests/example.spec.ts
   import { test, expect } from '@playwright/test';

   test('should load dashboard', async ({ page }) => {
     await page.goto('/dashboard');
     await expect(page.locator('h1')).toContainText('Dashboard');
   });
   ```

2. **Ejecutar tests**:
   ```bash
   npm run test:e2e
   npm run test:e2e:ui  # Interactivo
   ```

### Tests Flutter

1. **Unit tests**:
   ```dart
   // test/unit/my_feature_test.dart
   test('should calculate total correctly', () {
     final entity = MyFeatureEntity(id: '1', name: 'Test');
     expect(entity.name, 'Test');
   });
   ```

2. **Widget tests**:
   ```dart
   // test/widgets/my_feature_widget_test.dart
   testWidgets('should display name', (tester) async {
     await tester.pumpWidget(MyFeatureWidget(name: 'Test'));
     expect(find.text('Test'), findsOneWidget);
   });
   ```

3. **Integration tests**:
   ```dart
   // test_integration/app_test.dart
   testWidgets('should navigate to dashboard', (tester) async {
     await tester.pumpWidget(MyApp());
     await tester.tap(find.text('Iniciar'));
     await tester.pumpAndSettle();
     expect(find.text('Dashboard'), findsOneWidget);
   });
   ```

---

## 🔒 Seguridad Importante

- **Nunca** exponer credenciales en código
- **Siempre** usar RLS (Row Level Security) en Supabase
- **Validar** inputs en frontend y backend
- **Sanitizar** datos antes de mostrarlos
- **Usar** parámetros en queries SQL (evitar concatenación)

---

## 📚 Recursos de Referencia

### Documentación del Proyecto

- [README principal](../README.md)
- [Documentación Flutter](../docs/flutter/README.md)
- [Arquitectura del sistema](../docs/README.md)
- [Guía de despliegue](../docs/deploy.md)
- [Checklist MVP](../docs/mvp-checklist.md)

### Stack Tecnológico

- [React docs](https://react.dev)
- [TypeScript docs](https://www.typescriptlang.org/docs)
- [Flutter docs](https://docs.flutter.dev)
- [Riverpod docs](https://riverpod.dev)
- [Supabase docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright docs](https://playwright.dev)

---

## ✅ Checklist Antes de Commits

- [ ] Código sigue convenciones del proyecto
- [ ] Tests pasan (`npm test` o `flutter test`)
- [ ] Sin console.log en producción
- [ ] Types de TypeScript sin errores
- [ ] Linting pasa (`npm run lint` o `flutter analyze`)
- [ ] Documentación actualizada si aplica
- [ ] Cambios en `package.json`/`pubspec.yaml` documentados

---

## 🐛 Flujo de Reporte de Bugs

1. **Describir el problema** claramente
2. **Pasos para reproducir**
3. **Comportamiento esperado vs actual**
4. **Screenshots/videos** si aplica
5. **Stack trace** de errores
6. **Environment** (OS, navegador, Flutter version)

---

## 💡 Tips para Agentes

- **Explora primero**: Usa `grep` o `glob` para encontrar código existente antes de crear nuevo
- **Sigue patrones**: Mira cómo se implementan features similares
- **Piensa en reutilización**: Crea componentes genéricos cuando sea posible
- **Documenta**: Agrega comentarios en código complejo
- **Testea**: Escribe tests para funcionalidades críticas
- **Pregunta**: Si no estás seguro de algo, pregunta antes de hacer cambios destructivos

---

## 📞 Contacto y Soporte

Para dudas o problemas con este proyecto:
- Revisar issues en el repositorio
- Consultar documentación en `/docs`
- Contactar al equipo de desarrollo

---

Última actualización: 2026-02-17
