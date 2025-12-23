# 📦 Directus Differential Migration Tool

Herramienta para migrar **solo las diferencias** entre tu instancia de **Desarrollo** y **Producción** de Directus.

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Ver qué va a cambiar (sin aplicar - RECOMENDADO)
npm run migrate:local:dry

# 3. Revisar el listado de cambios

# 4. Configurar producción
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=tu-token-admin-prod

# 5. Aplicar cambios
npm run migrate:local
```

## ✨ Características

- ✅ **Migración Inteligente** - Solo crea lo que no existe en producción
- ✅ **Detección Completa** - Collections, fields, system fields, relations
- ✅ **Modo Local** - Usa snapshots guardados sin necesidad de conectarse a desarrollo
- ✅ **Dry-Run** - Analiza cambios sin aplicarlos
- ✅ **Seguro** - Muestra resumen y espera confirmación antes de aplicar
- ✅ **Sin Pérdidas** - NO elimina nada, solo CREA lo que falta

## 📋 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run help` | Muestra guía de uso completa |
| `npm run migrate:local:dry` | 🔍 **RECOMENDADO** - Analiza diferencias sin aplicar cambios |
| `npm run migrate:local` | ⚙️ Aplica cambios usando snapshots locales |
| `npm run test:compare` | Analiza conectándose a ambas instancias |
| `npm run migrate` | Migración completa conectando a ambas instancias |
| `npm run migrate:debug` | Migración con logs detallados |

## 🎯 Flujo de Trabajo Recomendado

### Opción 1: Usando Snapshots Locales (Más Rápido)

```bash
# Paso 1: Analizar diferencias (sin aplicar)
npm run migrate:local:dry

# Salida:
# ➕ Collections nuevas: 20
# ➕ Fields nuevos: 257
# ➕ Relations nuevas: 71

# Paso 2: Revisar el listado de cambios

# Paso 3: Configurar producción
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=tu-token-admin-prod

# Paso 4: Aplicar cambios
npm run migrate:local
```

### Opción 2: Conectándose a Ambas Instancias

```bash
# Configurar ambas instancias
export DEV_URL=https://dev.directus.com
export DEV_TOKEN=tu-token-admin-dev
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=tu-token-admin-prod

# Ejecutar migración completa
npm run migrate
```

## 🔍 Qué Detecta

### Schema
- **Collections nuevas** - Collections que existen en dev pero no en prod
- **Fields nuevos** - Campos que faltan en collections
- **System Fields** - Campos custom en `directus_users`, `directus_files`, etc.
- **Relations nuevas** - Relaciones M2O, O2M, M2M, M2A

### Automatización (solo con migrate completo)
- **Roles nuevos** - Roles de usuario
- **Policies nuevas** - Políticas de acceso
- **Flows nuevos** - Flujos de automatización
- **Operations** - Operations de los flows
- **Permissions** - Permisos asociados a policies

## 📖 Ejemplo de Salida

### Análisis (Dry-Run)

```bash
npm run migrate:local:dry
```

```

**Salida:**
```
🔍 Modo DRY RUN - Solo análisis, no se aplicarán cambios

=== ANALIZANDO DIFERENCIAS ===

🔍 Comparando collections...
  ➕ Collections nuevas: 20
  
  Collections nuevas:
    - articles
    - customers
    - events
    ...

🔍 Comparando fields...
  ➕ Fields nuevos: 257
  
  System fields nuevos:
    - directus_users.tenant
    - directus_files.custom_field
    ...

🔍 Comparando relations...
  ➕ Relations nuevas: 71
```

### Migración Real

```bash
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=admin_token
npm run migrate:local
```

**Salida:**
```
=== APLICANDO CAMBIOS A PRODUCCIÓN ===

📤 Creando 20 collections...
  ✅ articles
  ✅ customers
  ✅ events
  ...

📤 Creando 257 fields...
  ✅ articles (13 fields)
  ✅ customers (15 fields)
  ...

📤 Creando 48 system fields...
  ✅ directus_users.tenant
  ...

📤 Creando 71 relations...
  ✅ articles.user_created
  ...

✅ ¡MIGRACIÓN COMPLETADA!
```

## ⚙️ Configuración

### Modo Local (Recomendado)

Solo necesitas configurar producción:

```bash
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=admin_token_produccion
```

### Modo Completo

Configurar ambas instancias:

```bash
# Desarrollo
export DEV_URL=https://dev.directus.com
export DEV_TOKEN=admin_token_desarrollo

# Producción
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=admin_token_produccion
```

## 📁 Archivos Generados

Después de ejecutar, se crean:
- `snapshot_desarrollo.json` - Backup completo del schema de desarrollo
- `snapshot_produccion.json` - Backup completo del schema de producción

## ⚠️ Importante

### ✅ Lo que SÍ migra
- Collections nuevas
- Fields nuevos (incluye system fields en `directus_*`)
- Relations
- Roles
- Policies
- Flows
- Operations
- Permissions

### ❌ Lo que NO migra
- **Datos** (items de collections)
- **Usuarios** (solo schema, no datos)
- **NO elimina** nada de producción

## 🔒 Seguridad

- ✅ Solo **CREA** - Nunca elimina
- ✅ Confirmación de 5 segundos antes de aplicar
- ✅ Backups automáticos en JSON
- ✅ Logs detallados de cada operación
- ✅ Manejo de errores por operación (continúa si una falla)

## 🐛 Troubleshooting

### Error de autenticación
```
Error obteniendo snapshot: Unauthorized
```
**Solución:** Verifica tokens y permisos de admin

### No detecta diferencias
```bash
# Activar modo debug
npm run migrate:debug
```

### Ver logs detallados
```bash
DEBUG=true npm run migrate
```

## 📚 Documentación

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Guía completa de migración
- [CAMBIOS.md](CAMBIOS.md) - Últimos cambios y correcciones
- [README.old.md](README.old.md) - Guía manual original (API)

## 🔧 Orden de Migración

El script respeta las dependencias automáticamente:

1. **Collections** → Sin dependencias
2. **Fields** → Requieren collections
3. **Relations** → Requieren fields
4. **Roles** → Independientes
5. **Policies** → Requieren roles
6. **Flows** → Independientes
7. **Operations** → Requieren flows
8. **Permissions** → Requieren policies

## 💡 Tips

- 🔍 Usa `npm run test:compare` antes de migrar para ver qué va a cambiar
- 📝 Los snapshots JSON sirven como backup
- ⏸️ Tienes 5 segundos para cancelar con Ctrl+C
- 🐛 Usa `DEBUG=true` si necesitas diagnosticar problemas
- 🔁 Es seguro ejecutar múltiples veces (solo crea lo que falta)

## 📝 Licencia

ISC

## 🤝 Contribuciones

Pull requests son bienvenidos. Para cambios mayores, abre un issue primero.
