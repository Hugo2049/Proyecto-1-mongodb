require('dotenv').config();
const { connectDB, getDB, closeDB } = require('../config/database');

async function setup() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  SETUP DE BASE DE DATOS              ║');
  console.log('║  Restaurantes MongoDB                ║');
  console.log('╚══════════════════════════════════════╝\n');

  await connectDB();
  const db = getDB();

  // 1. Crear JSON Schema validations
  console.log('1. Creando validaciones de esquema...\n');

  const collections = ['restaurants', 'users', 'menuItems', 'orders', 'reviews', 'eventLogs'];

  for (const name of collections) {
    try {
      await db.createCollection(name);
      console.log(`  ✓ Colección '${name}' creada`);
    } catch (e) {
      if (e.code === 48) console.log(`  ○ Colección '${name}' ya existe`);
      else throw e;
    }
  }

  // Validación para restaurants
  await db.command({
    collMod: 'restaurants',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'address', 'isActive'],
        properties: {
          name: { bsonType: 'string', description: 'Nombre del restaurante requerido' },
          address: {
            bsonType: 'object',
            required: ['street', 'city'],
            properties: {
              street: { bsonType: 'string' },
              city: { bsonType: 'string' }
            }
          },
          isActive: { bsonType: 'bool' }
        }
      }
    },
    validationLevel: 'moderate'
  });
  console.log('  ✓ Validación de restaurants configurada');

  // Validación para orders
  await db.command({
    collMod: 'orders',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['orderNumber', 'userId', 'restaurantId', 'items', 'status'],
        properties: {
          orderNumber: { bsonType: 'string' },
          status: { enum: ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'] },
          items: {
            bsonType: 'array',
            minItems: 1,
            items: {
              bsonType: 'object',
              required: ['menuItemId', 'name', 'price', 'quantity'],
              properties: {
                price: { bsonType: 'number', minimum: 0 },
                quantity: { bsonType: 'int', minimum: 1 }
              }
            }
          }
        }
      }
    },
    validationLevel: 'moderate'
  });
  console.log('  ✓ Validación de orders configurada');

  console.log('\n2. Setup completado. Ahora ejecuta:');
  console.log('   npm run indexes   → Crear índices');
  console.log('   npm run seed      → Poblar datos de ejemplo\n');

  await closeDB();
}

setup().catch(console.error);
