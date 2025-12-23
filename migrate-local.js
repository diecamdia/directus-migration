import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Configuración para usar snapshots locales
const PROD_URL = process.env.PROD_URL;
const PROD_TOKEN = process.env.PROD_TOKEN;
const DRY_RUN = process.env.DRY_RUN === 'true';

// Validar configuración
function validateConfig() {
  if (DRY_RUN) {
    console.log('🔍 Modo DRY RUN - Solo análisis, no se aplicarán cambios\n');
    return;
  }
  
  const missing = [];
  
  if (!PROD_URL) missing.push('PROD_URL');
  if (!PROD_TOKEN) missing.push('PROD_TOKEN');
  
  if (missing.length > 0) {
    console.error('❌ ERROR: Variables de entorno no configuradas para aplicar cambios:\n');
    missing.forEach(v => console.error(`   ✗ ${v}`));
    console.error('\n💡 Opción 1 - Solo analizar (sin aplicar cambios):\n');
    console.error('   DRY_RUN=true npm run migrate:local\n');
    console.error('💡 Opción 2 - Configurar producción para aplicar:\n');
    console.error('   export PROD_URL=https://prod.directus.com');
    console.error('   export PROD_TOKEN=tu-token-admin-prod');
    console.error('   npm run migrate:local\n');
    process.exit(1);
  }
}

async function loadSnapshot(filename) {
  if (!existsSync(filename)) {
    throw new Error(`Archivo ${filename} no encontrado. Ejecuta primero la migración normal para obtener los snapshots.`);
  }
  
  console.log(`📥 Cargando ${filename}...`);
  const content = await readFile(filename, 'utf-8');
  return JSON.parse(content);
}

function compareCollections(devSnapshot, prodSnapshot) {
  console.log('\n🔍 Comparando collections...');
  
  const devCollections = devSnapshot?.data?.collections || [];
  const prodCollections = prodSnapshot?.data?.collections || [];
  const prodCollectionNames = new Set(prodCollections.map(c => c.collection));
  
  const newCollections = devCollections.filter(c => !prodCollectionNames.has(c.collection));
  
  console.log(`  📊 Collections en desarrollo: ${devCollections.length}`);
  console.log(`  📊 Collections en producción: ${prodCollections.length}`);
  console.log(`  ➕ Collections nuevas a crear: ${newCollections.length}`);
  
  if (newCollections.length > 0) {
    console.log('\n  Collections nuevas:');
    newCollections.forEach(c => console.log(`    - ${c.collection}`));
  }
  
  return newCollections;
}

function compareFields(devSnapshot, prodSnapshot) {
  console.log('\n🔍 Comparando fields...');
  
  const devFields = [
    ...(devSnapshot?.data?.fields || []),
    ...(devSnapshot?.data?.systemFields || [])
  ];
  const prodFields = [
    ...(prodSnapshot?.data?.fields || []),
    ...(prodSnapshot?.data?.systemFields || [])
  ];
  
  const prodFieldsMap = new Map();
  prodFields.forEach(f => {
    prodFieldsMap.set(`${f.collection}.${f.field}`, f);
  });
  
  const newFields = [];
  const updatedFields = [];
  
  devFields.forEach(devField => {
    const key = `${devField.collection}.${devField.field}`;
    const prodField = prodFieldsMap.get(key);
    
    if (!prodField) {
      newFields.push(devField);
    } else {
      const hasChanges = 
        devField.type !== prodField.type ||
        JSON.stringify(devField.schema) !== JSON.stringify(prodField.schema) ||
        JSON.stringify(devField.meta?.special) !== JSON.stringify(prodField.meta?.special);
      
      if (hasChanges) {
        updatedFields.push(devField);
      }
    }
  });
  
  // Filtrar system fields que son estándar de Directus (no custom)
  const customSystemFields = newFields.filter(f => {
    if (!f.collection.startsWith('directus_')) return true;
    
    // Lista de campos custom conocidos que SÍ queremos crear
    const customFields = ['tenant', 'custom_', 'app_'];
    return customFields.some(prefix => f.field.includes(prefix));
  });
  
  console.log(`  📊 Fields en desarrollo: ${devFields.length}`);
  console.log(`  📊 Fields en producción: ${prodFields.length}`);
  console.log(`  ➕ Fields nuevos: ${customSystemFields.length} (${newFields.length - customSystemFields.length} system fields estándar ignorados)`);
  console.log(`  🔄 Fields actualizados: ${updatedFields.length}`);
  
  if (customSystemFields.length > 0) {
    const systemFields = customSystemFields.filter(f => f.collection.startsWith('directus_'));
    const regularFields = customSystemFields.filter(f => !f.collection.startsWith('directus_'));
    
    if (regularFields.length > 0) {
      console.log(`\n  Fields nuevos regulares (primeros 15):`);
      regularFields.slice(0, 15).forEach(f => console.log(`    - ${f.collection}.${f.field}`));
      if (regularFields.length > 15) {
        console.log(`    ... y ${regularFields.length - 15} más`);
      }
    }
    
    if (systemFields.length > 0) {
      console.log(`\n  System fields nuevos (custom):`);
      systemFields.forEach(f => console.log(`    - ${f.collection}.${f.field}`));
    }
  }
  
  return { newFields: customSystemFields, updatedFields };
}

