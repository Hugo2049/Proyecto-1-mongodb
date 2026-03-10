require('dotenv').config();
const { connectDB, getDB, closeDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randBetween(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(randBetween(min, max)); }
function randDate(daysBack) { return new Date(Date.now() - Math.floor(Math.random() * daysBack * 86400000)); }

// ======================== GUATEMALA REAL COORDINATES ========================
const GT_LOCATIONS = [
  { city: 'Guatemala City', zones: [
    { name: 'Zona 1',  lng: -90.5133, lat: 14.6407 },
    { name: 'Zona 4',  lng: -90.5230, lat: 14.6100 },
    { name: 'Zona 9',  lng: -90.5180, lat: 14.6000 },
    { name: 'Zona 10', lng: -90.5280, lat: 14.5943 },
    { name: 'Zona 11', lng: -90.5450, lat: 14.6200 },
    { name: 'Zona 13', lng: -90.5300, lat: 14.5800 },
    { name: 'Zona 14', lng: -90.5200, lat: 14.5800 },
    { name: 'Zona 15', lng: -90.5100, lat: 14.5750 },
    { name: 'Zona 16', lng: -90.4800, lat: 14.5900 },
    { name: 'Zona 7',  lng: -90.5450, lat: 14.6350 },
  ]},
  { city: 'Antigua Guatemala', zones: [
    { name: 'Centro',       lng: -90.7344, lat: 14.5586 },
    { name: 'San Cristóbal', lng: -90.7200, lat: 14.5500 },
    { name: 'Santa Ana',    lng: -90.7400, lat: 14.5650 },
  ]},
  { city: 'Quetzaltenango', zones: [
    { name: 'Centro',    lng: -91.5180, lat: 14.8340 },
    { name: 'Zona 3',    lng: -91.5250, lat: 14.8400 },
  ]},
  { city: 'Mixco', zones: [
    { name: 'San Cristóbal', lng: -90.5700, lat: 14.6300 },
    { name: 'Lo de Coy',    lng: -90.5800, lat: 14.6350 },
  ]},
  { city: 'Villa Nueva', zones: [
    { name: 'Centro',      lng: -90.5850, lat: 14.5300 },
    { name: 'San Miguel',  lng: -90.5750, lat: 14.5250 },
  ]},
  { city: 'Escuintla', zones: [
    { name: 'Centro', lng: -90.7850, lat: 14.2980 },
  ]},
  { city: 'Cobán', zones: [
    { name: 'Centro', lng: -90.3707, lat: 15.4720 },
  ]},
  { city: 'Huehuetenango', zones: [
    { name: 'Centro', lng: -91.4710, lat: 15.3190 },
  ]},
];

function randLocation() {
  const loc = rand(GT_LOCATIONS);
  const zone = rand(loc.zones);
  const jitter = 0.005;
  return {
    city: loc.city,
    zone: zone.name,
    lng: zone.lng + randBetween(-jitter, jitter),
    lat: zone.lat + randBetween(-jitter, jitter)
  };
}

// ======================== DATA TEMPLATES ========================
const FIRST_NAMES = ['Carlos','María','José','Ana','Luis','Sofia','Diego','Valentina','Pedro','Isabella','Miguel','Camila','Fernando','Lucía','Ricardo','Gabriela','Andrés','Daniela','Roberto','Paula','Eduardo','Mariana','Alejandro','Laura','Santiago','Elena','David','Natalia','Óscar','Fernanda','Javier','Claudia','Manuel','Andrea','Juan','Carmen','Francisco','Rosa','Antonio','Patricia','Sergio','Verónica','Alberto','Mónica','Daniel','Karla','Pablo','Silvia','Héctor','Lorena','Mario','Leticia','Emilio','Adriana','César','Susana','Raúl','Alicia','Marco','Beatriz','Hugo','Gloria','Julio','Teresa','Gustavo','Cristina','Arturo','Martha','Enrique','Rocío','Rafael','Viviana','Guillermo','Irma','Ángel','Ingrid','Felipe','Wendy','Víctor','Jessica','Iván','Diana','Tomás','Fabiola','Rodrigo','Sandra','Ernesto','Karina','Gerardo','Estela','Armando','Aracely','Salvador','Miriam','Alfredo','Norma','Ismael','Yolanda','Álvaro','Paola'];
const LAST_NAMES = ['López','García','Hernández','Martínez','Pérez','González','Rodríguez','Sánchez','Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Morales','Reyes','Cruz','Ortiz','Gutiérrez','Chávez','Ramos','Vargas','Castillo','Jiménez','Moreno','Romero','Herrera','Medina','Aguilar','Vásquez','Mendoza','Campos','Rojas','Sandoval','Guerrero','Estrada','Ávila','Santos','Figueroa','Cortez'];
const STREETS = ['Calle Real','Avenida Reforma','Boulevard Los Próceres','Calzada Roosevelt','Avenida Las Américas','6ta Avenida','7ma Calle','Diagonal 6','Avenida Simeón Cañas','Calle Martí','Boulevard Vista Hermosa','Avenida Petapa','Calzada San Juan','Boulevard El Naranjo','Avenida Hincapié'];
const DIETARY = ['vegetariana','vegana','sin gluten','sin lactosa','keto','sin mariscos','halal','sin frutos secos','baja en sodio','paleo'];

const RESTAURANT_TYPES = [
  { cats: ['guatemalteca','tradicional','comida casera'], prefix: ['La Cocina de','Comedor','Sabores de','El Rincón'] },
  { cats: ['mexicana','tacos','burritos'], prefix: ['Tacos','Taquería','El Azteca','La Hacienda'] },
  { cats: ['italiana','pizza','pasta'], prefix: ['Trattoria','Pizzería','La Dolce Vita','Il Forno'] },
  { cats: ['japonesa','sushi','ramen'], prefix: ['Sushi','Ramen','Sakura','Tokyo'] },
  { cats: ['hamburguesas','americana','gourmet'], prefix: ['Burger','The Grill','American','BBQ'] },
  { cats: ['café','repostería','brunch'], prefix: ['Café','Coffee','Brew','Bean'] },
  { cats: ['china','asiática','wok'], prefix: ['Dragon','Wok','Golden','Jade'] },
  { cats: ['peruana','ceviche','sudamericana'], prefix: ['Ceviche','Lima','Machu','Inca'] },
  { cats: ['mediterránea','ensaladas','saludable'], prefix: ['Green','Fresh','Olivo','Vita'] },
  { cats: ['mariscos','pescados','costera'], prefix: ['Puerto','Mariscos','El Pescador','La Barca'] },
];
const SUFFIXES = ['GT','Express','House','Plus','Premium','Central','Gourmet','Kitchen','Lab','Garden','Club','Republic','Station','Zone','Spot'];

const MENU_CATEGORIES = {
  guatemalteca: [
    { name: 'Pepián de Pollo', cat: 'platos fuertes', price: [55,75], allergens: ['ajonjolí'], time: 30 },
    { name: 'Jocón', cat: 'platos fuertes', price: [50,70], allergens: [], time: 25 },
    { name: 'Hilachas', cat: 'platos fuertes', price: [48,65], allergens: [], time: 25 },
    { name: 'Kak\'ik', cat: 'platos fuertes', price: [60,80], allergens: [], time: 35 },
    { name: 'Tamales Colorados', cat: 'entradas', price: [20,30], allergens: ['gluten'], time: 10 },
    { name: 'Chuchitos', cat: 'entradas', price: [15,25], allergens: [], time: 8 },
    { name: 'Plátanos en Mole', cat: 'postres', price: [25,35], allergens: ['ajonjolí','chocolate'], time: 15 },
    { name: 'Rellenitos de Plátano', cat: 'postres', price: [20,30], allergens: ['frijol'], time: 12 },
    { name: 'Horchata', cat: 'bebidas', price: [12,18], allergens: [], time: 5 },
    { name: 'Fresco de Rosa de Jamaica', cat: 'bebidas', price: [10,15], allergens: [], time: 5 },
  ],
  mexicana: [
    { name: 'Tacos al Pastor', cat: 'tacos', price: [30,45], allergens: [], time: 10 },
    { name: 'Tacos de Carnitas', cat: 'tacos', price: [30,45], allergens: [], time: 10 },
    { name: 'Burrito Supreme', cat: 'burritos', price: [50,70], allergens: ['gluten','lactosa'], time: 15 },
    { name: 'Quesadilla de Chicharrón', cat: 'quesadillas', price: [35,50], allergens: ['gluten','lactosa'], time: 12 },
    { name: 'Elote Loco', cat: 'antojitos', price: [18,25], allergens: ['lactosa'], time: 8 },
    { name: 'Guacamole con Totopos', cat: 'entradas', price: [35,50], allergens: [], time: 8 },
    { name: 'Churros con Cajeta', cat: 'postres', price: [25,35], allergens: ['gluten','lactosa'], time: 10 },
    { name: 'Horchata Mexicana', cat: 'bebidas', price: [15,22], allergens: [], time: 5 },
  ],
  italiana: [
    { name: 'Pizza Margherita', cat: 'pizzas', price: [65,90], allergens: ['gluten','lactosa'], time: 18 },
    { name: 'Pizza Pepperoni', cat: 'pizzas', price: [70,95], allergens: ['gluten','lactosa'], time: 18 },
    { name: 'Spaghetti Carbonara', cat: 'pastas', price: [55,75], allergens: ['gluten','lactosa','huevo'], time: 15 },
    { name: 'Fettuccine Alfredo', cat: 'pastas', price: [55,75], allergens: ['gluten','lactosa'], time: 15 },
    { name: 'Lasaña Boloñesa', cat: 'pastas', price: [65,85], allergens: ['gluten','lactosa'], time: 20 },
    { name: 'Bruschetta', cat: 'entradas', price: [30,45], allergens: ['gluten'], time: 8 },
    { name: 'Tiramisú', cat: 'postres', price: [40,55], allergens: ['gluten','lactosa','huevo','café'], time: 5 },
    { name: 'Limonada Italiana', cat: 'bebidas', price: [18,28], allergens: [], time: 5 },
  ],
  japonesa: [
    { name: 'Roll Dragón', cat: 'rolls', price: [80,110], allergens: ['mariscos','gluten','lactosa'], time: 20 },
    { name: 'Roll California', cat: 'rolls', price: [55,75], allergens: ['mariscos'], time: 15 },
    { name: 'Sashimi Mixto', cat: 'sashimi', price: [100,140], allergens: ['mariscos'], time: 15 },
    { name: 'Ramen Tonkotsu', cat: 'ramen', price: [65,85], allergens: ['gluten','soya'], time: 20 },
    { name: 'Gyoza', cat: 'entradas', price: [35,50], allergens: ['gluten','soya'], time: 12 },
    { name: 'Edamame', cat: 'entradas', price: [25,35], allergens: ['soya'], time: 5 },
    { name: 'Mochi', cat: 'postres', price: [30,45], allergens: ['lactosa'], time: 5 },
    { name: 'Té Verde', cat: 'bebidas', price: [15,22], allergens: [], time: 3 },
  ],
  hamburguesas: [
    { name: 'Classic Smash Burger', cat: 'hamburguesas', price: [60,85], allergens: ['gluten','lactosa'], time: 15 },
    { name: 'BBQ Bacon Burger', cat: 'hamburguesas', price: [70,95], allergens: ['gluten','lactosa'], time: 18 },
    { name: 'Mushroom Swiss', cat: 'hamburguesas', price: [65,90], allergens: ['gluten','lactosa'], time: 18 },
    { name: 'Veggie Burger', cat: 'hamburguesas', price: [55,75], allergens: ['gluten'], time: 15 },
    { name: 'Loaded Fries', cat: 'acompañamientos', price: [35,50], allergens: ['lactosa'], time: 12 },
    { name: 'Onion Rings', cat: 'acompañamientos', price: [28,40], allergens: ['gluten'], time: 10 },
    { name: 'Malteada', cat: 'bebidas', price: [35,50], allergens: ['lactosa'], time: 8 },
  ],
  café: [
    { name: 'Espresso Doble', cat: 'café', price: [18,28], allergens: [], time: 3 },
    { name: 'Cappuccino', cat: 'café', price: [25,35], allergens: ['lactosa'], time: 5 },
    { name: 'Latte', cat: 'café', price: [28,38], allergens: ['lactosa'], time: 5 },
    { name: 'Cold Brew', cat: 'café', price: [28,38], allergens: [], time: 3 },
    { name: 'Croissant de Almendra', cat: 'repostería', price: [30,45], allergens: ['gluten','lactosa','frutos secos'], time: 5 },
    { name: 'Avocado Toast', cat: 'brunch', price: [45,65], allergens: ['gluten','huevo'], time: 12 },
    { name: 'Cheesecake', cat: 'postres', price: [35,50], allergens: ['gluten','lactosa'], time: 5 },
    { name: 'Smoothie de Frutas', cat: 'bebidas', price: [30,42], allergens: ['lactosa'], time: 5 },
  ],
  china: [
    { name: 'Arroz Frito Especial', cat: 'arroces', price: [45,65], allergens: ['soya','huevo'], time: 15 },
    { name: 'Chow Mein', cat: 'fideos', price: [45,65], allergens: ['gluten','soya'], time: 15 },
    { name: 'Pollo Agridulce', cat: 'platos fuertes', price: [55,75], allergens: ['gluten','soya'], time: 18 },
    { name: 'Wonton Soup', cat: 'sopas', price: [30,45], allergens: ['gluten','mariscos'], time: 10 },
    { name: 'Spring Rolls', cat: 'entradas', price: [28,40], allergens: ['gluten'], time: 10 },
    { name: 'Té de Jazmín', cat: 'bebidas', price: [12,18], allergens: [], time: 3 },
  ],
  peruana: [
    { name: 'Ceviche Clásico', cat: 'ceviches', price: [65,90], allergens: ['mariscos'], time: 15 },
    { name: 'Lomo Saltado', cat: 'platos fuertes', price: [70,95], allergens: ['soya'], time: 20 },
    { name: 'Ají de Gallina', cat: 'platos fuertes', price: [55,75], allergens: ['lactosa','frutos secos'], time: 20 },
    { name: 'Causa Limeña', cat: 'entradas', price: [40,55], allergens: ['mariscos'], time: 12 },
    { name: 'Pisco Sour', cat: 'bebidas', price: [45,65], allergens: ['huevo'], time: 5 },
    { name: 'Suspiro Limeño', cat: 'postres', price: [30,42], allergens: ['lactosa','huevo'], time: 5 },
  ],
  mediterránea: [
    { name: 'Bowl Mediterráneo', cat: 'bowls', price: [55,75], allergens: [], time: 12 },
    { name: 'Wrap de Falafel', cat: 'wraps', price: [45,60], allergens: ['gluten'], time: 10 },
    { name: 'Ensalada Griega', cat: 'ensaladas', price: [40,55], allergens: ['lactosa'], time: 8 },
    { name: 'Hummus con Pita', cat: 'entradas', price: [30,42], allergens: ['gluten','ajonjolí'], time: 8 },
    { name: 'Smoothie Verde', cat: 'bebidas', price: [32,45], allergens: [], time: 5 },
    { name: 'Baklava', cat: 'postres', price: [28,38], allergens: ['gluten','frutos secos'], time: 5 },
  ],
  mariscos: [
    { name: 'Cóctel de Camarón', cat: 'entradas', price: [55,80], allergens: ['mariscos'], time: 10 },
    { name: 'Filete de Róbalo', cat: 'platos fuertes', price: [85,120], allergens: ['mariscos'], time: 25 },
    { name: 'Camarones al Ajillo', cat: 'platos fuertes', price: [75,100], allergens: ['mariscos'], time: 18 },
    { name: 'Arroz con Mariscos', cat: 'platos fuertes', price: [70,95], allergens: ['mariscos'], time: 25 },
    { name: 'Sopa de Mariscos', cat: 'sopas', price: [50,70], allergens: ['mariscos'], time: 15 },
    { name: 'Limonada Natural', cat: 'bebidas', price: [12,18], allergens: [], time: 5 },
  ],
};

const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const REVIEW_TITLES = ['Excelente','Muy bueno','Buena relación calidad-precio','Regular','Increíble sabor','Recomendado 100%','No cumplió expectativas','Delicioso','Volvería sin duda','Bueno pero caro','Perfecto','Me encantó','Nada mal','Servicio excelente','Buen ambiente'];
const REVIEW_COMMENTS = [
  'La comida estuvo increíble, el servicio fue muy bueno y el ambiente agradable.',
  'Me gustó mucho, los sabores son auténticos. Definitivamente regresaré.',
  'Los precios son justos para la calidad que ofrecen. Recomendado.',
  'La comida estuvo bien pero el servicio fue un poco lento.',
  'Los platillos tienen un sabor único que no encuentras en otro lugar.',
  'Fui con mi familia y todos quedamos encantados. Volveremos pronto.',
  'Esperaba más por el precio. La porción fue pequeña.',
  'Todo estuvo perfecto, desde la entrada hasta el postre.',
  'El lugar es bonito y la comida no decepciona.',
  'La atención fue muy buena, nos hicieron sentir como en casa.',
  'Pedí por delivery y todo llegó caliente y bien empacado.',
  'Las porciones son generosas y la comida es deliciosa.',
  'Es un lugar ideal para ir con amigos o familia.',
  'La presentación de los platos es hermosa.',
  'Probé varios platillos y todos estaban buenos.',
];
const REVIEW_TAGS = ['comida','servicio','ambiente','precio','rapidez','limpieza','sabor','presentación','porciones','variedad'];
const STATUSES = ['pendiente','en_proceso','en_camino','entregado','cancelado'];
const PAYMENT_METHODS = ['efectivo','tarjeta','transferencia'];
const EVENT_TYPES = ['view_menu','create_order','post_review','search_restaurant','view_order','cancel_order','update_profile'];

async function seed() {
  await connectDB();
  const db = getDB();

  console.log('=== SEED MASIVO ===\n');
  console.log('Limpiando colecciones...');
  await Promise.all([
    db.collection('restaurants').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('menuItems').deleteMany({}),
    db.collection('orders').deleteMany({}),
    db.collection('reviews').deleteMany({}),
    db.collection('eventLogs').deleteMany({})
  ]);

  // ======== 1. RESTAURANTS (20) ========
  const usedRestNames = new Set();
  const restaurantDocs = [];
  for (let i = 0; i < 20; i++) {
    const type = RESTAURANT_TYPES[i % RESTAURANT_TYPES.length];
    let name;
    do {
      name = `${rand(type.prefix)} ${rand(SUFFIXES)}`;
    } while (usedRestNames.has(name));
    usedRestNames.add(name);

    const loc = randLocation();
    const accessCode = String(1000 + i);

    restaurantDocs.push({
      name,
      description: `Restaurante de ${type.cats[0]} en ${loc.city}. Los mejores sabores con ingredientes de primera calidad.`,
      address: { street: `${rand(STREETS)} ${randInt(1,99)}-${randInt(10,99)}, ${loc.zone}`, city: loc.city, country: 'Guatemala', location: { type: 'Point', coordinates: [loc.lng, loc.lat] } },
      phone: `+502 ${randInt(2000,9999)}-${randInt(1000,9999)}`,
      email: `contacto@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.gt`,
      categories: type.cats,
      schedule: DAYS.map((day, di) => ({ day, open: di >= 5 ? '09:00' : '07:00', close: di >= 4 ? '23:00' : '21:00', isOpen: !(di === 6 && i % 3 === 0) })),
      accessCode,
      rating: { average: 0, count: 0 },
      imageFileId: null,
      isActive: true,
      createdAt: randDate(180),
      updatedAt: new Date()
    });
  }
  const restResult = await db.collection('restaurants').insertMany(restaurantDocs);
  const restIds = Object.values(restResult.insertedIds);
  console.log(`✓ ${restIds.length} restaurantes`);

  // ======== 2. USERS (120 unique emails) ========
  const usedEmails = new Set();
  const userDocs = [];
  for (let i = 0; i < 120; i++) {
    const fn = rand(FIRST_NAMES);
    const ln = rand(LAST_NAMES);
    let email;
    do {
      email = `${fn.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${ln.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${randInt(1,999)}@email.com`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    const loc = randLocation();
    const numAddrs = randInt(1, 3);
    const addresses = [];
    const labels = ['Casa','Oficina','Universidad'];
    for (let a = 0; a < numAddrs; a++) {
      const al = a === 0 ? randLocation() : randLocation();
      addresses.push({
        label: labels[a] || `Dirección ${a+1}`,
        street: `${rand(STREETS)} ${randInt(1,50)}-${randInt(10,99)}, ${al.zone}`,
        city: al.city,
        location: { type: 'Point', coordinates: [al.lng, al.lat] },
        isDefault: a === 0
      });
    }

    const numPrefs = randInt(0, 3);
    const prefs = [];
    const dietCopy = [...DIETARY];
    for (let p = 0; p < numPrefs; p++) {
      const idx = randInt(0, dietCopy.length);
      prefs.push(dietCopy.splice(idx, 1)[0]);
    }

    userDocs.push({
      name: `${fn} ${ln}`,
      email,
      password: hashPassword('1234'),
      phone: `+502 ${randInt(3000,5999)}-${randInt(1000,9999)}`,
      dietaryPrefs: prefs.filter(Boolean),
      addresses,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: randDate(365)
    });
  }
  const userResult = await db.collection('users').insertMany(userDocs);
  const userIds = Object.values(userResult.insertedIds);
  console.log(`✓ ${userIds.length} usuarios (password: 1234)`);

  // ======== 3. MENU ITEMS (8-10 per restaurant = ~180) ========
  const allMenuItems = [];
  for (let ri = 0; ri < restIds.length; ri++) {
    const type = RESTAURANT_TYPES[ri % RESTAURANT_TYPES.length];
    const mainCat = type.cats[0];
    const templates = MENU_CATEGORIES[mainCat] || MENU_CATEGORIES.guatemalteca;

    for (const tpl of templates) {
      const price = randBetween(tpl.price[0], tpl.price[1]);
      allMenuItems.push({
        restaurantId: restIds[ri],
        name: tpl.name,
        description: `${tpl.name} preparado con ingredientes frescos y técnicas artesanales.`,
        category: tpl.cat,
        price: Math.round(price * 100) / 100,
        currency: 'GTQ',
        allergens: tpl.allergens,
        tags: [mainCat, tpl.cat],
        preparationTime: tpl.time,
        imageFileId: null,
        isAvailable: Math.random() > 0.08,
        soldCount: 0,
        rating: { average: 0, count: 0 },
        createdAt: randDate(120),
        updatedAt: new Date()
      });
    }
  }
  const menuResult = await db.collection('menuItems').insertMany(allMenuItems);
  const menuIds = Object.values(menuResult.insertedIds);
  console.log(`✓ ${menuIds.length} items del menú`);

  // ======== 4. ORDERS (200) ========
  const orders = [];
  for (let i = 0; i < 200; i++) {
    const userId = rand(userIds);
    const restIdx = randInt(0, restIds.length);
    const restaurantId = restIds[restIdx];

    const restMenu = allMenuItems.filter(m => m.restaurantId.toString() === restaurantId.toString());
    const numItems = randInt(1, 4);
    const selectedItems = [];
    for (let j = 0; j < numItems; j++) {
      const item = rand(restMenu);
      const qty = randInt(1, 4);
      selectedItems.push({
        menuItemId: item._id || new ObjectId(),
        name: item.name,
        price: item.price,
        quantity: qty,
        subtotal: Math.round(item.price * qty * 100) / 100,
        notes: ''
      });
    }

    const subtotal = selectedItems.reduce((s, it) => s + it.subtotal, 0);
    const deliveryFee = 15;
    const tax = Math.round(subtotal * 0.12 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
    const status = rand(STATUSES);
    const createdAt = randDate(90);

    const history = [{ status: 'pendiente', timestamp: createdAt, note: 'Orden creada' }];
    const flow = ['en_proceso','en_camino','entregado'];
    const statusIdx = flow.indexOf(status);
    if (statusIdx >= 0) {
      for (let s = 0; s <= statusIdx; s++) {
        history.push({ status: flow[s], timestamp: new Date(createdAt.getTime() + (s + 1) * 600000), note: `Cambio a ${flow[s]}` });
      }
    }
    if (status === 'cancelado') history.push({ status: 'cancelado', timestamp: new Date(createdAt.getTime() + 300000), note: 'Cancelado por el usuario' });

    const userDoc = userDocs[userIds.indexOf(userId)] || userDocs[0];
    const addr = userDoc.addresses?.[0] || { street: 'Sin dirección', city: 'Guatemala', location: { type: 'Point', coordinates: [-90.5069, 14.6349] } };

    orders.push({
      orderNumber: `ORD-${Date.now()}-${i}`,
      userId,
      restaurantId,
      items: selectedItems,
      status,
      statusHistory: history,
      deliveryAddress: { street: addr.street, city: addr.city, location: addr.location },
      pricing: { subtotal: Math.round(subtotal * 100) / 100, deliveryFee, tax, total },
      paymentMethod: rand(PAYMENT_METHODS),
      notes: '',
      createdAt,
      updatedAt: new Date()
    });
  }
  await db.collection('orders').insertMany(orders);
  console.log(`✓ ${orders.length} órdenes`);

  // Update soldCount on menuItems
  for (const order of orders) {
    for (const item of order.items) {
      await db.collection('menuItems').updateOne(
        { _id: item.menuItemId },
        { $inc: { soldCount: item.quantity } }
      );
    }
  }

  // Update user totalOrders / totalSpent
  const userStats = {};
  for (const o of orders) {
    const uid = o.userId.toString();
    if (!userStats[uid]) userStats[uid] = { orders: 0, spent: 0 };
    userStats[uid].orders++;
    userStats[uid].spent += o.pricing.total;
  }
  for (const [uid, stats] of Object.entries(userStats)) {
    await db.collection('users').updateOne(
      { _id: new ObjectId(uid) },
      { $set: { totalOrders: stats.orders, totalSpent: Math.round(stats.spent * 100) / 100 } }
    );
  }

  // ======== 5. REVIEWS (150) ========
  const reviews = [];
  for (let i = 0; i < 150; i++) {
    const userId = rand(userIds);
    const restaurantId = rand(restIds);
    const rating = randInt(1, 6);
    const numTags = randInt(1, 4);
    const tags = [];
    for (let t = 0; t < numTags; t++) tags.push(rand(REVIEW_TAGS));

    reviews.push({
      userId,
      targetType: 'restaurant',
      targetId: restaurantId,
      rating,
      title: rand(REVIEW_TITLES),
      comment: rand(REVIEW_COMMENTS),
      tags: [...new Set(tags)],
      helpful: [],
      response: i % 4 === 0 ? { text: '¡Gracias por su visita! Esperamos verle pronto.', respondedAt: new Date() } : null,
      isVerified: Math.random() > 0.2,
      createdAt: randDate(180)
    });
  }
  await db.collection('reviews').insertMany(reviews);
  console.log(`✓ ${reviews.length} reseñas`);

  // Update restaurant ratings
  for (const restId of restIds) {
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

  // ======== 6. EVENT LOGS (50,000) ========
  console.log('\nCreando 50,000 event logs...');
  const BATCH = 5000;
  for (let b = 0; b < 10; b++) {
    const events = [];
    for (let i = 0; i < BATCH; i++) {
      events.push({
        eventType: rand(EVENT_TYPES),
        userId: rand(userIds),
        restaurantId: rand(restIds),
        payload: { action: rand(EVENT_TYPES), value: randInt(1, 1000) },
        timestamp: randDate(90),
        sessionId: `session-${b}-${i}`
      });
    }
    await db.collection('eventLogs').insertMany(events);
    console.log(`  → ${(b + 1) * BATCH}/50,000`);
  }

  // ======== RESUMEN ========
  console.log('\n========================================');
  console.log('SEED MASIVO COMPLETADO');
  console.log('========================================');
  console.log(`Restaurantes:  ${restIds.length} (accessCodes: 1000-1019)`);
  console.log(`Usuarios:      ${userIds.length} (password: 1234)`);
  console.log(`Menú Items:    ${menuIds.length}`);
  console.log(`Órdenes:       ${orders.length}`);
  console.log(`Reseñas:       ${reviews.length}`);
  console.log(`Event Logs:    50,000`);
  console.log('========================================\n');

  await closeDB();
}

seed().catch(err => { console.error(err); process.exit(1); });
