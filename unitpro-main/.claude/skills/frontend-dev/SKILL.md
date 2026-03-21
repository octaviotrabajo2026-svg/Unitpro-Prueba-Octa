---
name: frontend-dev
description: Patrones y mejores prácticas para desarrollo front-end en UnitPro. Usar cuando se implementan componentes React, páginas, hooks, manejo de estado o estilos.
---

# Skill: Frontend Development

## Componentes React

### Estructura estándar de un componente
```tsx
import { useState, useCallback } from 'react';

interface Props {
  title: string;
  onAction: (id: string) => void;
  isLoading?: boolean; // props opcionales con ?
}

export function ComponentName({ title, onAction, isLoading = false }: Props) {
  const [localState, setLocalState] = useState<string>('');

  const handleAction = useCallback(() => {
    onAction(localState);
  }, [localState, onAction]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleAction}>Acción</button>
    </div>
  );
}
```

### Reglas de componentes
- Un componente = una responsabilidad
- Extraer lógica compleja a custom hooks (`useNombreLogica`)
- Props opcionales siempre con valor por defecto
- No usar `any` en TypeScript — usar tipos correctos o `unknown`
- Preferir composición sobre props extensas

## Custom Hooks

```tsx
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
}
```

## Formularios y validación

```tsx
// Validar en el cliente Y en el servidor
function LoginForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(data: FormData): boolean {
    const newErrors: Record<string, string> = {};
    if (!data.get('email')) newErrors.email = 'El email es requerido';
    if (!data.get('password')) newErrors.password = 'La contraseña es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
}
```

## Performance

- `useMemo` para cálculos costosos que dependen de props
- `useCallback` para handlers pasados como props a hijos
- `React.memo` para componentes que re-renderizan innecesariamente
- Lazy loading de páginas: `const Page = lazy(() => import('./Page'))`
- Imágenes con atributo `loading="lazy"` y dimensiones explícitas

## Accesibilidad (obligatorio)

```tsx
// Siempre incluir:
<button aria-label="Cerrar modal">×</button>
<img src="..." alt="Descripción de la imagen" />
<input id="email" aria-describedby="email-error" />
<span id="email-error" role="alert">{errors.email}</span>
```

## Manejo de estados async

```tsx
// Patrón estándar para llamadas a API
const [state, setState] = useState<{
  data: User[] | null;
  isLoading: boolean;
  error: string | null;
}>({ data: null, isLoading: false, error: null });

async function fetchUsers() {
  setState(prev => ({ ...prev, isLoading: true, error: null }));
  try {
    const data = await userService.getAll();
    setState({ data, isLoading: false, error: null });
  } catch (error) {
    setState({ data: null, isLoading: false, error: 'Error cargando usuarios' });
  }
}
```