function compareRelations(devSnapshot, prodSnapshot) {
  console.log('\n🔍 Comparando relations...');
  
  const devRelations = devSnapshot?.data?.relations || [];
  const prodRelations = prodSnapshot?.data?.relations || [];
  
  const prodRelationsMap = new Map();
  prodRelations.forEach(r => {
    prodRelationsMap.set(`${r.collection}.${r.field}`, r);
  });
  
  const newRelations = devRelations.filter(r => 
    !prodRelationsMap.has(`${r.collection}.${r.field}`)
  );
  
  console.log(`  📊 Relations en desarrollo: ${devRelations.length}`);
  console.log(`  📊 Relations en producción: ${prodRelations.length}`);
  console.log(`  ➕ Relations nuevas: ${newRelations.length}`);
  
  if (newRelations.length > 0 && newRelations.length <= 20) {
    console.log('\n  Relations nuevas:');
    newRelations.forEach(r => console.log(`    - ${r.collection}.${r.field} → ${r.related_collection || 'M2A'}`));
  } else if (newRelations.length > 20) {
    console.log(`\n  Primeras 20 relations nuevas:`);
    newRelations.slice(0, 20).forEach(r => console.log(`    - ${r.collection}.${r.field} → ${r.related_collection || 'M2A'}`));
    console.log(`    ... y ${newRelations.length - 20} más`);
  }
  
  return newRelations;
}

