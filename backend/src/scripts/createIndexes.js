require('dotenv').config();
const { connectDB, getDB, closeDB } = require('../config/database');

async function createIndexes() {
  await connectDB();
  const db = getDB();

  console.log('Creando índices...\n');

  // ========================================
  // RESTAURANTS
  // ========================================

  // Texto - Búsqueda por nombre/descripción
  await db.collection('restaurants').createIndex(
    { name: 'text', description: 'text' },
    { name: 'idx_restaurants_text', weights: { name: 10, description: 5 } }
  );
  console.log('✓ restaurants: índice TEXTO (name, description)');

  // Multikey - Categorías
  await db.collection('restaurants').createIndex(
    { categories: 1 },
    { name: 'idx_restaurants_categories' }
  );
  console.log('✓ restaurants: índice MULTIKEY (categories)');

  // Compuesto - Rating + activo
  await db.collection('restaurants').createIndex(
    { 'rating.average': -1, isActive: 1 },
    { name: 'idx_restaurants_rating_active' }
  );
  console.log('✓ restaurants: índice COMPUESTO (rating.average, isActive)');

  // Geoespacial - Ubicación
  await db.collection('restaurants').createIndex(
    { 'address.location': '2dsphere' },
    { name: 'idx_restaurants_location' }
  );
  console.log('✓ restaurants: índice GEOESPACIAL (address.location)');

  // Simple - isActive
  await db.collection('restaurants').createIndex(
    { isActive: 1 },
    { name: 'idx_restaurants_active' }
  );
  console.log('✓ restaurants: índice SIMPLE (isActive)');

  // ========================================
  // USERS
  // ========================================

  // Simple Unique - email
  await db.collection('users').createIndex(
    { email: 1 },
    { name: 'idx_users_email', unique: true }
  );
  console.log('✓ users: índice SIMPLE UNIQUE (email)');

  // Multikey - Preferencias dietéticas
  await db.collection('users').createIndex(
    { dietaryPrefs: 1 },
    { name: 'idx_users_dietary' }
  );
  console.log('✓ users: índice MULTIKEY (dietaryPrefs)');

  // ========================================
  // MENUITEMS
  // ========================================

  // Compuesto - restaurante + categoría + disponible
  await db.collection('menuItems').createIndex(
    { restaurantId: 1, category: 1, isAvailable: 1 },
    { name: 'idx_menuitems_restaurant_cat_avail' }
  );
  console.log('✓ menuItems: índice COMPUESTO (restaurantId, category, isAvailable)');

  // Multikey - Alérgenos
  await db.collection('menuItems').createIndex(
    { allergens: 1 },
    { name: 'idx_menuitems_allergens' }
  );
  console.log('✓ menuItems: índice MULTIKEY (allergens)');

  // Texto - Búsqueda de platillos
  await db.collection('menuItems').createIndex(
    { name: 'text', description: 'text' },
    { name: 'idx_menuitems_text', weights: { name: 10, description: 5 } }
  );
  console.log('✓ menuItems: índice TEXTO (name, description)');

  // Simple - precio
  await db.collection('menuItems').createIndex(
    { price: 1 },
    { name: 'idx_menuitems_price' }
  );
  console.log('✓ menuItems: índice SIMPLE (price)');

  // ========================================
  // ORDERS
  // ========================================

  // Compuesto - usuario + fecha
  await db.collection('orders').createIndex(
    { userId: 1, createdAt: -1 },
    { name: 'idx_orders_user_date' }
  );
  console.log('✓ orders: índice COMPUESTO (userId, createdAt)');

  // Compuesto - restaurante + estado + fecha
  await db.collection('orders').createIndex(
    { restaurantId: 1, status: 1, createdAt: -1 },
    { name: 'idx_orders_restaurant_status_date' }
  );
  console.log('✓ orders: índice COMPUESTO (restaurantId, status, createdAt)');

  // Simple Unique - orderNumber
  await db.collection('orders').createIndex(
    { orderNumber: 1 },
    { name: 'idx_orders_number', unique: true }
  );
  console.log('✓ orders: índice SIMPLE UNIQUE (orderNumber)');

  // Compuesto - status + pricing.total
  await db.collection('orders').createIndex(
    { status: 1, 'pricing.total': -1 },
    { name: 'idx_orders_status_total' }
  );
  console.log('✓ orders: índice COMPUESTO (status, pricing.total)');

  // ========================================
  // REVIEWS
  // ========================================

  // Compuesto - target + fecha
  await db.collection('reviews').createIndex(
    { targetType: 1, targetId: 1, createdAt: -1 },
    { name: 'idx_reviews_target_date' }
  );
  console.log('✓ reviews: índice COMPUESTO (targetType, targetId, createdAt)');

  // Multikey - Tags
  await db.collection('reviews').createIndex(
    { tags: 1 },
    { name: 'idx_reviews_tags' }
  );
  console.log('✓ reviews: índice MULTIKEY (tags)');

  // Texto - Comentarios
  await db.collection('reviews').createIndex(
    { comment: 'text', title: 'text' },
    { name: 'idx_reviews_text' }
  );
  console.log('✓ reviews: índice TEXTO (comment, title)');

  // Simple - rating
  await db.collection('reviews').createIndex(
    { rating: 1 },
    { name: 'idx_reviews_rating' }
  );
  console.log('✓ reviews: índice SIMPLE (rating)');

  // ========================================
  // EVENTLOGS
  // ========================================

  // Simple - timestamp (con TTL de 1 año)
  await db.collection('eventLogs').createIndex(
    { timestamp: -1 },
    { name: 'idx_events_timestamp' }
  );
  console.log('✓ eventLogs: índice SIMPLE (timestamp)');

  // Compuesto - usuario + tipo + timestamp
  await db.collection('eventLogs').createIndex(
    { userId: 1, eventType: 1, timestamp: -1 },
    { name: 'idx_events_user_type_time' }
  );
  console.log('✓ eventLogs: índice COMPUESTO (userId, eventType, timestamp)');

  // TTL - Expirar logs después de 1 año
  await db.collection('eventLogs').createIndex(
    { timestamp: 1 },
    { name: 'idx_events_ttl', expireAfterSeconds: 31536000 }
  );
  console.log('✓ eventLogs: índice TTL (1 año)');

  console.log('\n¡Todos los índices creados exitosamente!');
  console.log('\nResumen de tipos de índices:');
  console.log('  - Simple: email, isActive, price, rating, timestamp, orderNumber');
  console.log('  - Compuesto: rating+active, restaurant+cat, user+date, etc.');
  console.log('  - Multikey: categories, dietaryPrefs, allergens, tags');
  console.log('  - Geoespacial: address.location (2dsphere)');
  console.log('  - Texto: restaurants text, menuItems text, reviews text');
  console.log('  - TTL: eventLogs timestamp');

  await closeDB();
}

createIndexes().catch(console.error);
