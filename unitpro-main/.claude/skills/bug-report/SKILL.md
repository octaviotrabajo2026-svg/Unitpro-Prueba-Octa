---
name: bug-report
description: Formato estándar para reportar bugs encontrados durante el testing en UnitPro. Usar siempre al finalizar una sesión de testing para entregar el reporte al Fixer.
---

# Skill: Bug Report

## Principios de un buen reporte de bug

Un bug bien reportado es la mitad de la solución. El fixer necesita poder **reproducir** el bug sin adivinar. Cada campo del reporte es obligatorio.

## Formato estándar de reporte

```markdown
## Reporte de Testing — [Feature testeada] — [fecha]

### Resumen ejecutivo
- Tests corridos: [comando] → [X pasaron / Y fallaron]
- Bugs encontrados: [N total] ([N críticos], [N altos], [N medios], [N bajos])
- Veredicto: APROBADO / REQUIERE CORRECCIONES

---

### Bug #[N]

**Título**: [Una línea que describe qué falla y cuándo]
**Severidad**: CRÍTICO / ALTO / MEDIO / BAJO
**Categoría**: Funcional / Seguridad / Performance / UX

**Descripción**:
[Explicación clara de qué está pasando mal]

**Pasos para reproducir**:
1. [paso exacto]
2. [paso exacto]
3. [observar resultado]

**Comportamiento esperado**:
[Qué debería pasar]

**Comportamiento actual**:
[Qué pasa en realidad]

**Evidencia**:
- Archivo: `src/auth/login.ts`
- Línea: 42
- Fragmento relevante:
  ```typescript
  if (email === user.email) { // ← case-sensitive
  ```
- Output del error (si aplica):
  ```
  Error: 401 Unauthorized
  ```

**Causa probable**:
[Tu hipótesis sobre por qué ocurre — no obligatorio pero útil]

**Impacto**:
[Quiénes se ven afectados y cómo]

---

### Tests nuevos creados

| Archivo | Tests agregados | Qué cubren |
|---------|----------------|------------|
| src/auth/login.test.ts | 3 | Email en mayúsculas, email con espacios, email nulo |

---

### Pendientes (si aplica)

- [ ] Verificar si el bug de email también afecta al registro
- [ ] Confirmar comportamiento esperado con el Administrador para el caso de emails con acentos
```

## Escala de severidad

### CRÍTICO — Acción inmediata
- Pérdida o corrupción de datos del usuario
- Vulnerabilidad de seguridad explotable
- El sistema crashea completamente
- Funcionalidad core inoperable

### ALTO — Bloquea el release
- Feature principal no funciona en el caso de uso común
- Datos mostrados incorrectamente al usuario
- Flujo de negocio principal interrumpido
- Error que afecta a todos los usuarios

### MEDIO — Fix antes del próximo release
- Comportamiento incorrecto en casos borde
- Feature secundaria que no funciona
- Mensaje de error incorrecto o confuso
- Problema de UX que afecta la usabilidad

### BAJO — Backlog
- Inconsistencia visual menor
- Texto incorrecto o typo
- Comportamiento subóptimo pero funcional
- Mejora de performance no urgente

## Tips para reproducibilidad

- Si el bug es intermitente, mencionarlo y estimar la frecuencia
- Si el bug depende de datos específicos, incluir datos de ejemplo
- Si el bug solo ocurre en cierto entorno, especificarlo
- Si encontrás el mismo bug en múltiples lugares, listarlos todos
