# Directus Differential Migration Script

Script para migrar **solo las diferencias** entre tu instancia de **Desarrollo** y **Producción**.

## Características

✅ **Migración Inteligente**: Solo crea lo que no existe en producción  
✅ **Análisis de Diferencias**: Compara ambas instancias antes de aplicar cambios  
✅ **Detección de System Fields**: Incluye cambios en colecciones del sistema (directus_users, etc)  
✅ **Seguro**: Muestra resumen y espera confirmación antes de aplicar  
✅ **Completo**: Migra collections, fields, relations, roles, policies, flows, operations y permissions  
✅ **Mapeo de IDs**: Mantiene consistencia entre referencias

## Configuración

### Variables de Entorno

```bash
# Desarrollo (origen de los cambios)
export DEV_URL=https://dev.directus.com
export DEV_TOKEN=tu-token-admin-dev

# Producción (destino de los cambios)
export PROD_URL=https://prod.directus.com
export PROD_TOKEN=tu-token-admin-prod
```

O crea un archivo `.env`:

```bash
DEV_URL=https://dev.directus.com
DEV_TOKEN=tu-token-admin-dev
PROD_URL=https://prod.directus.com
PROD_TOKEN=tu-token-admin-prod
```

## Uso

### 1. Probar comparación sin aplicar cambios

```bash
npm run test:compare
```

Esto analiza los snapshots existentes y muestra qué diferencias hay sin hacer ningún cambio.

### 2. Ejecutar migración completa

```bash
npm run migrate
```

### 3. Ejecutar con debug activado

```bash
npm run migrate:debug
```

Muestra información detallada de cada paso para debugging.

## Qué hace el script

### FASE 1: Obtener Datos
- Descarga snapshots de desarrollo y producción
- Obtiene roles, policies y flows de ambas instancias
- Guarda backups locales en archivos JSON

### FASE 2: Analizar Diferencias
Compara y detecta:
- ✅ **Collections nuevas**: Collections que existen en dev pero no en prod
- ✅ **Fields nuevos**: Campos que faltan en collections de prod (incluyendo system fields)
- ✅ **Fields actualizados**: Campos con cambios en su schema
- ✅ **Relations nuevas**: Relaciones que no existen en prod
- ✅ **Roles nuevos**: Roles definidos en dev pero no en prod
- ✅ **Policies nuevas**: Políticas que faltan en prod
- ✅ **Flows nuevos**: Flujos de automatización nuevos
- ✅ **Operations**: Operations de los flows nuevos
- ✅ **Permissions**: Permisos de las policies nuevas

**System Fields**: El script detecta automáticamente cambios en colecciones del sistema como:
- `directus_users.tenant` (campos custom en usuarios)
- `directus_files`, `directus_folders`, `directus_roles`, etc.

### FASE 3: Aplicar Cambios
Si hay diferencias:
1. Muestra resumen detallado
2. Espera 5 segundos (tiempo para cancelar con Ctrl+C)
3. Crea todo en el orden correcto:
   - Collections
   - Fields
   - Relations
   - Roles
   - Policies
   - Flows
   - Operations (con vinculaciones)
   - Permissions

## Ejemplo de Salida

```
🚀 Iniciando migración diferencial Desarrollo → Producción

=== FASE 1: OBTENER DATOS DE AMBAS INSTANCIAS ===

📥 Obteniendo snapshot de desarrollo...
✅ Snapshot de desarrollo guardado
📥 Obteniendo snapshot de produccion...
✅ Snapshot de produccion guardado

=== FASE 2: ANALIZAR DIFERENCIAS ===

🔍 Comparando collections...
  📊 Collections en desarrollo: 25
  📊 Collections en producción: 22
  ➕ Collections nuevas a crear: 3
    - products, categories, reviews

🔍 Comparando fields...
  📊 Fields en desarrollo: 180
  📊 Fields en producción: 150
  ➕ Fields nuevos: 25
  🔄 Fields actualizados: 5

📊 RESUMEN DE DIFERENCIAS:
  ➕ Collections nuevas: 3
  ➕ Fields nuevos: 25
  🔄 Fields actualizados: 5
  ➕ Relations nuevas: 8
  ➕ Roles nuevos: 2
  ➕ Policies nuevas: 1
  ➕ Flows nuevos: 2

⚠️  Se encontraron 46 cambios para aplicar.
Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...

=== FASE 3: APLICAR CAMBIOS A PRODUCCIÓN ===

📤 Creando collections nuevas...
  ✅ Collection "products" creada
  ✅ Collection "categories" creada
  ✅ Collection "reviews" creada

✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!
```

## Seguridad

- ⚠️ **NO elimina nada**: Solo crea lo que falta
- ✅ **Backups automáticos**: Guarda snapshots en archivos JSON
- ✅ **Confirmación**: Da 5 segundos para cancelar antes de aplicar
- ✅ **Logs detallados**: Muestra cada operación realizada

## Archivos Generados

Después de ejecutar, se crean:
- `snapshot_desarrollo.json` - Backup del schema de desarrollo
- `snapshot_produccion.json` - Backup del schema de producción

## Notas Importantes

- ✅ El script **NO migra datos** (items de collections)
- ✅ El script **NO migra usuarios**
- ✅ El script **NO elimina** nada de producción
- ✅ Solo **CREA** lo que falta en producción
- ⚠️ Asegúrate de tener permisos de administrador en ambas instancias
- ⚠️ Recomendado hacer backup de producción antes de ejecutar

## Orden de Migración

El script respeta las dependencias:

1. **Collections** (primero, sin dependencias)
2. **Fields** (requieren collections)
3. **Relations** (requieren fields)
4. **Roles** (independientes)
5. **Policies** (requieren roles)
6. **Flows** (independientes)
7. **Operations** (requieren flows)
8. **Permissions** (requieren policies)

## Troubleshooting

### Error de autenticación
```
Error obteniendo snapshot: Unauthorized
```
**Solución**: Verifica que los tokens sean válidos y tengan permisos de admin

### Error al crear collection
```
Error creando collection: Collection already exists
```
**Solución**: El script compara por nombre, si ya existe la omite automáticamente

### Fields no se crean
```
Error creando fields: Collection not found
```
**Solución**: Asegúrate de que las collections se crearon primero
