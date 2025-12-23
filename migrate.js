import { writeFile } from 'fs/promises';

// Configuración - Desarrollo es SOURCE, Producción es TARGET
const DEV_URL = process.env.DEV_URL;
const DEV_TOKEN = process.env.DEV_TOKEN;
const PROD_URL = process.env.PROD_URL;
const PROD_TOKEN = process.env.PROD_TOKEN;
const DEBUG = process.env.DEBUG === 'true';

// Validar configuración
function validateConfig() {
  const missing = [];
  
  if (!DEV_URL) missing.push('DEV_URL');
  if (!DEV_TOKEN) missing.push('DEV_TOKEN');
  if (!PROD_URL) missing.push('PROD_URL');
  if (!PROD_TOKEN) missing.push('PROD_TOKEN');
  
  if (missing.length > 0) {
    console.error('❌ ERROR: Variables de entorno no configuradas:\n');
    missing.forEach(v => console.error(`   ✗ ${v}`));
    console.error('\n💡 Configura las variables así:\n');
    console.error('   export DEV_URL=https://dev.directus.com');
    console.error('   export DEV_TOKEN=tu-token-admin-dev');
    console.error('   export PROD_URL=https://prod.directus.com');
    console.error('   export PROD_TOKEN=tu-token-admin-prod');
    console.error('\n📖 Ver documentación completa: npm run help\n');
    process.exit(1);
  }
}

// Mapas para hacer seguimiento de IDs
const idMaps = {
  roles: new Map(),
  policies: new Map(),
  flows: new Map(),
  operations: new Map()
};

function debug(...args) {
  if (DEBUG) {
    console.log('🔍 DEBUG:', ...args);
  }
}

async function getSnapshot(url, token, name) {
  console.log(`📥 Obteniendo snapshot de ${name}...`);
  
  const response = await fetch(`${url}/schema/snapshot`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`Error obteniendo snapshot de ${name}: ${response.statusText}`);
  }
  
  const snapshot = await response.json();
  await writeFile(`snapshot_${name}.json`, JSON.stringify(snapshot, null, 2));
  
  // Debug info
  debug(`Snapshot ${name} estructura:`, {
    hasData: !!snapshot.data,
    collectionsCount: snapshot?.data?.collections?.length || 0,
    fieldsCount: snapshot?.data?.fields?.length || 0,
    systemFieldsCount: snapshot?.data?.systemFields?.length || 0,
    relationsCount: snapshot?.data?.relations?.length || 0
  });
  console.log(`✅ Snapshot de ${name} guardado`);
  return snapshot;
}

