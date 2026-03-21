---
name: backend-dev
description: Patrones y mejores prácticas para desarrollo back-end en UnitPro. Usar cuando se implementan APIs, lógica de negocio, acceso a base de datos o servicios.
---

# Skill: Backend Development

## Estructura de un endpoint

```typescript
// Separación clara: Router → Controller → Service → Repository
// router/auth.router.ts
router.post('/login', authController.login);

// controllers/auth.controller.ts
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    handleControllerError(error, res);
  }
};

// services/auth.service.ts — la lógica de negocio real
export async function login(email: string, password: string) {
  const user = await userRepository.findByEmail(email.toLowerCase());
  if (!user) throw new AuthError('Credenciales inválidas');
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new AuthError('Credenciales inválidas');
  return generateToken(user);
}
```

## Validación de inputs (siempre en el servidor)

```typescript
import { z } from 'zod'; // o joi, yup, etc.

const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

// Middleware de validación
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.body = result.data; // datos limpios y tipados
    next();
  };
}
```

## Respuestas de API consistentes

```typescript
// Siempre usar esta estructura
// Éxito:
res.status(200).json({ success: true, data: result });

// Error del cliente:
res.status(400).json({ success: false, error: 'Mensaje descriptivo', code: 'VALIDATION_ERROR' });

// No autorizado:
res.status(401).json({ success: false, error: 'No autorizado', code: 'UNAUTHORIZED' });

// No encontrado:
res.status(404).json({ success: false, error: 'Recurso no encontrado', code: 'NOT_FOUND' });

// Error del servidor (no exponer detalles internos):
res.status(500).json({ success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
```

## Base de datos

```typescript
// Siempre usar transacciones para operaciones múltiples
async function transferFunds(fromId: string, toId: string, amount: number) {
  return await db.transaction(async (trx) => {
    await trx('accounts').where({ id: fromId }).decrement('balance', amount);
    await trx('accounts').where({ id: toId }).increment('balance', amount);
    await trx('transactions').insert({ fromId, toId, amount });
  });
}

// Usar parámetros preparados — nunca interpolación de strings en SQL
// ✅ Correcto
db('users').where({ email: userInput })
// ❌ Incorrecto (SQL injection)
db.raw(`SELECT * FROM users WHERE email = '${userInput}'`)
```

## Manejo de errores centralizado

```typescript
// middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[Error]', { message: err.message, stack: err.stack, url: req.url });
  
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err instanceof AuthError) return res.status(401).json({ error: err.message });
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  
  // Error desconocido: no exponer detalles
  res.status(500).json({ error: 'Error interno del servidor' });
}
```

## Rate limiting y protección básica

```typescript
import rateLimit from 'express-rate-limit';

// Aplicar en endpoints sensibles como login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máx 10 intentos por IP
  message: { error: 'Demasiados intentos, esperá 15 minutos' },
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
```
