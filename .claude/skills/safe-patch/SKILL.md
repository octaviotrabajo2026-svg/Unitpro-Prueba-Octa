---
name: safe-patch
description: Principios para aplicar correcciones de bugs de forma segura y mínima en UnitPro. Usar siempre al momento de escribir el código de corrección.
---

# Skill: Safe Patch

## El principio del parche mínimo

Una corrección de bug exitosa es aquella que:
1. Resuelve exactamente el bug reportado
2. No introduce nuevos bugs
3. No cambia comportamiento no relacionado
4. Es fácil de entender y revertir

**La regla de oro**: si dudás entre una corrección simple y una "elegante", elegí la simple.

## Proceso de aplicación

### Antes de cambiar cualquier línea

```bash
# 1. Verificar que los tests actuales pasan (baseline)
npm test

# 2. Crear un test que FALLA que reproduce el bug
# (test-driven bug fixing)
it('acepta emails con mayúsculas', async () => {
  // Este test debe fallar ANTES del fix
  const result = await authService.login('TEST@TEST.COM', 'pass123');
  expect(result).toHaveProperty('token');
});

# 3. Confirmar que el test falla (el bug existe)
npm test -- --testNamePattern="acepta emails con mayúsculas"
```

### Al aplicar la corrección

```typescript
// ✅ Cambio mínimo: solo lo que produce el bug
// ANTES:
if (email === user.email) { ... }

// DESPUÉS:
if (email.toLowerCase() === user.email.toLowerCase()) { ... }

// ❌ No aprovechar para refactorizar al mismo tiempo:
// DESPUÉS (mal):
if (normalizeEmail(email) === normalizeEmail(user.email)) { ... }
// Ahora tenés que crear normalizeEmail, actualizar imports, etc.
// Demasiado cambio para un bug fix.
```

### Después de la corrección

```bash
# 1. El nuevo test ahora pasa
npm test -- --testNamePattern="acepta emails con mayúsculas"

# 2. TODOS los tests anteriores siguen pasando
npm test

# 3. Si algún test existente falla con tu corrección:
#    - Puede ser un test incorrecto que aceptaba el comportamiento buggy
#    - Actualizar ese test para reflejar el comportamiento correcto
#    - Documentar el cambio en el reporte
```

## Niveles de invasividad (de menor a mayor riesgo)

### Nivel 1: Cambio puntual (preferido)
- 1-3 líneas
- Mismo archivo, misma función
- Sin nuevos imports ni dependencias
- Riesgo: muy bajo

```typescript
// email === user.email → email.toLowerCase() === user.email.toLowerCase()
```

### Nivel 2: Cambio local
- Un archivo, posiblemente varios lugares
- Puede requerir un nuevo helper privado en el mismo archivo
- Riesgo: bajo

```typescript
// Agregar helper privado al final del archivo
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

### Nivel 3: Cambio con impacto
- Modifica interfaz o contrato de una función
- Afecta múltiples archivos
- Requiere actualizar tests en varios lugares
- Riesgo: medio — CONSULTAR al Administrador antes de proceder

### Nivel 4: Corrección arquitectural
- Requiere mover código entre módulos
- Cambia contratos de API
- Afecta todo el flujo de datos
- Riesgo: alto — SIEMPRE escalar al Administrador

## Checklist antes de reportar como resuelto

```
[ ] El bug original ya no ocurre
[ ] Existe un test que cubre el caso del bug
[ ] Todos los tests pre-existentes siguen pasando
[ ] El cambio no tiene efectos colaterales obvios
[ ] El código resultante es legible y mantiene el estilo existente
[ ] Si el nivel de invasividad fue 3+, el Administrador fue notificado
```

## Qué NO hacer en un bug fix

```typescript
// ❌ No refactorizar
// ❌ No mejorar el naming de variables no relacionadas
// ❌ No agregar funcionalidades nuevas
// ❌ No reorganizar imports que no cambiaste
// ❌ No cambiar el formato/estilo del código (eso es una tarea de linting separada)
// ❌ No agregar logging/debugging que quedó del análisis
```
