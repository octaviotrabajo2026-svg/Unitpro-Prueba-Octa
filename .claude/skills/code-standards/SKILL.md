---
name: code-standards
description: Estándares y convenciones de código compartidos por todos los agentes de UnitPro. Cargar automáticamente en cualquier tarea de desarrollo, testing o corrección de bugs.
---

# Estándares de código de UnitPro

## Convenciones generales

- **Idioma del código**: inglés (variables, funciones, comentarios en código)
- **Idioma de reportes**: el mismo que usa el usuario
- **Indentación**: 2 espacios (nunca tabs)
- **Punto y coma**: siempre en JS/TS
- **Comillas**: simples en JS, dobles en JSX/HTML

## Nombrado

```
// Variables y funciones: camelCase
const userName = 'John';
function getUserById(id) {}

// Componentes React: PascalCase
function UserProfile() {}

// Constantes: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Archivos de componentes: PascalCase.tsx
// Archivos de utils/hooks: camelCase.ts
// Archivos de tests: NombreOriginal.test.ts
```

## Estructura de carpetas esperada

```
src/
├── components/       # Componentes React reutilizables
├── pages/            # Vistas/rutas principales
├── hooks/            # Custom hooks
├── services/         # Llamadas a API externa
├── api/              # Endpoints del back-end (si es fullstack)
├── utils/            # Funciones utilitarias puras
├── types/            # Definiciones de TypeScript
└── __tests__/        # Tests (o .test.ts junto al archivo)
```

## Manejo de errores

```typescript
// Siempre manejar errores explícitamente
try {
  const result = await apiCall();
  return { data: result, error: null };
} catch (error) {
  console.error('[NombreModulo] Error en operación:', error);
  return { data: null, error: error.message };
}

// Nunca hacer esto:
try { ... } catch (e) {} // catch vacío prohibido
```

## Variables de entorno

```
# Nunca hardcodear valores sensibles
# ✅ Correcto
const apiUrl = process.env.VITE_API_URL;

# ❌ Incorrecto
const apiUrl = 'https://api.unitpro.com';
```

## Comentarios

```typescript
// Para funciones complejas, documentar propósito y parámetros
/**
 * Calcula el precio final aplicando descuentos y taxes.
 * @param basePrice - Precio base en centavos
 * @param discountRate - Tasa de descuento (0-1)
 * @returns Precio final en centavos
 */
function calculateFinalPrice(basePrice: number, discountRate: number): number {}

// Comentarios inline solo para explicar lógica no obvia
const retryDelay = attempt * 1000; // backoff exponencial
```

## [COMPLETAR] Stack específico de UnitPro

> Editá esta sección con los detalles reales de tu proyecto:

- **Framework front-end**: React 18 / Next.js / Vue / etc.
- **Lenguaje**: TypeScript / JavaScript
- **Framework back-end**: Node.js + Express / NestJS / etc.
- **Base de datos**: PostgreSQL / MongoDB / etc.
- **ORM**: Prisma / TypeORM / Mongoose / etc.
- **Testing**: Vitest / Jest / Playwright / etc.
- **Estilos**: Tailwind CSS / CSS Modules / styled-components / etc.
