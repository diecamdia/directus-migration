#!/usr/bin/env node

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Directus Differential Migration Tool                   ║
╚════════════════════════════════════════════════════════════════╝

📚 Uso:

  🔍 ANÁLISIS (sin aplicar cambios)
  
  1️⃣  Análisis rápido con snapshots locales (RECOMENDADO)
     npm run migrate:local:dry
     
     → Usa snapshots ya guardados
     → NO requiere conexión a las instancias
     → NO aplica ningún cambio
     → Útil para revisar qué se va a migrar

  2️⃣  Análisis conectándose a las instancias
     npm run test:compare
     
     → Descarga snapshots actuales
     → Requiere DEV_URL y DEV_TOKEN
     → NO aplica cambios

  ⚙️  MIGRACIÓN (aplica cambios)

  3️⃣  Migración desde snapshots locales (RECOMENDADO)
     export PROD_URL=https://prod.directus.com
     export PROD_TOKEN=tu-token-admin-prod
     npm run migrate:local
     
     → Usa snapshots ya guardados (snapshot_desarrollo.json)
     → Solo requiere configurar producción
     → Aplica cambios a producción
     → Más rápido y seguro

  4️⃣  Migración completa (conecta a ambas instancias)
     export DEV_URL=https://dev.directus.com
     export DEV_TOKEN=tu-token-admin-dev
     export PROD_URL=https://prod.directus.com
     export PROD_TOKEN=tu-token-admin-prod
     npm run migrate
     
     → Descarga snapshots actuales de ambas
     → Requiere configurar ambas instancias
     → Aplica cambios a producción

  5️⃣  Migración con modo debug
     DEBUG=true npm run migrate
     
     → Igual que migración completa con logs detallados

🔧 Configuración mínima:

   Para análisis (dry-run):
   ✅ No requiere configuración
   ✅ Usa archivos snapshot_*.json existentes

   Para aplicar cambios:
   export PROD_URL=https://prod.directus.com
   export PROD_TOKEN=tu-token-admin-prod

📖 Documentación completa: MIGRATION_GUIDE.md
🐛 Cambios recientes: CAMBIOS.md

✨ Qué migra:
   ✅ Collections nuevas
   ✅ Fields nuevos (incluye system fields)
   ✅ Relations
   ✅ Roles
   ✅ Policies  
   ✅ Flows
   ✅ Operations
   ✅ Permissions

⚠️  Qué NO migra:
   ❌ Datos de las collections (items)
   ❌ Usuarios
   ❌ No elimina nada de producción

💡 Flujo de trabajo recomendado:

   1. npm run migrate:local:dry     # Ver qué va a cambiar
   2. Revisar el listado de cambios
   3. Configurar PROD_URL y PROD_TOKEN
   4. npm run migrate:local         # Aplicar cambios

`);
