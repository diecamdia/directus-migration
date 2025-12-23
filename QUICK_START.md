# ⚡ Guía Rápida de Migración

## Antes de Empezar

⚠️ **IMPORTANTE**: Asegúrate de que:
1. Tienes acceso de administrador a ambas instancias
2. Has hecho backup de producción
3. La instancia de producción está en un estado limpio

## Flujo Recomendado

### Paso 1: Análisis (Sin Riesgos)

```bash
npm run migrate:local:dry
```

Esto te mostrará:
- ✅ Collections que se crearán
- ✅ Fields que se agregarán (ignorando system fields estándar)
- ✅ Relations que se establecerán

**Ejemplo de salida:**
```
➕ Collections nuevas: 20
➕ Fields nuevos: 209 (48 system fields estándar ignorados)
➕ Relations nuevas: 71

System fields nuevos (custom):
  - directus_users.tenant
```

### Paso 2: Configurar Producción

```bash
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=tu-token-admin-produccion
```

### Paso 3: Aplicar Cambios

```bash
npm run migrate:local
```

El script:
1. ✅ Crea las 20 collections nuevas
2. ✅ Crea 209 fields (uno por uno, mostrando progreso)
3. ✅ Crea 1 system field custom (directus_users.tenant)
4. ✅ Crea 71 relations

## Qué Esperar

### Collections
```
📤 Creando 20 collections...
  ✅ articles
  ✅ customers
  ✅ events
  ...
```

### Fields
```
📤 Creando 209 fields...
  ✅ articles.id
  ✅ articles.status
  ✅ articles.title
  ...
📊 Fields regulares: 209 exitosos, 0 errores
```

### System Fields
```
📤 Creando 1 system fields...
  ✅ directus_users.tenant
```

### Relations
```
📤 Creando 71 relations...
  ✅ articles.user_created
  ✅ articles.tenant
  ...
```

## Problemas Comunes

### 1. "Field already exists" en System Fields

**NO ES UN ERROR** - El script ahora ignora automáticamente los 48 system fields estándar de Directus.

Solo verás este error si intentas crear `directus_users.tenant` y ya existe.

### 2. "Field doesn't exist" en Relations

**Causa:** Un field no se creó correctamente antes.

**Solución:**
1. Busca en el log de fields el error específico
2. Corrige el problema
3. Vuelve a ejecutar (saltará lo que ya existe)

### 3. "Collection not found"

**Causa:** Una collection no se creó.

**Solución:**
1. Revisa el log de collections
2. Crea la collection manualmente si es necesario
3. Vuelve a ejecutar

## Comandos Útiles

```bash
# Ver ayuda completa
npm run help

# Solo análisis (sin configuración)
npm run migrate:local:dry

# Migración local (solo PROD configurada)
npm run migrate:local

# Migración completa (DEV + PROD configuradas)
npm run migrate

# Debug completo
DEBUG=true npm run migrate
```

## Después de la Migración

Verifica en Directus que:

1. ✅ Las collections aparecen en el Data Studio
2. ✅ Los fields están en cada collection
3. ✅ El campo `directus_users.tenant` existe
4. ✅ Las relations funcionan correctamente

## Rollback

Si algo sale mal:

1. **Collections vacías**: Puedes eliminarlas manualmente desde Directus
2. **Fields problemáticos**: Elimínalos desde la UI de Directus
3. **Backup**: Restaura desde tu backup de producción

## Documentación Completa

- `README.md` - Documentación principal
- `MIGRATION_GUIDE.md` - Guía detallada
- `SOLUCION_ERRORES.md` - Solución de problemas de configuración
- `ERRORES_SYSTEM_FIELDS.md` - Solución de problemas con system fields
- `help.js` - Ejecuta `npm run help`
