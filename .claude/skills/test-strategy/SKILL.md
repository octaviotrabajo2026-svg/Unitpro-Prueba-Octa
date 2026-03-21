---
name: test-strategy
description: Estrategias y patrones de testing para UnitPro. Usar cuando se crean o ejecutan tests unitarios, de integración o end-to-end.
---

# Skill: Test Strategy

## Qué testear (prioridad)

1. **Lógica de negocio crítica** — cálculos, validaciones, transformaciones de datos
2. **Endpoints de API** — respuestas correctas, manejo de errores, autenticación
3. **Componentes con lógica** — formularios, interacciones, estados condicionales
4. **Casos borde** — null, undefined, strings vacíos, números negativos, arrays vacíos
5. **Rutas de error** — qué pasa cuando algo falla

## Estructura de un test bien escrito

```typescript
describe('authService.login', () => {
  // Arrange: preparar el escenario
  const validUser = { email: 'test@test.com', passwordHash: await bcrypt.hash('pass123', 12) };

  it('retorna token cuando las credenciales son válidas', async () => {
    // Arrange
    mockUserRepo.findByEmail.mockResolvedValue(validUser);
    
    // Act
    const result = await authService.login('test@test.com', 'pass123');
    
    // Assert
    expect(result).toHaveProperty('token');
    expect(typeof result.token).toBe('string');
  });

  it('lanza AuthError cuando el email no existe', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    
    await expect(authService.login('noexiste@test.com', 'pass123'))
      .rejects.toThrow('Credenciales inválidas');
  });

  it('acepta emails con mayúsculas', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(validUser);
    
    const result = await authService.login('TEST@TEST.COM', 'pass123');
    
    expect(result).toHaveProperty('token');
  });
});
```

## Casos de prueba por tipo de función

### Funciones de validación
- Input válido mínimo
- Input válido máximo
- Input exactamente en el límite
- Input vacío / null / undefined
- Input de tipo incorrecto
- Input con caracteres especiales

### Endpoints de API
- Respuesta exitosa con datos correctos
- Request con body inválido → 400
- Request sin autenticación → 401
- Request a recurso de otro usuario → 403
- Request a recurso inexistente → 404
- Manejo de error del servidor → 500

### Componentes React
```tsx
import { render, screen, userEvent } from '@testing-library/react';

describe('LoginForm', () => {
  it('muestra error cuando el email es inválido', async () => {
    render(<LoginForm />);
    
    await userEvent.type(screen.getByLabelText('Email'), 'no-es-email');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    
    expect(screen.getByRole('alert')).toHaveTextContent('Email inválido');
  });

  it('llama onSubmit con datos limpios cuando el form es válido', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText('Email'), 'test@test.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    
    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
  });
});
```

## Mocking

```typescript
// Mockear dependencias externas (DB, APIs, servicios)
jest.mock('../repositories/userRepository');

const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;

beforeEach(() => {
  jest.clearAllMocks(); // limpiar mocks entre tests
});
```

## Métricas de cobertura objetivo

| Tipo | Objetivo mínimo |
|------|----------------|
| Lógica de negocio crítica | 90%+ |
| Endpoints de API | 80%+ |
| Componentes con lógica | 70%+ |
| Utilidades/helpers | 80%+ |

## Cuándo NO testear

- Código generado automáticamente (migraciones, tipos generados)
- Getters/setters triviales sin lógica
- Componentes puramente visuales sin comportamiento
- Constantes y configuración estática
