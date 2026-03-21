---
name: bug-analysis
description: Metodología para analizar y diagnosticar bugs en UnitPro. Usar cuando se recibe un reporte de bug para determinar la causa raíz antes de aplicar cualquier corrección.
---

# Skill: Bug Analysis

## Metodología de diagnóstico

### Los 5 pasos antes de tocar el código

1. **Leer el reporte completo** — entender síntoma, pasos para reproducir y comportamiento esperado
2. **Localizar el código** — ir al archivo y línea reportada
3. **Trazar la ejecución** — seguir el flujo de datos desde el input hasta el punto de falla
4. **Identificar la causa raíz** — no el síntoma, la causa real
5. **Verificar el alcance** — ¿el mismo bug ocurre en otros lugares?

### Los 5 Porqués (para bugs no obvios)

```
Síntoma: El login falla con emails en mayúsculas

¿Por qué? → La comparación de email es case-sensitive
¿Por qué? → Se usa === en vez de .toLowerCase() antes de comparar
¿Por qué? → No había validación de este caso en los tests originales
¿Por qué? → La especificación no lo mencionaba explícitamente
¿Por qué? → El flujo de registro tampoco normaliza el email al guardarlo

Causa raíz real: El email no se normaliza al REGISTRAR, entonces al LOGUEAR
                  tampoco se puede normalizar confiablemente.
Alcance real: Afecta registro + login + búsqueda por email
```

## Categorías de bugs

### Por causa
| Categoría | Descripción | Ejemplo |
|-----------|-------------|---------|
| **Lógica** | Condición o algoritmo incorrecto | `>` en vez de `>=` |
| **Tipo** | Tipo de dato inesperado | `undefined + 1 = NaN` |
| **Asincronía** | Race condition, await faltante | Estado desactualizado |
| **Estado** | Estado no inicializado o corrompido | `null.property` |
| **Integración** | Contrato entre módulos roto | API devuelve diferente formato |
| **Entorno** | Funciona en dev, falla en prod | Variable de entorno faltante |
| **Concurrencia** | Múltiples operaciones simultáneas | Doble submit |

### Por severidad de corrección
| Tipo | Descripción |
|------|-------------|
| **Puntual** | 1-3 líneas, sin efectos colaterales |
| **Local** | Un archivo, requiere ajustar tests |
| **Sistémico** | Afecta múltiples módulos, requiere coordinación |
| **Arquitectural** | Requiere decisión de diseño, escalar al Administrador |

## Herramientas de diagnóstico

```bash
# Buscar dónde se usa la función con bug
grep -r "functionName" src/ --include="*.ts"

# Ver historial de cambios recientes en un archivo
git log --oneline -10 -- src/auth/login.ts

# Buscar patrones similares en el código
grep -r "email ===" src/ --include="*.ts"
```

## Señales de bug sistémico (escalar al Administrador)

- El mismo patrón de error aparece en 3+ archivos
- La corrección requiere cambiar una interfaz pública
- El bug existe porque la especificación original era ambigua
- Arreglar esto rompe tests existentes que son correctos
- La causa raíz está en una dependencia de terceros

## Plantilla de análisis

```markdown
## Análisis del Bug #[N]

**Síntoma reportado**: [qué falla según el tester]

**Causa raíz identificada**: [por qué falla realmente]

**Categoría**: [Lógica / Tipo / Asincronía / etc.]
**Tipo de corrección**: [Puntual / Local / Sistémico / Arquitectural]

**Alcance**:
- Archivo principal: src/...
- Archivos relacionados afectados: [lista o "ninguno"]
- Tests que fallan: [lista o "ninguno"]

**Plan de corrección**:
1. [cambio específico 1]
2. [cambio específico 2]

**Riesgo de regresión**: [Bajo / Medio / Alto]
**Justificación**: [por qué este nivel de riesgo]
```
