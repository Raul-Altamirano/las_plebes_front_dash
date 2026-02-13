# Sistema de Login Simulado - README

## Implementación Completa ✅

### Estructura de Sesión

**AuthContext actualizado con:**
- `isAuthenticated: boolean` - Estado de autenticación
- `currentUser: User | null` - Usuario actual (null si no autenticado)
- `login(email, password): Promise<void>` - Función de login
- `logout(): void` - Función de logout

**Persistencia en localStorage:**
- `session.currentUserId` - ID del usuario autenticado
- `session.isAuthenticated` - Flag de autenticación

---

## Credenciales de Acceso

### Regla de Autenticación Simulada

**Password válida:** Cualquier dígito del 1 al 9 (`/^[1-9]$/`)

**Usuarios seed disponibles:**

| Email | Rol | Status |
|-------|-----|--------|
| `sadmin@local.dev` | Super Admin | ACTIVE |
| `ops@example.com` | OPS | ACTIVE |
| `catalog@example.com` | Catalog Manager | ACTIVE |
| `viewer@example.com` | Viewer | ACTIVE |

**Ejemplo de login válido:**
```
Email: sadmin@local.dev
Password: 1
```

O cualquier dígito del 1 al 9.

---

## Rutas y Protección

### Rutas Públicas
- `/login` - Pantalla de login (con PublicOnly guard)

### Rutas Protegidas
- Todas las demás rutas (`/*`) requieren autenticación (con RequireAuth guard)

### Guards Implementados

**`RequireAuth`** - Protege rutas privadas
- Si no hay sesión → redirect a `/login`
- Preserva la ubicación intentada en `location.state.from`

**`PublicOnly`** - Protege ruta de login
- Si ya hay sesión → redirect a `/dashboard`

---

## UI de Login

### Diseño Responsive

**Desktop:**
- Card centrada con shadow
- Ancho máximo 448px (`max-w-md`)
- Layout limpio con gradiente de fondo

**Mobile:**
- Card responsive con padding adaptativo
- Inputs touch-friendly
- Mensajes de error claros

### Componentes

✅ Logo circular con icono Lock  
✅ Input email con icono Mail  
✅ Input password con icono Lock  
✅ Botón "Iniciar sesión" con loading state  
✅ Mensajes de error inline  
✅ Nota de credenciales demo (solo en DEV)  
✅ Footer con copyright  

### Validaciones

**Email:**
- Requerido
- Formato válido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)

**Password:**
- Requerido
- Debe ser un dígito del 1 al 9 (`/^[1-9]$/`)

### Mensajes de Error

| Error Code | Mensaje |
|------------|---------|
| `USER_NOT_FOUND` | Usuario no encontrado |
| `USER_SUSPENDED` | Usuario suspendido. Contacta al administrador |
| `INVALID_PASSWORD` | Contraseña inválida |

---

## Logout

### Desktop (Header)
- Dropdown en avatar con:
  - Nombre del usuario
  - Email
  - Rol
  - Botón "Cerrar sesión" (rojo)

### Mobile (Drawer)
- Botón "Cerrar sesión" en la parte inferior del drawer
- Debajo del UserSelector
- Estilo rojo consistente con desktop

### Comportamiento
1. Registra evento `AUTH_LOGOUT` en auditoría
2. Limpia sesión (`currentUserId`, `isAuthenticated`)
3. Redirect a `/login`

---

## Auditoría

### Eventos de Autenticación

**`AUTH_LOGIN_SUCCESS`** ✅
- Se registra automáticamente después del login
- Metadata: email, timestamp
- Actor: usuario que acaba de autenticarse

**`AUTH_LOGIN_FAILED`** ⚠️
- No implementado (requeriría sistema de auditoría sin actor)
- Commented out en Login.tsx

**`AUTH_LOGOUT`** ✅
- Se registra desde TopHeader y MobileDrawerNav
- Entity: usuario que cierra sesión
- Metadata: timestamp

---

## Flujo de Usuario

### 1. Primera Visita
```
Usuario sin sesión → redirect a /login
```

### 2. Login Exitoso
```
/login → valida credenciales → establece sesión → /dashboard
```

### 3. Navegación Protegida
```
Si isAuthenticated === true → acceso permitido
Si isAuthenticated === false → redirect a /login
```

