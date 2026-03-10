const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { upload, uploadToGridFS } = require('../utils/gridfs');

const router = Router();

// CREATE - Crear artículo del menú (documento referenciado a restaurant)
// Rúbrica: Creación de documentos referenciados
router.post('/', async (req, res, next) => {
  try {
    const db = getDB();
    const {
      restaurantId, name, description, category,
      price, allergens, tags, preparationTime, isAvailable
    } = req.body;

    // Verificar que el restaurante existe
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId)
    });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    const menuItem = {
      restaurantId: new ObjectId(restaurantId),  // REFERENCIA
      name,
      description,
      category: category || 'general',
      price: parseFloat(price),
      currency: 'GTQ',
      allergens: allergens || [],
      tags: tags || [],
      imageFileId: null,
      isAvailable: isAvailable !== false,
      preparationTime: parseInt(preparationTime) || 20,
      soldCount: 0,
      rating: { average: 0, count: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('menuItems').insertOne(menuItem);
    menuItem._id = result.insertedId;

    res.status(201).json({ message: 'Artículo del menú creado', data: menuItem });
  } catch (error) {
    next(error);
  }
});

// Crear varios artículos
router.post('/many', async (req, res, next) => {
  try {
    const db = getDB();
    const items = req.body.items.map(item => ({
      ...item,
      restaurantId: new ObjectId(item.restaurantId),
      price: parseFloat(item.price),
      currency: 'GTQ',
      allergens: item.allergens || [],
      tags: item.tags || [],
      imageFileId: null,
      isAvailable: true,
      soldCount: 0,
      rating: { average: 0, count: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await db.collection('menuItems').insertMany(items);
    res.status(201).json({
      message: `${result.insertedCount} artículos creados`,
      insertedIds: result.insertedIds
    });
  } catch (error) {
    next(error);
  }
});

// READ - Listar con filtros, texto, proyección
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const {
      restaurantId, category, search, allergen,
      minPrice, maxPrice, isAvailable,
      sortBy = 'name', order = 'asc',
      page = 1, limit = 20, fields
    } = req.query;

    const filter = {};
    if (restaurantId) filter.restaurantId = new ObjectId(restaurantId);
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    if (allergen) filter.allergens = allergen;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    let projection = {};
    if (fields) fields.split(',').forEach(f => { projection[f.trim()] = 1; });

    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      db.collection('menuItems').find(filter).project(projection)
        .sort(sort).skip(skip).limit(parseInt(limit)).toArray(),
      db.collection('menuItems').countDocuments(filter)
    ]);

    res.json({
      data: items,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
});

// READ - Menú de un restaurante con lookup
router.get('/restaurant/:restaurantId', async (req, res, next) => {
  try {
    const db = getDB();
    const items = await db.collection('menuItems').aggregate([
      { $match: { restaurantId: new ObjectId(req.params.restaurantId), isAvailable: true } },
      { $sort: { category: 1, name: 1 } },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          name: 1, description: 1, category: 1, price: 1,
          allergens: 1, tags: 1, isAvailable: 1, preparationTime: 1,
          soldCount: 1, rating: 1, imageFileId: 1,
          'restaurant.name': 1, 'restaurant.address.city': 1
        }
      }
    ]).toArray();

    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const item = await db.collection('menuItems').findOne({ _id: new ObjectId(req.params.id) });
    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

// UPDATE
router.put('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id;
    if (updateData.restaurantId) updateData.restaurantId = new ObjectId(updateData.restaurantId);

    const result = await db.collection('menuItems').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Artículo actualizado', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// UPDATE muchos (ej: desactivar todos los de una categoría)
router.patch('/batch/update', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter, update } = req.body;
    if (filter.restaurantId) filter.restaurantId = new ObjectId(filter.restaurantId);

    const result = await db.collection('menuItems').updateMany(
      filter,
      { $set: { ...update, updatedAt: new Date() } }
    );
    res.json({ message: `${result.modifiedCount} artículos actualizados`, modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// Arrays - agregar alérgeno
router.patch('/:id/allergens/add', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('menuItems').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { allergens: req.body.allergen }, $set: { updatedAt: new Date() } }
    );
    res.json({ message: 'Alérgeno agregado', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// Arrays - remover alérgeno
router.patch('/:id/allergens/remove', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('menuItems').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { allergens: req.body.allergen }, $set: { updatedAt: new Date() } }
    );
    res.json({ message: 'Alérgeno removido', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('menuItems').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Artículo eliminado' });
  } catch (error) {
    next(error);
  }
});

// DELETE muchos
router.delete('/batch/delete', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter } = req.body;
    if (filter.restaurantId) filter.restaurantId = new ObjectId(filter.restaurantId);
    const result = await db.collection('menuItems').deleteMany(filter);
    res.json({ message: `${result.deletedCount} artículos eliminados` });
  } catch (error) {
    next(error);
  }
});

// Subir imagen
router.post('/:id/image', upload.single('image'), async (req, res, next) => {
  try {
    const db = getDB();
    if (!req.file) return res.status(400).json({ error: 'No se envió imagen' });

    const fileId = await uploadToGridFS(
      req.file.buffer,
      `menuitem-${req.params.id}-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype,
      { entityType: 'menuItem', entityId: req.params.id }
    );

    await db.collection('menuItems').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { imageFileId: fileId, updatedAt: new Date() } }
    );

    res.json({ message: 'Imagen subida', fileId: fileId.toString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
