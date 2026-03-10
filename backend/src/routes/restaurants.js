const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { upload, uploadToGridFS, deleteFromGridFS } = require('../utils/gridfs');

const router = Router();

// ============================================================
// CREATE - Crear restaurante (documento con embebidos: schedule, rating)
// Rúbrica: Creación de documento embebido
// ============================================================
router.post('/', async (req, res, next) => {
  try {
    const db = getDB();
    const {
      name, description, address, phone, email,
      categories, schedule
    } = req.body;

    const restaurant = {
      name,
      description,
      address: {
        street: address.street,
        city: address.city,
        country: address.country || 'Guatemala',
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(address.longitude || -90.5069),
            parseFloat(address.latitude || 14.6349)
          ]
        }
      },
      phone,
      email,
      categories: categories || [],
      schedule: schedule || [
        { day: 'Lunes', open: '08:00', close: '20:00', isOpen: true },
        { day: 'Martes', open: '08:00', close: '20:00', isOpen: true },
        { day: 'Miércoles', open: '08:00', close: '20:00', isOpen: true },
        { day: 'Jueves', open: '08:00', close: '20:00', isOpen: true },
        { day: 'Viernes', open: '08:00', close: '22:00', isOpen: true },
        { day: 'Sábado', open: '09:00', close: '22:00', isOpen: true },
        { day: 'Domingo', open: '09:00', close: '18:00', isOpen: false }
      ],
      rating: { average: 0, count: 0 },  // Embedded stats
      imageFileId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('restaurants').insertOne(restaurant);
    restaurant._id = result.insertedId;

    res.status(201).json({ message: 'Restaurante creado', data: restaurant });
  } catch (error) {
    next(error);
  }
});

// Crear varios restaurantes a la vez
router.post('/many', async (req, res, next) => {
  try {
    const db = getDB();
    const restaurants = req.body.restaurants.map(r => ({
      ...r,
      address: {
        ...r.address,
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(r.address?.longitude || -90.5069),
            parseFloat(r.address?.latitude || 14.6349)
          ]
        }
      },
      rating: { average: 0, count: 0 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await db.collection('restaurants').insertMany(restaurants);
    res.status(201).json({
      message: `${result.insertedCount} restaurantes creados`,
      insertedIds: result.insertedIds
    });
  } catch (error) {
    next(error);
  }
});

// LOGIN ADMIN - Verificar contraseña de administrador
router.post('/login/admin', async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Se requiere contraseña' });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({ message: 'Acceso de administrador concedido', data: { role: 'admin' } });
  } catch (error) {
    next(error);
  }
});