### 4. Login Cuando Ya Está Autenticado
```
Usuario autenticado visita /login → redirect a /dashboard
```

### 5. Logout
```
Click "Cerrar sesión" → registra auditoría → limpia sesión → /login
```

---

## Arquitectura de Providers

```
<AuthProvider>
  <AuthDependentProviders>
    <Routes>
      <Route path="/login" /> <!-- Público -->
      <Route path="/*">       <!-- Protegido -->
        <RequireAuth>
          <AuditProvider>
            ... otros providers ...
            <AppLayout />
          </AuditProvider>
        </RequireAuth>
      </Route>
    </Routes>
  </AuthDependentProviders>
</AuthProvider>
```

**Importante:** `AuditProvider` está dentro de `RequireAuth` porque necesita que haya un usuario autenticado para funcionar correctamente.

---

## Testing Manual

### Test 1: Login Exitoso
1. Abrir `/login`
2. Ingresar `sadmin@local.dev` / `1`
3. ✅ Debe redirigir a `/dashboard`
4. ✅ Debe mostrar nombre y rol en header

### Test 2: Login con Usuario No Existente
1. Abrir `/login`
2. Ingresar `noexiste@test.com` / `1`
3. ✅ Debe mostrar error "Usuario no encontrado"

### Test 3: Login con Password Inválida
1. Abrir `/login`
2. Ingresar `sadmin@local.dev` / `abc`
3. ✅ Debe mostrar error "Contraseña debe ser un dígito del 1 al 9"

### Test 4: Ruta Protegida Sin Autenticación
1. Cerrar sesión si está activa
2. Intentar acceder a `/dashboard`
3. ✅ Debe redirigir a `/login`

### Test 5: Logout Desktop
1. Login como Super Admin
2. Click en avatar en header
3. Click "Cerrar sesión"
4. ✅ Debe redirigir a `/login`
5. ✅ Debe limpiar sesión

### Test 6: Logout Mobile
1. Login como Super Admin
2. Abrir drawer (hamburger menu)
3. Scroll al final
4. Click "Cerrar sesión"
5. ✅ Debe redirigir a `/login`
6. ✅ Debe limpiar sesión

### Test 7: Persistencia de Sesión
1. Login como Super Admin
2. Recargar la página (F5)
3. ✅ Debe mantener la sesión activa
4. ✅ No debe redirigir a `/login`

### Test 8: Acceso a Login Autenticado
1. Login como Super Admin
2. Navegar manualmente a `/login`
3. ✅ Debe redirigir a `/dashboard`

---

## Notas de Seguridad

⚠️ **IMPORTANTE:** Este es un sistema de autenticación **SIMULADO** para propósitos de demo.

**No usar en producción sin:**
1. Backend real con hashing de passwords
2. Tokens JWT o sessions seguras
3. HTTPS
4. Rate limiting
5. CSRF protection
6. Password recovery
7. MFA (opcional)

---

## Siguientes Pasos (Opcional)

Para convertir en sistema real:

1. ✅ Agregar campo `passwordHash` a `SystemUser`
2. ✅ Implementar hashing con bcrypt
3. ✅ Crear endpoint `/api/auth/login`
4. ✅ Usar JWT tokens en lugar de localStorage directo
5. ✅ Agregar refresh tokens
6. ✅ Implementar password recovery
7. ✅ Agregar rate limiting
8. ✅ Registrar intentos fallidos en auditoría

---

## Archivos Creados/Modificados

### Nuevos Archivos
- `/src/app/pages/Login.tsx` - Pantalla de login
- `/src/app/components/RequireAuth.tsx` - Guard de autenticación
- `/src/app/components/PublicOnly.tsx` - Guard de rutas públicas
- `/LOGIN_SYSTEM_README.md` - Este archivo

### Archivos Modificados
- `/src/app/store/AuthContext.tsx` - Lógica de login/logout
- `/src/app/store/UsersContext.tsx` - Seed con email correcto
- `/src/app/types/audit.ts` - Eventos AUTH_*
- `/src/app/components/TopHeader.tsx` - Dropdown con logout
- `/src/app/components/MobileDrawerNav.tsx` - Botón logout
- `/src/app/App.tsx` - Rutas públicas/protegidas

---

**Fecha de implementación:** 5 de febrero de 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Completo y funcional
