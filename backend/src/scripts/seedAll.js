require('dotenv').config();
const { connectDB, getDB, closeDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

// ===================== FUNCIONES AUXILIARES =====================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// ===================== DATOS DE EJEMPLO =====================

const RESTAURANTS = [
  {
    name: 'La Cocina de Doña María',
    description: 'Comida guatemalteca tradicional con los mejores sabores caseros. Especialidad en pepián y jocón.',
    address: { street: 'Calle Real 15', city: 'Antigua Guatemala', country: 'Guatemala', location: { type: 'Point', coordinates: [-90.7344, 14.5586] } },
    phone: '+502 7832-1234', email: 'contacto@donamaria.gt',
    categories: ['guatemalteca', 'tradicional', 'comida casera'],
    schedule: [
      { day: 'Lunes', open: '07:00', close: '21:00', isOpen: true },
      { day: 'Martes', open: '07:00', close: '21:00', isOpen: true },
      { day: 'Miércoles', open: '07:00', close: '21:00', isOpen: true },
      { day: 'Jueves', open: '07:00', close: '21:00', isOpen: true },
      { day: 'Viernes', open: '07:00', close: '22:00', isOpen: true },
      { day: 'Sábado', open: '08:00', close: '22:00', isOpen: true },
      { day: 'Domingo', open: '08:00', close: '15:00', isOpen: true }
    ]
  },
  {
    name: 'Sushi Zone GT',
    description: 'El mejor sushi de la ciudad con ingredientes frescos importados. Rolls especiales y ramen artesanal.',
    address: { street: 'Zona 10, 5ta Avenida 12-45', city: 'Guatemala City', country: 'Guatemala', location: { type: 'Point', coordinates: [-90.5280, 14.5943] } },
    phone: '+502 2331-5678', email: 'reservas@sushizone.gt',
    categories: ['japonesa', 'sushi', 'ramen', 'asiática'],
    schedule: [
      { day: 'Lunes', open: '11:00', close: '22:00', isOpen: true },
      { day: 'Martes', open: '11:00', close: '22:00', isOpen: true },
      { day: 'Miércoles', open: '11:00', close: '22:00', isOpen: true },
      { day: 'Jueves', open: '11:00', close: '22:00', isOpen: true },
      { day: 'Viernes', open: '11:00', close: '23:00', isOpen: true },
      { day: 'Sábado', open: '12:00', close: '23:00', isOpen: true },
      { day: 'Domingo', open: '12:00', close: '20:00', isOpen: false }
    ]
  },
  {
    name: 'Burger Republic',
    description: 'Hamburguesas gourmet con carne Angus 100%. Papas artesanales y malteadas premium.',
    address: { street: 'Blvd Los Próceres 18-30, Zona 10', city: 'Guatemala City', country: 'Guatemala', location: { type: 'Point', coordinates: [-90.5150, 14.5850] } },
    phone: '+502 2440-9012', email: 'info@burgerrepublic.gt',
    categories: ['hamburguesas', 'americana', 'gourmet', 'fast food'],
    schedule: [
      { day: 'Lunes', open: '10:00', close: '22:00', isOpen: true },
      { day: 'Martes', open: '10:00', close: '22:00', isOpen: true },
      { day: 'Miércoles', open: '10:00', close: '22:00', isOpen: true },
      { day: 'Jueves', open: '10:00', close: '22:00', isOpen: true },
      { day: 'Viernes', open: '10:00', close: '23:00', isOpen: true },
      { day: 'Sábado', open: '10:00', close: '23:00', isOpen: true },
      { day: 'Domingo', open: '11:00', close: '21:00', isOpen: true }
    ]
  },
  {
    name: 'Tacos El Paisa',
    description: 'Auténticos tacos mexicanos al pastor, de carnitas y suadero. Salsas hechas en casa.',
    address: { street: '6ta Calle 3-25, Zona 1', city: 'Guatemala City', country: 'Guatemala', location: { type: 'Point', coordinates: [-90.5133, 14.6407] } },
    phone: '+502 2232-3456', email: 'tacos@elpaisa.gt',
    categories: ['mexicana', 'tacos', 'street food'],
    schedule: [
      { day: 'Lunes', open: '09:00', close: '23:00', isOpen: true },
      { day: 'Martes', open: '09:00', close: '23:00', isOpen: true },
      { day: 'Miércoles', open: '09:00', close: '23:00', isOpen: true },
      { day: 'Jueves', open: '09:00', close: '23:00', isOpen: true },
      { day: 'Viernes', open: '09:00', close: '01:00', isOpen: true },
      { day: 'Sábado', open: '10:00', close: '01:00', isOpen: true },
      { day: 'Domingo', open: '10:00', close: '20:00', isOpen: true }
    ]
  },
  {
    name: 'Café Barista GT',
    description: 'Café de especialidad guatemalteco de origen único. Repostería artesanal y brunch los fines de semana.',
    address: { street: '4ta Avenida Sur 1, Zona 4', city: 'Guatemala City', country: 'Guatemala', location: { type: 'Point', coordinates: [-90.5230, 14.6100] } },
    phone: '+502 2335-7890', email: 'hola@baristagt.com',
    categories: ['café', 'repostería', 'brunch', 'postres'],
    schedule: [
      { day: 'Lunes', open: '06:30', close: '20:00', isOpen: true },
      { day: 'Martes', open: '06:30', close: '20:00', isOpen: true },
      { day: 'Miércoles', open: '06:30', close: '20:00', isOpen: true },
      { day: 'Jueves', open: '06:30', close: '20:00', isOpen: true },
      { day: 'Viernes', open: '06:30', close: '21:00', isOpen: true },
      { day: 'Sábado', open: '07:00', close: '21:00', isOpen: true },
      { day: 'Domingo', open: '07:00', close: '18:00', isOpen: true }
    ]
  }
];

const USERS = [
  { name: 'Carlos Mendoza', email: 'carlos@email.com', password: 'carlos123', phone: '+502 5555-0001', dietaryPrefs: ['sin gluten'], addresses: [{ label: 'Casa', street: 'Zona 10, Calle 5', city: 'Guatemala City', location: { type: 'Point', coordinates: [-90.525, 14.595] }, isDefault: true }] },
  { name: 'María López', email: 'maria@email.com', password: 'maria123', phone: '+502 5555-0002', dietaryPrefs: ['vegetariana', 'sin lactosa'], addresses: [{ label: 'Casa', street: 'Calle del Arco', city: 'Antigua Guatemala', location: { type: 'Point', coordinates: [-90.734, 14.558] }, isDefault: true }] },
  { name: 'José Ramírez', email: 'jose@email.com', password: 'jose123', phone: '+502 5555-0003', dietaryPrefs: [], addresses: [{ label: 'Oficina', street: 'Zona 14, Torre 2', city: 'Guatemala City', location: { type: 'Point', coordinates: [-90.520, 14.580] }, isDefault: true }] },
  { name: 'Ana García', email: 'ana@email.com', password: 'ana123', phone: '+502 5555-0004', dietaryPrefs: ['vegana'], addresses: [{ label: 'Casa', street: 'Zona 15, Vista Hermosa', city: 'Guatemala City', location: { type: 'Point', coordinates: [-90.510, 14.575] }, isDefault: true }] },
  { name: 'Luis Torres', email: 'luis@email.com', password: 'luis123', phone: '+502 5555-0005', dietaryPrefs: ['sin mariscos'], addresses: [{ label: 'Casa', street: 'Calzada Roosevelt', city: 'Mixco', location: { type: 'Point', coordinates: [-90.560, 14.630] }, isDefault: true }] },
  { name: 'Sofia Chen', email: 'sofia@email.com', password: 'sofia123', phone: '+502 5555-0006', dietaryPrefs: [], addresses: [{ label: 'Universidad', street: '18 Avenida 11-95, Zona 15', city: 'Guatemala City', location: { type: 'Point', coordinates: [-90.497, 14.570] }, isDefault: true }] },
  { name: 'Diego Herrera', email: 'diego@email.com', password: 'diego123', phone: '+502 5555-0007', dietaryPrefs: ['keto'], addresses: [{ label: 'Casa', street: 'Zona 7, Colonia Landívar', city: 'Guatemala City', location: { type: 'Point', coordinates: [-90.545, 14.635] }, isDefault: true }] },
  { name: 'Valentina Morales', email: 'valentina@email.com', password: 'valentina123', phone: '+502 5555-0008', dietaryPrefs: ['sin gluten', 'sin lactosa'], addresses: [{ label: 'Casa', street: '5ta Calle Oriente', city: 'Antigua Guatemala', location: { type: 'Point', coordinates: [-90.731, 14.559] }, isDefault: true }] }
];

// Menú items por restaurante (se asignan con índice)
const MENU_ITEMS_BY_RESTAURANT = [
  // Restaurant 0 - Doña María (guatemalteca)
  [
    { name: 'Pepián de Pollo', description: 'Recado tradicional con pollo criollo, arroz y tortillas', category: 'platos fuertes', price: 65, allergens: ['ajonjolí'], tags: ['popular', 'tradicional'], preparationTime: 30 },
    { name: 'Jocón', description: 'Pollo en salsa verde de miltomate y cilantro', category: 'platos fuertes', price: 60, allergens: [], tags: ['tradicional'], preparationTime: 25 },
    { name: 'Hilachas', description: 'Carne deshebrada en recado de tomate', category: 'platos fuertes', price: 55, allergens: [], tags: ['tradicional'], preparationTime: 25 },
    { name: 'Tamales Colorados', description: 'Tamales de masa de maíz con recado rojo, pollo y aceitunas', category: 'entradas', price: 25, allergens: ['gluten'], tags: ['favorito'], preparationTime: 10 },
    { name: 'Plátanos en Mole', description: 'Plátanos fritos bañados en mole guatemalteco', category: 'postres', price: 30, allergens: ['ajonjolí', 'chocolate'], tags: ['dulce'], preparationTime: 15 },
    { name: 'Agua de Horchata', description: 'Bebida tradicional de arroz con canela', category: 'bebidas', price: 15, allergens: [], tags: ['refrescante'], preparationTime: 5 },
  ],
  // Restaurant 1 - Sushi Zone
  [
    { name: 'Roll Dragón', description: 'Camarón tempura, aguacate, queso crema, anguila', category: 'rolls especiales', price: 95, allergens: ['mariscos', 'gluten', 'lactosa'], tags: ['premium', 'popular'], preparationTime: 20 },
    { name: 'Sashimi Mixto', description: 'Selección de 15 piezas de sashimi premium', category: 'sashimi', price: 120, allergens: ['mariscos'], tags: ['premium'], preparationTime: 15 },
    { name: 'Ramen de Cerdo', description: 'Caldo tonkotsu, chashu, huevo marinado, nori', category: 'ramen', price: 75, allergens: ['gluten', 'huevo', 'soya'], tags: ['caliente', 'popular'], preparationTime: 20 },
    { name: 'Gyoza (6 pzas)', description: 'Dumplings de cerdo y vegetales a la plancha', category: 'entradas', price: 45, allergens: ['gluten', 'soya'], tags: ['entrada'], preparationTime: 12 },
    { name: 'Edamame', description: 'Vainas de soya al vapor con sal de mar', category: 'entradas', price: 30, allergens: ['soya'], tags: ['vegano'], preparationTime: 8 },
    { name: 'Mochi de Matcha', description: 'Helado de matcha envuelto en masa de arroz', category: 'postres', price: 35, allergens: ['lactosa'], tags: ['dulce'], preparationTime: 5 },
  ],
  // Restaurant 2 - Burger Republic
  [
    { name: 'Classic Smash Burger', description: 'Doble carne Angus, cheddar, pickles, salsa especial', category: 'hamburguesas', price: 72, allergens: ['gluten', 'lactosa'], tags: ['popular', 'clásica'], preparationTime: 15 },
    { name: 'BBQ Bacon Burger', description: 'Carne Angus, bacon ahumado, cheddar, aros de cebolla, BBQ', category: 'hamburguesas', price: 85, allergens: ['gluten', 'lactosa'], tags: ['premium'], preparationTime: 18 },
    { name: 'Mushroom Swiss Burger', description: 'Carne Angus, champiñones salteados, queso suizo', category: 'hamburguesas', price: 78, allergens: ['gluten', 'lactosa'], tags: ['gourmet'], preparationTime: 18 },
    { name: 'Loaded Fries', description: 'Papas fritas con cheddar, bacon, jalapeños y ranch', category: 'acompañamientos', price: 45, allergens: ['gluten', 'lactosa'], tags: ['compartir'], preparationTime: 12 },
    { name: 'Onion Rings', description: 'Aros de cebolla empanizados con dip de chipotle', category: 'acompañamientos', price: 35, allergens: ['gluten'], tags: ['acompañamiento'], preparationTime: 10 },
    { name: 'Malteada de Oreo', description: 'Malteada premium con helado de vainilla y Oreo', category: 'bebidas', price: 40, allergens: ['lactosa', 'gluten'], tags: ['dulce', 'popular'], preparationTime: 8 },
  ],
  // Restaurant 3 - Tacos El Paisa
  [
    { name: 'Tacos al Pastor (3)', description: 'Carne de cerdo marinada con piña, cebolla y cilantro', category: 'tacos', price: 35, allergens: [], tags: ['popular', 'clásico'], preparationTime: 10 },
    { name: 'Tacos de Carnitas (3)', description: 'Cerdo confitado deshebrado con salsa verde', category: 'tacos', price: 35, allergens: [], tags: ['tradicional'], preparationTime: 10 },
    { name: 'Quesadilla de Chicharrón', description: 'Tortilla de harina con chicharrón prensado y queso Oaxaca', category: 'quesadillas', price: 40, allergens: ['gluten', 'lactosa'], tags: ['favorito'], preparationTime: 12 },
    { name: 'Elote Loco', description: 'Elote con mayonesa, chile, limón y queso', category: 'antojitos', price: 20, allergens: ['lactosa'], tags: ['street food'], preparationTime: 8 },
    { name: 'Horchata Mexicana', description: 'Agua fresca de arroz con canela y vainilla', category: 'bebidas', price: 18, allergens: [], tags: ['refrescante'], preparationTime: 5 },
    { name: 'Churros con Cajeta (4)', description: 'Churros recién hechos con dip de cajeta', category: 'postres', price: 28, allergens: ['gluten', 'lactosa'], tags: ['dulce'], preparationTime: 10 },
  ],
  // Restaurant 4 - Café Barista GT
  [
    { name: 'Espresso Doble', description: 'Shot doble de café de Huehuetenango', category: 'café', price: 22, allergens: [], tags: ['fuerte', 'popular'], preparationTime: 3 },
    { name: 'Cappuccino', description: 'Espresso con leche espumada y arte latte', category: 'café', price: 28, allergens: ['lactosa'], tags: ['clásico'], preparationTime: 5 },
    { name: 'Cold Brew', description: 'Café de extracción fría 16 horas, origen Cobán', category: 'café', price: 32, allergens: [], tags: ['refrescante'], preparationTime: 3 },
    { name: 'Croissant de Almendra', description: 'Croissant de mantequilla relleno de crema de almendra', category: 'repostería', price: 35, allergens: ['gluten', 'lactosa', 'frutos secos'], tags: ['premium'], preparationTime: 5 },
    { name: 'Avocado Toast', description: 'Pan artesanal con aguacate, huevo pochado y semillas', category: 'brunch', price: 55, allergens: ['gluten', 'huevo'], tags: ['brunch', 'popular'], preparationTime: 12 },
    { name: 'Cheesecake de Maracuyá', description: 'Cheesecake horneado con coulis de maracuyá', category: 'postres', price: 42, allergens: ['gluten', 'lactosa', 'huevo'], tags: ['dulce', 'premium'], preparationTime: 5 },
  ]
];

const REVIEW_COMMENTS = [
  { title: 'Excelente experiencia', comment: 'La comida estuvo increíble, el servicio fue muy bueno y el ambiente agradable.' },
  { title: 'Muy bueno', comment: 'Me gustó mucho, los sabores son auténticos. Definitivamente regresaré.' },
  { title: 'Buena relación calidad-precio', comment: 'Los precios son justos para la calidad que ofrecen. Recomendado.' },
  { title: 'Regular', comment: 'La comida estuvo bien pero el servicio fue un poco lento. Puede mejorar.' },
  { title: 'Increíble sabor', comment: 'Los platillos tienen un sabor único que no encuentras en otro lugar.' },
  { title: 'Recomendado al 100%', comment: 'Fui con mi familia y todos quedamos encantados. Volveremos pronto.' },
  { title: 'No cumplió expectativas', comment: 'Esperaba más por el precio. La porción fue pequeña.' },
  { title: 'Delicioso', comment: 'Todo estuvo perfecto, desde la entrada hasta el postre.' },
];

const EVENT_TYPES = ['view_menu', 'create_order', 'post_review', 'search_restaurant', 'view_order', 'cancel_order', 'update_profile'];

async function seed() {
  await connectDB();
  const db = getDB();

  console.log('Iniciando seed de datos...\n');

  // Limpiar colecciones
  console.log('Limpiando colecciones existentes...');
  await Promise.all([
    db.collection('restaurants').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('menuItems').deleteMany({}),
    db.collection('orders').deleteMany({}),
    db.collection('reviews').deleteMany({}),
    db.collection('eventLogs').deleteMany({})
  ]);

  // 1. Insertar restaurantes
  const restaurantDocs = RESTAURANTS.map(r => ({
    ...r,
    rating: { average: 0, count: 0 },
    imageFileId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  const restaurantResult = await db.collection('restaurants').insertMany(restaurantDocs);
  const restaurantIds = Object.values(restaurantResult.insertedIds);
  console.log(`✓ ${restaurantIds.length} restaurantes creados`);

  // 2. Insertar usuarios
  const userDocs = USERS.map(u => ({
    name: u.name,
    email: u.email,
    password: hashPassword(u.password),
    phone: u.phone,
    dietaryPrefs: u.dietaryPrefs,
    addresses: u.addresses,
    totalOrders: 0,
    totalSpent: 0,
    createdAt: new Date()
  }));
  const userResult = await db.collection('users').insertMany(userDocs);
  const userIds = Object.values(userResult.insertedIds);
  console.log(`✓ ${userIds.length} usuarios creados`);

  // 3. Insertar menú items
  let allMenuItems = [];
  for (let i = 0; i < MENU_ITEMS_BY_RESTAURANT.length; i++) {
    const items = MENU_ITEMS_BY_RESTAURANT[i].map(item => ({
      ...item,
      restaurantId: restaurantIds[i],
      currency: 'GTQ',
      imageFileId: null,
      isAvailable: true,
      soldCount: 0,
      rating: { average: 0, count: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    allMenuItems.push(...items);
  }
  const menuResult = await db.collection('menuItems').insertMany(allMenuItems);
  const menuItemIds = Object.values(menuResult.insertedIds);
  console.log(`✓ ${menuItemIds.length} artículos del menú creados`);

  // 4. Crear órdenes de ejemplo
  const statuses = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];
  const orders = [];

  for (let i = 0; i < 30; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const restIdx = Math.floor(Math.random() * restaurantIds.length);
    const restaurantId = restaurantIds[restIdx];

    // Items de ese restaurante
    const restMenuItems = allMenuItems.filter(m => m.restaurantId.toString() === restaurantId.toString());
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedItems = [];
    for (let j = 0; j < numItems; j++) {
      const item = restMenuItems[Math.floor(Math.random() * restMenuItems.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      selectedItems.push({
        menuItemId: item._id || new ObjectId(),
        name: item.name,
        price: item.price,
        quantity: qty,
        subtotal: item.price * qty,
        notes: ''
      });
    }

    const subtotal = selectedItems.reduce((s, item) => s + item.subtotal, 0);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

    orders.push({
      orderNumber: `ORD-${Date.now()}-${i}`,
      userId,
      restaurantId,
      items: selectedItems,
      status,
      statusHistory: [
        { status: 'pendiente', timestamp: createdAt, note: 'Orden creada' },
        ...(status !== 'pendiente' ? [{ status, timestamp: new Date(createdAt.getTime() + 600000), note: `Cambio a ${status}` }] : [])
      ],
      deliveryAddress: {
        street: 'Dirección de entrega',
        city: 'Guatemala City',
        location: { type: 'Point', coordinates: [-90.52 + Math.random() * 0.05, 14.58 + Math.random() * 0.05] }
      },
      pricing: {
        subtotal,
        deliveryFee: 15,
        tax: Math.round(subtotal * 0.12 * 100) / 100,
        total: Math.round((subtotal + 15 + subtotal * 0.12) * 100) / 100
      },
      paymentMethod: ['efectivo', 'tarjeta', 'transferencia'][Math.floor(Math.random() * 3)],
      notes: '',
      createdAt,
      updatedAt: new Date()
    });
  }

  await db.collection('orders').insertMany(orders);
  console.log(`✓ ${orders.length} órdenes creadas`);

  // 5. Crear reseñas
  const reviews = [];
  for (let i = 0; i < 25; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const restaurantId = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    const rc = REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)];
    const rating = Math.floor(Math.random() * 3) + 3; // 3-5

    reviews.push({
      userId,
      targetType: 'restaurant',
      targetId: restaurantId,
      rating,
      title: rc.title,
      comment: rc.comment,
      tags: ['comida', 'servicio', 'ambiente', 'precio'].slice(0, Math.floor(Math.random() * 3) + 1),
      helpful: [],
      response: i % 3 === 0 ? { text: '¡Gracias por su visita! Esperamos verle pronto.', respondedAt: new Date() } : null,
      isVerified: Math.random() > 0.3,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000))
    });
  }

  await db.collection('reviews').insertMany(reviews);
  console.log(`✓ ${reviews.length} reseñas creadas`);

  // Actualizar ratings de restaurantes
  for (const restId of restaurantIds) {
    const stats = await db.collection('reviews').aggregate([
      { $match: { targetType: 'restaurant', targetId: restId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]).toArray();

    if (stats.length > 0) {
      await db.collection('restaurants').updateOne(
        { _id: restId },
        { $set: { 'rating.average': Math.round(stats[0].avg * 10) / 10, 'rating.count': stats[0].count } }
      );
    }
  }
  console.log('✓ Ratings de restaurantes actualizados');

  // 6. Crear 50,000 event logs
  console.log('\nCreando 50,000 event logs (esto puede tomar unos segundos)...');
  const BATCH_SIZE = 5000;
  let totalInserted = 0;

  for (let batch = 0; batch < 10; batch++) {
    const events = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      events.push({
        eventType,
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        restaurantId: restaurantIds[Math.floor(Math.random() * restaurantIds.length)],
        payload: {
          action: eventType,
          details: `Evento ${eventType} generado automáticamente`,
          value: Math.floor(Math.random() * 1000)
        },
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)),
        sessionId: `session-${batch}-${i}`
      });
    }
    await db.collection('eventLogs').insertMany(events);
    totalInserted += BATCH_SIZE;
    console.log(`  → ${totalInserted}/50,000 eventos insertados...`);
  }

  console.log(`✓ ${totalInserted} event logs creados`);

  // Resumen
  console.log('\n========================================');
  console.log('SEED COMPLETADO');
  console.log('========================================');
  console.log(`Restaurantes: ${restaurantIds.length}`);
  console.log(`Usuarios: ${userIds.length}`);
  console.log(`Artículos del menú: ${menuItemIds.length}`);
  console.log(`Órdenes: ${orders.length}`);
  console.log(`Reseñas: ${reviews.length}`);
  console.log(`Event Logs: ${totalInserted}`);
  console.log('========================================\n');

  await closeDB();
}

seed().catch(console.error);
