# Guía para Agentes IA — Solennix

Este documento contiene guías específicas para agentes que trabajan en el proyecto Solennix.

## 📋 Resumen del Proyecto

Solennix es una aplicación SaaS para organizadores de eventos (catering, banquetes, fiestas) que permite gestionar:
- Clientes y eventos
- Catálogo de productos con recetas
- Inventario de ingredientes
- Cotizaciones con IVA
- Pagos y abonos
- Calendario de eventos

### Stack Tecnológico

- **Frontend Web**: React 19 + TypeScript + Vite + Tailwind CSS
- **Frontend Mobile**: React Native 0.83 + Expo 55 + TypeScript
- **Backend**: Go 1.25 + Chi router + PostgreSQL + pgx
- **State Management**: Zustand (web y mobile), React Hook Form + Zod (forms)
- **Testing**: Vitest + Testing Library (unit), Playwright (E2E)
- **Despliegue**: Docker Compose, Vercel-ready (web), Expo (mobile)

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

### Frontend Mobile (`mobile/`)

```
mobile/
├── src/
│   ├── components/       # Componentes reutilizables (shared/, navigation/)
│   ├── contexts/         # Contextos React (AuthContext)
│   ├── hooks/            # Custom hooks (useHaptics, useImagePicker, usePlanLimits, etc.)
│   ├── lib/              # Utilidades compartidas (api, errorHandler, finance, pdfGenerator, sentry)
│   ├── navigation/       # Navegación (React Navigation: stacks, tabs, drawer)
│   ├── screens/          # Pantallas organizadas por dominio
│   │   ├── auth/         # Login, Register, ForgotPassword, ResetPassword
│   │   ├── home/         # Dashboard, Search
│   │   ├── events/       # EventDetail, EventForm
│   │   ├── clients/      # ClientList, ClientDetail, ClientForm
│   │   ├── catalog/      # ProductList, ProductDetail, ProductForm, InventoryList, InventoryForm
│   │   ├── calendar/     # CalendarScreen
│   │   └── profile/      # Settings, EditProfile, BusinessSettings, Pricing, etc.
│   ├── services/         # Servicios de API (uno por dominio)
│   ├── theme/            # Tema (colors, typography, spacing, shadows)
│   └── types/            # Tipos TypeScript (entities, navigation)
├── app.json              # Configuración de Expo
└── package.json          # Dependencias
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

### Mobile (React Native / Expo)

```bash
# Instalar dependencias
cd mobile && npm install

# Iniciar servidor de desarrollo
npx expo start

# Ejecutar en Android
npx expo start --android

# Ejecutar en iOS
npx expo start --ios

# Ejecutar en web (preview)
npx expo start --web

