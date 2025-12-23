import { readFile } from 'fs/promises';

async function testComparison() {
  console.log('🧪 Probando comparación con snapshots existentes...\n');
  
  // Leer snapshots
  const devSnapshot = JSON.parse(await readFile('snapshot_desarrollo.json', 'utf-8'));
  const prodSnapshot = JSON.parse(await readFile('snapshot_produccion.json', 'utf-8'));
  
  console.log('📊 Estructura de snapshots:');
  console.log('Desarrollo:', {
    hasData: !!devSnapshot.data,
    collectionsCount: devSnapshot?.data?.collections?.length || 0,
    fieldsCount: devSnapshot?.data?.fields?.length || 0,
    systemFieldsCount: devSnapshot?.data?.systemFields?.length || 0,
    relationsCount: devSnapshot?.data?.relations?.length || 0
  });
  
  console.log('Producción:', {
    hasData: !!prodSnapshot.data,
    collectionsCount: prodSnapshot?.data?.collections?.length || 0,
    fieldsCount: prodSnapshot?.data?.fields?.length || 0,
    systemFieldsCount: prodSnapshot?.data?.systemFields?.length || 0,
    relationsCount: prodSnapshot?.data?.relations?.length || 0
  });
  
  // Collections
  console.log('\n🔍 Comparando collections...');
  const devCollections = devSnapshot?.data?.collections || [];
  const prodCollections = prodSnapshot?.data?.collections || [];
  const prodCollectionNames = new Set(prodCollections.map(c => c.collection));
  
  const newCollections = devCollections.filter(c => !prodCollectionNames.has(c.collection));
  
  console.log(`  📊 Collections en desarrollo: ${devCollections.length}`);
  console.log(`  📊 Collections en producción: ${prodCollections.length}`);
  console.log(`  ➕ Collections nuevas: ${newCollections.length}`);
  
  if (newCollections.length > 0) {
    console.log('\n  Collections nuevas a crear:');
    newCollections.forEach(c => console.log(`    - ${c.collection}`));
  }
  
  // Fields
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
  
  const newFields = devFields.filter(f => !prodFieldsMap.has(`${f.collection}.${f.field}`));
  
  console.log(`  📊 Fields en desarrollo: ${devFields.length}`);
  console.log(`  📊 Fields en producción: ${prodFields.length}`);
  console.log(`  ➕ Fields nuevos: ${newFields.length}`);
  
  if (newFields.length > 0) {
    console.log('\n  Primeros 20 fields nuevos:');
    newFields.slice(0, 20).forEach(f => console.log(`    - ${f.collection}.${f.field}`));
    if (newFields.length > 20) {
      console.log(`    ... y ${newFields.length - 20} más`);
    }
  }
  
  // System fields específicamente
  const newSystemFields = newFields.filter(f => f.collection.startsWith('directus_'));
  if (newSystemFields.length > 0) {
    console.log('\n  System fields nuevos:');
    newSystemFields.forEach(f => console.log(`    - ${f.collection}.${f.field}`));
  }
  
  // Relations
  console.log('\n🔍 Comparando relations...');
  const devRelations = devSnapshot?.data?.relations || [];
  const prodRelations = prodSnapshot?.data?.relations || [];
  
  const prodRelationsMap = new Map();
  prodRelations.forEach(r => {
    prodRelationsMap.set(`${r.collection}.${r.field}`, r);
  });
  
  const newRelations = devRelations.filter(r => !prodRelationsMap.has(`${r.collection}.${r.field}`));
  
  console.log(`  📊 Relations en desarrollo: ${devRelations.length}`);
  console.log(`  📊 Relations en producción: ${prodRelations.length}`);
  console.log(`  ➕ Relations nuevas: ${newRelations.length}`);
  
  if (newRelations.length > 0) {
    console.log('\n  Relations nuevas:');
    newRelations.forEach(r => console.log(`    - ${r.collection}.${r.field} -> ${r.related_collection || 'M2A'}`));
  }
}

testComparison().catch(console.error);
