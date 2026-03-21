---
name: security-audit
description: Checklist y patrones de seguridad para UnitPro. Usar siempre al implementar autenticación, manejo de datos del usuario, o cualquier feature que involucre inputs externos.
---

# Skill: Security Audit

## Checklist de seguridad (verificar en cada implementación)

### Autenticación y sesiones
- [ ] Passwords hasheados con bcrypt (saltRounds >= 12) — nunca MD5/SHA1
- [ ] JWT con expiración corta (15-60 min access token, 7-30 días refresh token)
- [ ] Tokens en httpOnly cookies — no en localStorage
- [ ] Logout invalida el token en el servidor (blacklist o rotación de refresh)
- [ ] Rate limiting en endpoints de login y registro

### Autorización
- [ ] Verificar permisos en el servidor — nunca confiar solo en el front-end
- [ ] Usuarios solo pueden acceder a sus propios recursos (row-level security)
- [ ] Roles y permisos verificados en middleware, no en la lógica de negocio

### Inputs del usuario
- [ ] Validación en servidor (no solo en cliente)
- [ ] Sanitización de HTML si se renderiza (usar DOMPurify o similar)
- [ ] Queries parametrizadas — nunca interpolación de strings en SQL
- [ ] Límites de tamaño en uploads de archivos
- [ ] Validar tipo de archivo (content-type + magic bytes, no solo extensión)

### Headers HTTP de seguridad
```typescript
// Incluir en la configuración del servidor
import helmet from 'helmet';
app.use(helmet()); // Configura automáticamente headers seguros

// Que incluye entre otros:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security: max-age=31536000
// Content-Security-Policy: default-src 'self'
```

### Variables de entorno y secretos
- [ ] Ningún secreto en el código fuente (usar .env + .gitignore)
- [ ] .env.example con keys vacías para documentar lo necesario
- [ ] Secretos en producción en variables del servidor, no en archivos
- [ ] JWT_SECRET con al menos 32 caracteres aleatorios

### CORS
```typescript
// Configurar CORS explícitamente — nunca origin: '*' en producción
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN, // 'https://unitpro.com'
  credentials: true, // necesario para cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

### Protección CSRF
```typescript
// Si usás cookies de sesión, proteger contra CSRF
import csurf from 'csurf';
app.use(csurf({ cookie: { httpOnly: true, sameSite: 'strict' } }));
```

## Vulnerabilidades comunes a verificar

### XSS (Cross-Site Scripting)
```tsx
// ❌ Vulnerable
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Seguro (React escapa por defecto)
<div>{userInput}</div>

// ✅ Si necesitás HTML, sanitizar primero
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### SQL Injection
```typescript
// ❌ Vulnerable
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ Seguro (parametrizado)
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

### Exposición de datos sensibles
```typescript
// ❌ Nunca devolver el password hash al cliente
res.json(user); // si user tiene passwordHash, se expone

// ✅ Seleccionar solo lo necesario
const { passwordHash, ...safeUser } = user;
res.json(safeUser);
```

## Al reportar vulnerabilidades

Si encontrás una vulnerabilidad durante el desarrollo:
1. Documentarla con severidad (CRÍTICA / ALTA / MEDIA / BAJA)
2. Incluir el vector de ataque concreto
3. Proponer la corrección
4. Alertar al Administrador antes de mergear código vulnerable