// LOGIN - Verificar código de acceso del restaurante
router.post('/login', async (req, res, next) => {
  try {
    const db = getDB();
    const { restaurantId, accessCode } = req.body;

    if (!restaurantId || !accessCode) {
      return res.status(400).json({ error: 'Se requiere restaurantId y accessCode' });
    }

    const restaurant = await db.collection('restaurants').findOne(
      { _id: new ObjectId(restaurantId) },
      { projection: { accessCode: 1, name: 1 } }
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    if (restaurant.accessCode !== accessCode) {
      return res.status(401).json({ error: 'Código de acceso incorrecto' });
    }

    res.json({ message: 'Acceso concedido', data: { _id: restaurant._id, name: restaurant.name } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// READ - Lectura con filtros, proyecciones, sort, skip, limit
// Rúbrica: Lectura y consulta de documentos (15 pts)
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const {
      search,       // búsqueda por texto
      category,     // filtrar por categoría
      city,         // filtrar por ciudad
      isActive,     // filtrar por estado activo
      minRating,    // filtro por rating mínimo
      sortBy = 'createdAt',  // campo de ordenamiento
      order = 'desc',         // asc o desc
      page = 1,
      limit = 10,
      fields        // proyección: campos separados por coma
    } = req.query;

    // Construir filtro
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (category) filter.categories = category;
    if (city) filter['address.city'] = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (minRating) filter['rating.average'] = { $gte: parseFloat(minRating) };

    // Proyección
    let projection = {};
    if (fields) {
      fields.split(',').forEach(f => { projection[f.trim()] = 1; });
    }

    // Sort
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    // Skip y Limit (paginación)
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!fields) projection.accessCode = 0;

    const [restaurants, total] = await Promise.all([
      db.collection('restaurants')
        .find(filter)
        .project(projection)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      db.collection('restaurants').countDocuments(filter)
    ]);

    res.json({
      data: restaurants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// READ - Obtener uno por ID
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const restaurant = await db.collection('restaurants').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { accessCode: 0 } }
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    res.json({ data: restaurant });
  } catch (error) {
    next(error);
  }
});

// READ - Buscar restaurantes cercanos (Geoespacial con $geoNear)
// Rúbrica: Consultas Geoespaciales - $geoNear devuelve distancia real
router.get('/nearby/:lng/:lat', async (req, res, next) => {
  try {
    const db = getDB();
    const { lng, lat } = req.params;
    const maxDistance = parseInt(req.query.maxDistance) || 5000;

    const restaurants = await db.collection('restaurants').aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: maxDistance,
          query: { isActive: true },
          spherical: true
        }
      },
      { $limit: 20 },
      { $project: { accessCode: 0 } }
    ]).toArray();

    res.json({ data: restaurants });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// UPDATE - Actualizar un documento
// Rúbrica: Actualización de Documentos
// ============================================================
router.put('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id; // no se puede actualizar el _id

    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    res.json({ message: 'Restaurante actualizado', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// UPDATE - Actualizar varios documentos (ej: desactivar por ciudad)
router.patch('/batch/update', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter, update } = req.body;
    // Ejemplo: { filter: { "address.city": "Antigua" }, update: { isActive: false } }

    const result = await db.collection('restaurants').updateMany(
      filter,
      { $set: { ...update, updatedAt: new Date() } }
    );

    res.json({
      message: `${result.modifiedCount} restaurantes actualizados`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// UPDATE - Manejo de embebidos: actualizar schedule
// Rúbrica: Manejo de documentos embebidos (5 pts)
// ============================================================
router.patch('/:id/schedule', async (req, res, next) => {
  try {
    const db = getDB();
    const { day, open, close, isOpen } = req.body;

    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id), 'schedule.day': day },
      {
        $set: {
          'schedule.$.open': open,
          'schedule.$.close': close,
          'schedule.$.isOpen': isOpen,
          updatedAt: new Date()
        }
      }
    );

    res.json({ message: 'Horario actualizado', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// UPDATE - Manejo de arrays: $addToSet para categorías
// Rúbrica: Manejo de Arrays (10 pts)
// ============================================================
router.patch('/:id/categories/add', async (req, res, next) => {
  try {
    const db = getDB();
    const { category } = req.body;

    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $addToSet: { categories: category },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({ message: 'Categoría agregada (sin duplicados)', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// $pull - Remover categoría
router.patch('/:id/categories/remove', async (req, res, next) => {
  try {
    const db = getDB();
    const { category } = req.body;

    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $pull: { categories: category },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({ message: 'Categoría removida', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE - Eliminar un documento
// Rúbrica: Eliminación de Documentos (10 pts)
// ============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const id = new ObjectId(req.params.id);

    // Verificar si tiene órdenes activas
    const activeOrders = await db.collection('orders').countDocuments({
      restaurantId: id,
      status: { $in: ['pendiente', 'en_proceso'] }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar: tiene órdenes activas',
        activeOrders
      });
    }

    const result = await db.collection('restaurants').deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    res.json({ message: 'Restaurante eliminado' });
  } catch (error) {
    next(error);
  }
});

// DELETE - Eliminar varios documentos
router.delete('/batch/delete', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter } = req.body;
    // Ejemplo: { filter: { isActive: false, "rating.count": 0 } }

    const result = await db.collection('restaurants').deleteMany(filter);

    res.json({
      message: `${result.deletedCount} restaurantes eliminados`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
});

// Subir imagen del restaurante
router.post('/:id/image', upload.single('image'), async (req, res, next) => {
  try {
    const db = getDB();
    if (!req.file) return res.status(400).json({ error: 'No se envió imagen' });

    const fileId = await uploadToGridFS(
      req.file.buffer,
      `restaurant-${req.params.id}-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype,
      { entityType: 'restaurant', entityId: req.params.id }
    );

    // Borrar imagen anterior si existe
    const restaurant = await db.collection('restaurants').findOne({ _id: new ObjectId(req.params.id) });
    if (restaurant?.imageFileId) {
      try { await deleteFromGridFS(restaurant.imageFileId); } catch (e) { /* ignorar */ }
    }

    await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { imageFileId: fileId, updatedAt: new Date() } }
    );

    res.json({ message: 'Imagen subida', fileId: fileId.toString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