# Build de producción con EAS
npx eas build --platform android
npx eas build --platform ios
```

---

## 📝 Convenciones de Código

### TypeScript (Web)

- **Nombres de archivos**: `camelCase.tsx` (componentes) o `kebab-case.ts` (utilidades)
- **Componentes**: `PascalCase` (`UserProfile.tsx`)
- **Variables/Funciones**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Interfaces/Types**: `PascalCase` con prefijo `I` (opcional) o sin prefijo

### TypeScript (Mobile - React Native)

- **Nombres de archivos**: `PascalCase.tsx` (pantallas/componentes) o `camelCase.ts` (utilidades/servicios)
- **Componentes/Pantallas**: `PascalCase` (e.g., `DashboardScreen.tsx`, `FormInput.tsx`)
- **Variables/Funciones**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Hooks**: `use` + `PascalCase` (e.g., `useHaptics.ts`, `usePlanLimits.ts`)
- **Servicios**: `camelCase` (e.g., `clientService.ts`, `eventService.ts`)

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

### Agregar Nueva Feature (Mobile - React Native)

1. **Crear tipo en `types/entities.ts`** (si es nueva entidad):
   ```typescript
   // src/types/entities.ts
   export interface MyFeature {
     id: string;
     name: string;
     // ...
   }
   ```

2. **Crear servicio en `services/`**:
   ```typescript
   // src/services/myFeatureService.ts
   import { api } from '../lib/api';

   export const myFeatureService = {
     async getAll(): Promise<MyFeature[]> {
       return api.get('/my-feature');
     },
     async getById(id: string): Promise<MyFeature> {
       return api.get(`/my-feature/${id}`);
     },
   };
   ```

3. **Crear hook en `hooks/`** (opcional):
   ```typescript
   // src/hooks/useMyFeature.ts
   import { useState, useEffect } from 'react';
   import { myFeatureService } from '../services/myFeatureService';

   export function useMyFeature() {
     const [data, setData] = useState<MyFeature[]>([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       myFeatureService.getAll()
         .then(setData)
         .finally(() => setLoading(false));
     }, []);

     return { data, loading };
   }
   ```

4. **Crear pantalla en `screens/`**:
   ```typescript
   // src/screens/myFeature/MyFeatureListScreen.tsx
   import { View, FlatList, Text } from 'react-native';
   import { useMyFeature } from '../../hooks/useMyFeature';
   import { LoadingSpinner } from '../../components/shared';

   export function MyFeatureListScreen() {
     const { data, loading } = useMyFeature();

     if (loading) return <LoadingSpinner />;

     return (
       <FlatList
         data={data}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <Text>{item.name}</Text>
         )}
       />
     );
   }
   ```

5. **Crear stack de navegacion en `navigation/`** (si aplica):
   ```typescript
   // src/navigation/MyFeatureStack.tsx
   import { createNativeStackNavigator } from '@react-navigation/native-stack';
   import { MyFeatureListScreen } from '../screens/myFeature/MyFeatureListScreen';

   const Stack = createNativeStackNavigator();

   export function MyFeatureStack() {
     return (
       <Stack.Navigator>
         <Stack.Screen name="MyFeatureList" component={MyFeatureListScreen} />
       </Stack.Navigator>
     );
   }
   ```

6. **Registrar en navegacion** (`MainTabs.tsx` o `DrawerNavigator.tsx`)

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

### Tests Mobile (React Native)

1. **Unit tests** (con Jest):
   ```typescript
   // src/services/__tests__/myFeatureService.test.ts
   import { myFeatureService } from '../myFeatureService';

   describe('myFeatureService', () => {
     it('should fetch all features', async () => {
       const data = await myFeatureService.getAll();
       expect(data).toBeDefined();
       expect(Array.isArray(data)).toBe(true);
     });
   });
   ```

2. **Component tests** (con React Native Testing Library):
   ```typescript
   // src/screens/myFeature/__tests__/MyFeatureListScreen.test.tsx
   import { render, screen } from '@testing-library/react-native';
   import { MyFeatureListScreen } from '../MyFeatureListScreen';

   describe('MyFeatureListScreen', () => {
     it('should display feature name', () => {
       render(<MyFeatureListScreen />);
       expect(screen.getByText('Test Feature')).toBeTruthy();
     });
   });
   ```

3. **Ejecutar tests**:
   ```bash
   cd mobile

   # Todos los tests
   npm test

   # Un archivo específico
   npx jest src/services/__tests__/myFeatureService.test.ts

   # Watch mode
   npx jest --watch
   ```

---

## 🔒 Seguridad Importante

- **Nunca** exponer credenciales en código
- **Siempre** filtrar por `user_id` en queries del backend (multi-tenant)
- **Validar** inputs en frontend y backend
- **Sanitizar** datos antes de mostrarlos
- **Usar** parámetros en queries SQL (evitar concatenación)

---

## 📚 Recursos de Referencia

### Documentación del Proyecto

- [README principal](../README.md)
- [Arquitectura del sistema](../docs/README.md)
- [Guía de despliegue](../docs/deploy.md)
- [Checklist MVP](../docs/mvp-checklist.md)

### Stack Tecnológico

- [React docs](https://react.dev)
- [TypeScript docs](https://www.typescriptlang.org/docs)
- [React Native docs](https://reactnative.dev/docs/getting-started)
- [Expo docs](https://docs.expo.dev)
- [React Navigation docs](https://reactnavigation.org/docs/getting-started)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright docs](https://playwright.dev)

---

## ✅ Checklist Antes de Commits

- [ ] Código sigue convenciones del proyecto
- [ ] Tests pasan (`npm test` en web y mobile)
- [ ] Sin console.log en produccion
- [ ] Types de TypeScript sin errores
- [ ] Linting pasa (`npm run lint`)
- [ ] Documentacion actualizada si aplica
- [ ] Cambios en `package.json` documentados

---

## 🐛 Flujo de Reporte de Bugs

1. **Describir el problema** claramente
2. **Pasos para reproducir**
3. **Comportamiento esperado vs actual**
4. **Screenshots/videos** si aplica
5. **Stack trace** de errores
6. **Environment** (OS, navegador, version de Expo/React Native)

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

Ultima actualizacion: 2026-03-02