async function applyChanges(newCollections, newFields, newRelations) {
  if (DRY_RUN) {
    console.log('\n⚠️  Modo DRY RUN - Los cambios NO se aplicarán');
    return;
  }
  
  console.log('\n⚠️  ¿Deseas aplicar estos cambios a producción?');
  console.log('    Presiona Ctrl+C para cancelar o espera 5 segundos...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n=== APLICANDO CAMBIOS A PRODUCCIÓN ===\n');
  
  // Crear collections
  if (newCollections.length > 0) {
    console.log(`📤 Creando ${newCollections.length} collections...`);
    for (const collection of newCollections) {
      try {
        const response = await fetch(`${PROD_URL}/collections`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${PROD_TOKEN}`
          },
          body: JSON.stringify(collection)
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`  ❌ ${collection.collection}: ${error}`);
        } else {
          console.log(`  ✅ ${collection.collection}`);
        }
      } catch (error) {
        console.error(`  ❌ ${collection.collection}: ${error.message}`);
      }
    }
  }
  
  // Crear fields
  if (newFields.length > 0) {
    console.log(`\n📤 Creando ${newFields.length} fields...`);
    
    const systemFields = newFields.filter(f => f.collection.startsWith('directus_'));
    const regularFields = newFields.filter(f => !f.collection.startsWith('directus_'));
    
    // Agrupar fields regulares por colección
    const fieldsByCollection = new Map();
    regularFields.forEach(field => {
      if (!fieldsByCollection.has(field.collection)) {
        fieldsByCollection.set(field.collection, []);
      }
      fieldsByCollection.get(field.collection).push(field);
    });
    
    // Crear fields regulares UNO POR UNO
    let successCount = 0;
    let errorCount = 0;
    
    for (const [collection, fields] of fieldsByCollection) {
      for (const field of fields) {
        try {
          const response = await fetch(`${PROD_URL}/fields/${collection}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${PROD_TOKEN}`
            },
            body: JSON.stringify(field)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorMsg;
            try {
              const errorJson = JSON.parse(errorText);
              errorMsg = errorJson.errors?.[0]?.message || errorText;
            } catch {
              errorMsg = errorText.substring(0, 100);
            }
            console.error(`  ❌ ${collection}.${field.field}: ${errorMsg}`);
            errorCount++;
          } else {
            console.log(`  ✅ ${collection}.${field.field}`);
            successCount++;
          }
        } catch (error) {
          console.error(`  ❌ ${collection}.${field.field}: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    if (regularFields.length > 0) {
      console.log(`\n  📊 Fields regulares: ${successCount} exitosos, ${errorCount} errores`);
    }
    
    // Crear system fields
    if (systemFields.length > 0) {
      console.log(`\n📤 Creando ${systemFields.length} system fields...`);
      for (const field of systemFields) {
        try {
          const response = await fetch(`${PROD_URL}/fields/${field.collection}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${PROD_TOKEN}`
            },
            body: JSON.stringify(field)
          });
          
          if (!response.ok) {
            const error = await response.text();
            console.error(`  ❌ ${field.collection}.${field.field}: ${error}`);
          } else {
            console.log(`  ✅ ${field.collection}.${field.field}`);
          }
        } catch (error) {
          console.error(`  ❌ ${field.collection}.${field.field}: ${error.message}`);
        }
      }
    }
  }
  
  // Crear relations
  if (newRelations.length > 0) {
    console.log(`\n📤 Creando ${newRelations.length} relations...`);
    for (const relation of newRelations) {
      try {
        const response = await fetch(`${PROD_URL}/relations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${PROD_TOKEN}`
          },
          body: JSON.stringify(relation)
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`  ❌ ${relation.collection}.${relation.field}: ${error}`);
        } else {
          console.log(`  ✅ ${relation.collection}.${relation.field}`);
        }
      } catch (error) {
        console.error(`  ❌ ${relation.collection}.${relation.field}: ${error.message}`);
      }
    }
  }
}

async function migrateFromLocal() {
  try {
    validateConfig();
    
    console.log('🚀 Migración usando snapshots locales\n');
    console.log('═'.repeat(60));
    if (!DRY_RUN) {
      console.log(`📍 Producción: ${PROD_URL}`);
    }
    console.log('═'.repeat(60));
    
    // Cargar snapshots locales
    console.log('\n=== CARGANDO SNAPSHOTS LOCALES ===\n');
    const devSnapshot = await loadSnapshot('snapshot_desarrollo.json');
    const prodSnapshot = await loadSnapshot('snapshot_produccion.json');
    
    console.log('✅ Snapshots cargados correctamente');
    
    // Comparar
    console.log('\n=== ANALIZANDO DIFERENCIAS ===');
    const newCollections = compareCollections(devSnapshot, prodSnapshot);
    const { newFields, updatedFields } = compareFields(devSnapshot, prodSnapshot);
    const newRelations = compareRelations(devSnapshot, prodSnapshot);
    
    // Resumen
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE DIFERENCIAS');
    console.log('═'.repeat(60));
    console.log(`  ➕ Collections nuevas: ${newCollections.length}`);
    console.log(`  ➕ Fields nuevos: ${newFields.length}`);
    console.log(`  🔄 Fields actualizados: ${updatedFields.length}`);
    console.log(`  ➕ Relations nuevas: ${newRelations.length}`);
    console.log('═'.repeat(60));
    
    const totalChanges = newCollections.length + newFields.length + newRelations.length;
    
    if (totalChanges === 0) {
      console.log('\n✅ No hay diferencias. Producción está sincronizada.');
      return;
    }
    
    // Aplicar cambios
    await applyChanges(newCollections, newFields, newRelations);
    
    if (!DRY_RUN) {
      console.log('\n✅ ¡MIGRACIÓN COMPLETADA!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateFromLocal();