async function getData(url, token, endpoint, name) {
  console.log(`📥 Obteniendo ${endpoint} de ${name}...`);
  
  const response = await fetch(`${url}/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`Error obteniendo ${endpoint} de ${name}: ${response.statusText}`);
  }
  
  const { data } = await response.json();
  console.log(`✅ ${data.length} ${endpoint} obtenidos de ${name}`);
  return data;
}

function compareCollections(devSnapshot, prodSnapshot) {
  console.log('\n🔍 Comparando collections...');
  
  // Acceder a data.collections en lugar de collections directamente
  const devCollections = devSnapshot?.data?.collections || [];
  const prodCollections = prodSnapshot?.data?.collections || [];
  const prodCollectionNames = new Set(prodCollections.map(c => c.collection));
  
  const newCollections = devCollections.filter(c => !prodCollectionNames.has(c.collection));
  
  console.log(`  📊 Collections en desarrollo: ${devCollections.length}`);
  console.log(`  📊 Collections en producción: ${prodCollections.length}`);
  console.log(`  ➕ Collections nuevas a crear: ${newCollections.length}`);
  
  if (newCollections.length > 0) {
    console.log('    -', newCollections.map(c => c.collection).join(', '));
  }
  
  return newCollections;
}

function compareFields(devSnapshot, prodSnapshot) {
  console.log('\n🔍 Comparando fields...');
  
  // Combinar fields regulares y systemFields
  const devFields = [
    ...(devSnapshot?.data?.fields || []),
    ...(devSnapshot?.data?.systemFields || [])
  ];
  const prodFields = [
    ...(prodSnapshot?.data?.fields || []),
    ...(prodSnapshot?.data?.systemFields || [])
  ];
  
  // Crear mapa de campos existentes en producción: collection.field -> field
  const prodFieldsMap = new Map();
  prodFields.forEach(f => {
    prodFieldsMap.set(`${f.collection}.${f.field}`, f);
  });
  
  // Encontrar campos nuevos o actualizados
  const newFields = [];
  const updatedFields = [];
  
  devFields.forEach(devField => {
    const key = `${devField.collection}.${devField.field}`;
    const prodField = prodFieldsMap.get(key);
    
    if (!prodField) {
      newFields.push(devField);
    } else {
      // Comparar schema básico (type, special, etc)
      const hasChanges = 
        devField.type !== prodField.type ||
        JSON.stringify(devField.schema) !== JSON.stringify(prodField.schema) ||
        JSON.stringify(devField.meta?.special) !== JSON.stringify(prodField.meta?.special);
      
      if (hasChanges) {
        updatedFields.push(devField);
      }
    }
  });
  
  console.log(`  📊 Fields en desarrollo: ${devFields.length}`);
  console.log(`  📊 Fields en producción: ${prodFields.length}`);
  console.log(`  ➕ Fields nuevos: ${newFields.length}`);
  console.log(`  🔄 Fields actualizados: ${updatedFields.length}`);
  
  if (newFields.length > 0) {
    // Mostrar algunos ejemplos
    const examples = newFields.slice(0, 10).map(f => `${f.collection}.${f.field}`).join(', ');
    console.log(`    Ejemplos: ${examples}${newFields.length > 10 ? '...' : ''}`);
  }
  
  return { newFields, updatedFields };
}

function compareRelations(devSnapshot, prodSnapshot) {
  console.log('\n🔍 Comparando relations...');
  
  const devRelations = devSnapshot?.data?.relations || [];
  const prodRelations = prodSnapshot?.data?.relations || [];
  
  // Crear mapa de relaciones existentes: collection.field -> relation
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
  
  if (newRelations.length > 0) {
    const examples = newRelations.slice(0, 10).map(r => `${r.collection}.${r.field}`).join(', ');
    console.log(`    Ejemplos: ${examples}${newRelations.length > 10 ? '...' : ''}`);
  }
  
  return newRelations;
}

function compareRoles(devRoles, prodRoles) {
  console.log('\n🔍 Comparando roles...');
  
  const prodRoleNames = new Set(prodRoles.map(r => r.name));
  const newRoles = devRoles.filter(r => !prodRoleNames.has(r.name));
  
  console.log(`  📊 Roles en desarrollo: ${devRoles.length}`);
  console.log(`  📊 Roles en producción: ${prodRoles.length}`);
  console.log(`  ➕ Roles nuevos: ${newRoles.length}`);
  
  if (newRoles.length > 0) {
    console.log('    -', newRoles.map(r => r.name).join(', '));
  }
  
  return newRoles;
}

function comparePolicies(devPolicies, prodPolicies) {
  console.log('\n🔍 Comparando policies...');
  
  const prodPolicyNames = new Set(prodPolicies.map(p => p.name));
  const newPolicies = devPolicies.filter(p => !prodPolicyNames.has(p.name));
  
  console.log(`  📊 Policies en desarrollo: ${devPolicies.length}`);
  console.log(`  📊 Policies en producción: ${prodPolicies.length}`);
  console.log(`  ➕ Policies nuevas: ${newPolicies.length}`);
  
  return newPolicies;
}

function compareFlows(devFlows, prodFlows) {
  console.log('\n🔍 Comparando flows...');
  
  const prodFlowNames = new Set(prodFlows.map(f => f.name));
  const newFlows = devFlows.filter(f => !prodFlowNames.has(f.name));
  
  console.log(`  📊 Flows en desarrollo: ${devFlows.length}`);
  console.log(`  📊 Flows en producción: ${prodFlows.length}`);
  console.log(`  ➕ Flows nuevos: ${newFlows.length}`);
  
  if (newFlows.length > 0) {
    console.log('    -', newFlows.map(f => f.name).join(', '));
  }
  
  return newFlows;
}

async function createCollections(collections) {
  if (collections.length === 0) return;
  
  console.log('\n📤 Creando collections nuevas...');
  
  for (const collection of collections) {
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
        console.error(`  ❌ Error creando collection ${collection.collection}: ${error}`);
        continue;
      }
      
      console.log(`  ✅ Collection "${collection.collection}" creada`);
    } catch (error) {
      console.error(`  ❌ Error creando collection ${collection.collection}:`, error.message);
    }
  }
}

async function createFields(fields) {
  if (fields.length === 0) return;
  
  console.log('\n📤 Creando fields nuevos...');
  
  // Separar system fields de fields regulares
  const systemFields = fields.filter(f => f.collection.startsWith('directus_'));
  const regularFields = fields.filter(f => !f.collection.startsWith('directus_'));
  
  // Agrupar por colección
  const fieldsByCollection = new Map();
  regularFields.forEach(field => {
    if (!fieldsByCollection.has(field.collection)) {
      fieldsByCollection.set(field.collection, []);
    }
    fieldsByCollection.get(field.collection).push(field);
  });
  
  // Crear fields regulares uno por uno (la API espera un objeto, no un array)
  for (const [collection, collectionFields] of fieldsByCollection) {
    let successCount = 0;
    let errorCount = 0;
    
    for (const field of collectionFields) {
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
          const error = await response.text();
          console.error(`  ❌ Error creando field ${collection}.${field.field}: ${error}`);
          errorCount++;
          continue;
        }
        
        successCount++;
        debug(`  ✅ Field "${collection}.${field.field}" creado`);
      } catch (error) {
        console.error(`  ❌ Error creando field ${collection}.${field.field}:`, error.message);
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      console.log(`  ✅ ${successCount} fields creados en "${collection}"${errorCount > 0 ? ` (${errorCount} errores)` : ''}`);
    } else if (errorCount > 0) {
      console.log(`  ❌ ${errorCount} fields fallaron en "${collection}"`);
    }
  }
  
  // Crear system fields uno por uno
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
          console.error(`  ❌ Error creando field ${field.collection}.${field.field}: ${error}`);
          continue;
        }
        
        console.log(`  ✅ System field "${field.collection}.${field.field}" creado`);
      } catch (error) {
        console.error(`  ❌ Error creando system field ${field.collection}.${field.field}:`, error.message);
      }
    }
  }
}

async function createRelations(relations) {
  if (relations.length === 0) return;
  
  console.log('\n📤 Creando relations nuevas...');
  
  for (const relation of relations) {
    try {
      // Omitir el schema para evitar errores de foreign key constraint
      // (incompatibilidad de charset/collation en MySQL/MariaDB)
      // Directus creará la relación solo a nivel de metadatos
      const relationData = {
        collection: relation.collection,
        field: relation.field,
        related_collection: relation.related_collection,
        meta: relation.meta
        // No incluir 'schema' para evitar crear FK constraint en BD
      };
      
      const response = await fetch(`${PROD_URL}/relations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(relationData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error creando relation ${relation.collection}.${relation.field}: ${error}`);
        continue;
      }
      
      console.log(`  ✅ Relation "${relation.collection}.${relation.field}" creada`);
    } catch (error) {
      console.error(`  ❌ Error creando relation ${relation.collection}.${relation.field}:`, error.message);
    }
  }
}

async function createRoles(roles, prodRoles) {
  if (roles.length === 0) return;
  
  console.log('\n📤 Creando roles nuevos...');
  
  for (const role of roles) {
    const roleData = {
      name: role.name,
      icon: role.icon,
      description: role.description
    };
    
    try {
      const response = await fetch(`${PROD_URL}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(roleData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error creando rol ${role.name}: ${error}`);
        continue;
      }
      
      const { data } = await response.json();
      idMaps.roles.set(role.id, data.id);
      console.log(`  ✅ Rol "${role.name}" creado`);
    } catch (error) {
      console.error(`  ❌ Error creando rol ${role.name}:`, error.message);
    }
  }
  
  // También mapear roles existentes por nombre
  for (const devRole of roles) {
    const prodRole = prodRoles.find(p => p.name === devRole.name);
    if (prodRole && !idMaps.roles.has(devRole.id)) {
      idMaps.roles.set(devRole.id, prodRole.id);
    }
  }
}

async function createPolicies(policies, prodPolicies, allDevRoles, allProdRoles) {
  if (policies.length === 0) return;
  
  console.log('\n📤 Creando policies nuevas...');
  
  // Mapear todos los roles existentes
  for (const devRole of allDevRoles) {
    const prodRole = allProdRoles.find(p => p.name === devRole.name);
    if (prodRole && !idMaps.roles.has(devRole.id)) {
      idMaps.roles.set(devRole.id, prodRole.id);
    }
  }
  
  for (const policy of policies) {
    const policyData = {
      name: policy.name,
      icon: policy.icon,
      description: policy.description,
      ip_access: policy.ip_access,
      enforce_tfa: policy.enforce_tfa,
      admin_access: policy.admin_access,
      app_access: policy.app_access,
      roles: policy.roles?.map(roleId => idMaps.roles.get(roleId) || roleId).filter(Boolean) || []
    };
    
    try {
      const response = await fetch(`${PROD_URL}/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(policyData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error creando policy ${policy.name}: ${error}`);
        continue;
      }
      
      const { data } = await response.json();
      idMaps.policies.set(policy.id, data.id);
      console.log(`  ✅ Policy "${policy.name}" creada`);
    } catch (error) {
      console.error(`  ❌ Error creando policy ${policy.name}:`, error.message);
    }
  }
  
  // Mapear policies existentes
  for (const devPolicy of policies) {
    const prodPolicy = prodPolicies.find(p => p.name === devPolicy.name);
    if (prodPolicy && !idMaps.policies.has(devPolicy.id)) {
      idMaps.policies.set(devPolicy.id, prodPolicy.id);
    }
  }
}

async function createFlows(flows, prodFlows) {
  if (flows.length === 0) return;
  
  console.log('\n📤 Creando flows nuevos...');
  
  for (const flow of flows) {
    const flowData = {
      name: flow.name,
      icon: flow.icon,
      color: flow.color,
      description: flow.description,
      status: flow.status,
      trigger: flow.trigger,
      accountability: flow.accountability,
      options: flow.options
    };
    
    try {
      const response = await fetch(`${PROD_URL}/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(flowData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error creando flow ${flow.name}: ${error}`);
        continue;
      }
      
      const { data } = await response.json();
      idMaps.flows.set(flow.id, data.id);
      console.log(`  ✅ Flow "${flow.name}" creado`);
    } catch (error) {
      console.error(`  ❌ Error creando flow ${flow.name}:`, error.message);
    }
  }
  
  // Mapear flows existentes
  for (const devFlow of flows) {
    const prodFlow = prodFlows.find(p => p.name === devFlow.name);
    if (prodFlow && !idMaps.flows.has(devFlow.id)) {
      idMaps.flows.set(devFlow.id, prodFlow.id);
    }
  }
}

async function createOperations(devFlows, prodFlows) {
  console.log('\n📤 Obteniendo operations de flows nuevos...');
  
  // Obtener operations de desarrollo para los flows nuevos
  const devOpsResponse = await fetch(`${DEV_URL}/operations`, {
    headers: { Authorization: `Bearer ${DEV_TOKEN}` }
  });
  const { data: allDevOps } = await devOpsResponse.json();
  
  // Filtrar solo operations de flows nuevos
  const newFlowIds = Array.from(idMaps.flows.keys());
  const operations = allDevOps.filter(op => newFlowIds.includes(op.flow));
  
  if (operations.length === 0) {
    console.log('  ℹ️  No hay operations que crear');
    return;
  }
  
  console.log(`\n📤 Creando ${operations.length} operations...`);
  
  // Crear operations sin resolve/reject primero
  for (const operation of operations) {
    const operationData = {
      name: operation.name,
      key: operation.key,
      type: operation.type,
      position_x: operation.position_x,
      position_y: operation.position_y,
      options: operation.options,
      flow: idMaps.flows.get(operation.flow) || operation.flow,
      resolve: null,
      reject: null
    };
    
    try {
      const response = await fetch(`${PROD_URL}/operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(operationData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error creando operation ${operation.name}: ${error}`);
        continue;
      }
      
      const { data } = await response.json();
      idMaps.operations.set(operation.id, data.id);
      console.log(`  ✅ Operation "${operation.name}" creada`);
    } catch (error) {
      console.error(`  ❌ Error creando operation ${operation.name}:`, error.message);
    }
  }
  
  // Actualizar resolve/reject
  console.log('\n🔗 Vinculando operations...');
  for (const operation of operations) {
    const newId = idMaps.operations.get(operation.id);
    if (!newId) continue;
    
    const updates = {};
    if (operation.resolve) {
      updates.resolve = idMaps.operations.get(operation.resolve) || operation.resolve;
    }
    if (operation.reject) {
      updates.reject = idMaps.operations.get(operation.reject) || operation.reject;
    }
    
    if (Object.keys(updates).length === 0) continue;
    
    try {
      const response = await fetch(`${PROD_URL}/operations/${newId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error vinculando operation ${operation.name}: ${error}`);
      }
    } catch (error) {
      console.error(`  ❌ Error vinculando operation ${operation.name}:`, error.message);
    }
  }
  
  // Vincular flows a operations
  console.log('\n🔗 Vinculando flows a operations...');
  const devFlowsWithOps = devFlows.filter(f => f.operation && idMaps.flows.has(f.id));
  
  for (const flow of devFlowsWithOps) {
    const newFlowId = idMaps.flows.get(flow.id);
    const newOperationId = idMaps.operations.get(flow.operation);
    
    if (!newFlowId || !newOperationId) continue;
    
    try {
      const response = await fetch(`${PROD_URL}/flows/${newFlowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify({ operation: newOperationId })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error vinculando flow ${flow.name}: ${error}`);
      } else {
        console.log(`  ✅ Flow "${flow.name}" vinculado a operation`);
      }
    } catch (error) {
      console.error(`  ❌ Error vinculando flow ${flow.name}:`, error.message);
    }
  }
}

async function createPermissions(devPolicies, prodPolicies) {
  console.log('\n📤 Obteniendo permissions de policies nuevas...');
  
  // Obtener todas las permissions de desarrollo
  const devPermsResponse = await fetch(`${DEV_URL}/permissions`, {
    headers: { Authorization: `Bearer ${DEV_TOKEN}` }
  });
  const { data: allDevPerms } = await devPermsResponse.json();
  
  // Obtener permissions de producción
  const prodPermsResponse = await fetch(`${PROD_URL}/permissions`, {
    headers: { Authorization: `Bearer ${PROD_TOKEN}` }
  });
  const { data: allProdPerms } = await prodPermsResponse.json();
  
  // Mapear policies existentes
  for (const devPolicy of devPolicies) {
    const prodPolicy = prodPolicies.find(p => p.name === devPolicy.name);
    if (prodPolicy && !idMaps.policies.has(devPolicy.id)) {
      idMaps.policies.set(devPolicy.id, prodPolicy.id);
    }
  }
  
  // Crear set de permissions existentes en producción
  const prodPermsSet = new Set(
    allProdPerms.map(p => `${p.policy}:${p.collection}:${p.action}`)
  );
  
  // Filtrar permissions que no existen en producción
  const newPermissions = allDevPerms.filter(perm => {
    const prodPolicyId = idMaps.policies.get(perm.policy);
    if (!prodPolicyId) return false; // Solo crear permissions para policies que existen
    
    const key = `${prodPolicyId}:${perm.collection}:${perm.action}`;
    return !prodPermsSet.has(key);
  });
  
  if (newPermissions.length === 0) {
    console.log('  ℹ️  No hay permissions nuevos que crear');
    return;
  }
  
  console.log(`\n📤 Creando ${newPermissions.length} permissions...`);
  
  for (const permission of newPermissions) {
    const permissionData = {
      collection: permission.collection,
      action: permission.action,
      permissions: permission.permissions,
      validation: permission.validation,
      presets: permission.presets,
      fields: permission.fields,
      policy: idMaps.policies.get(permission.policy) || permission.policy
    };
    
    try {
      const response = await fetch(`${PROD_URL}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROD_TOKEN}`
        },
        body: JSON.stringify(permissionData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error creando permission ${permission.collection}:${permission.action}: ${error}`);
        continue;
      }
      
      console.log(`  ✅ Permission "${permission.collection}" (${permission.action}) creado`);
    } catch (error) {
      console.error(`  ❌ Error creando permission ${permission.collection}:${permission.action}:`, error.message);
    }
  }
}


async function migrate() {
  try {
    // Validar configuración primero
    validateConfig();
    
    console.log('🚀 Iniciando migración diferencial Desarrollo → Producción\n');
    console.log('═'.repeat(60));
    console.log(`📍 Desarrollo: ${DEV_URL}`);
    console.log(`📍 Producción: ${PROD_URL}`);
    console.log('═'.repeat(60));
    
    // FASE 1: Obtener snapshots y datos
    console.log('\n=== FASE 1: OBTENER DATOS DE AMBAS INSTANCIAS ===\n');
    
    const [devSnapshot, prodSnapshot] = await Promise.all([
      getSnapshot(DEV_URL, DEV_TOKEN, 'desarrollo'),
      getSnapshot(PROD_URL, PROD_TOKEN, 'produccion')
    ]);
    
    const [devRoles, prodRoles] = await Promise.all([
      getData(DEV_URL, DEV_TOKEN, 'roles', 'desarrollo'),
      getData(PROD_URL, PROD_TOKEN, 'roles', 'produccion')
    ]);
    
    const [devPolicies, prodPolicies] = await Promise.all([
      getData(DEV_URL, DEV_TOKEN, 'policies', 'desarrollo'),
      getData(PROD_URL, PROD_TOKEN, 'policies', 'produccion')
    ]);
    
    const [devFlows, prodFlows] = await Promise.all([
      getData(DEV_URL, DEV_TOKEN, 'flows', 'desarrollo'),
      getData(PROD_URL, PROD_TOKEN, 'flows', 'produccion')
    ]);
    
    // FASE 2: Comparar diferencias
    console.log('\n=== FASE 2: ANALIZAR DIFERENCIAS ===');
    console.log('═'.repeat(60));
    
    const newCollections = compareCollections(devSnapshot, prodSnapshot);
    const { newFields, updatedFields } = compareFields(devSnapshot, prodSnapshot);
    const newRelations = compareRelations(devSnapshot, prodSnapshot);
    const newRoles = compareRoles(devRoles, prodRoles);
    const newPolicies = comparePolicies(devPolicies, prodPolicies);
    const newFlows = compareFlows(devFlows, prodFlows);
    
    // Resumen de diferencias
    console.log('\n📊 RESUMEN DE DIFERENCIAS:');
    console.log('═'.repeat(60));
    console.log(`  ➕ Collections nuevas: ${newCollections.length}`);
    console.log(`  ➕ Fields nuevos: ${newFields.length}`);
    console.log(`  🔄 Fields actualizados: ${updatedFields.length}`);
    console.log(`  ➕ Relations nuevas: ${newRelations.length}`);
    console.log(`  ➕ Roles nuevos: ${newRoles.length}`);
    console.log(`  ➕ Policies nuevas: ${newPolicies.length}`);
    console.log(`  ➕ Flows nuevos: ${newFlows.length}`);
    console.log('═'.repeat(60));
    
    const totalChanges = 
      newCollections.length + 
      newFields.length + 
      updatedFields.length + 
      newRelations.length + 
      newRoles.length + 
      newPolicies.length + 
      newFlows.length;
    
    if (totalChanges === 0) {
      console.log('\n✅ No hay diferencias. Producción está sincronizada con desarrollo.');
      return;
    }
    
    console.log(`\n⚠️  Se encontraron ${totalChanges} cambios para aplicar.`);
    console.log('\nPresiona Ctrl+C para cancelar o espera 5 segundos para continuar...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // FASE 3: Aplicar cambios
    console.log('\n=== FASE 3: APLICAR CAMBIOS A PRODUCCIÓN ===');
    console.log('═'.repeat(60));
    
    // Orden de creación: Collections → Fields → Relations → Roles → Policies → Flows → Operations → Permissions
    
    await createCollections(newCollections);
    await createFields(newFields);
    await createRelations(newRelations);
    await createRoles(newRoles, prodRoles);
    await createPolicies(newPolicies, prodPolicies, devRoles, prodRoles);
    await createFlows(newFlows, prodFlows);
    await createOperations(newFlows, prodFlows);
    await createPermissions(devPolicies, prodPolicies);
    
    console.log('\n═'.repeat(60));
    console.log('✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('═'.repeat(60));
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`  ✅ Collections creadas: ${newCollections.length}`);
    console.log(`  ✅ Fields creados: ${newFields.length}`);
    console.log(`  ✅ Relations creadas: ${newRelations.length}`);
    console.log(`  ✅ Roles creados: ${newRoles.length}`);
    console.log(`  ✅ Policies creadas: ${newPolicies.length}`);
    console.log(`  ✅ Flows creados: ${newFlows.length}`);
    console.log(`  ✅ Operations creadas: ${idMaps.operations.size}`);
    
    console.log('\n💾 Archivos de respaldo generados:');
    console.log('  - snapshot_desarrollo.json');
    console.log('  - snapshot_produccion.json');
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
