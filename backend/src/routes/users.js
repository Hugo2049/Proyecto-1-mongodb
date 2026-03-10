const { Router } = require('express');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const { getDB } = require('../config/database');

const router = Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

// LOGIN
router.post('/login', async (req, res, next) => {
  try {
    const db = getDB();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'No existe una cuenta con ese email' });

    if (!user.password) return res.status(401).json({ error: 'Cuenta sin contraseña, contacte al administrador' });
    if (!verifyPassword(password, user.password)) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const { password: _, ...safeUser } = user;
    res.json({ message: 'Sesión iniciada', data: safeUser });
  } catch (error) {
    next(error);
  }
});

// REGISTER 
router.post('/register', async (req, res, next) => {
  try {
    const db = getDB();
    const { name, email, password, phone, street, city, latitude, longitude } = req.body;

    if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    if (password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });

    const existing = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

    const user = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashPassword(password),
      phone: phone || '',
      dietaryPrefs: [],
      addresses: street ? [{
        label: 'Casa',
        street,
        city: city || 'Guatemala',
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude || -90.5069), parseFloat(latitude || 14.6349)]
        },
        isDefault: true
      }] : [],
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;

    const { password: _, ...safeUser } = user;
    res.status(201).json({ message: 'Cuenta creada exitosamente', data: safeUser });
  } catch (error) {
    next(error);
  }
});

// CREATE 
router.post('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { name, email, phone, dietaryPrefs, addresses } = req.body;

    const user = {
      name,
      email,
      phone,
      dietaryPrefs: dietaryPrefs || [],
      addresses: (addresses || []).map(addr => ({
        label: addr.label || 'Casa',
        street: addr.street,
        city: addr.city,
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(addr.longitude || -90.5069),
            parseFloat(addr.latitude || 14.6349)
          ]
        },
        isDefault: addr.isDefault || false
      })),
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;

    res.status(201).json({ message: 'Usuario creado', data: user });
  } catch (error) {
    next(error);
  }
});

// Crear varios usuarios
router.post('/many', async (req, res, next) => {
  try {
    const db = getDB();
    const users = req.body.users.map(u => ({
      ...u,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date()
    }));

    const result = await db.collection('users').insertMany(users);
    res.status(201).json({
      message: `${result.insertedCount} usuarios creados`,
      insertedIds: result.insertedIds
    });
  } catch (error) {
    next(error);
  }
});

// READ 
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { search, city, dietaryPref, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    if (city) filter['addresses.city'] = city;
    if (dietaryPref) filter.dietaryPrefs = dietaryPref;

    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      db.collection('users').find(filter).project({ password: 0 }).sort(sort).skip(skip).limit(parseInt(limit)).toArray(),
      db.collection('users').countDocuments(filter)
    ]);

    res.json({
      data: users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
});

// READ 
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// UPDATE
router.put('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const updateData = { ...req.body };
    delete updateData._id;

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// UPDATE 
router.patch('/:id/addresses/add', async (req, res, next) => {
  try {
    const db = getDB();
    const address = {
      label: req.body.label,
      street: req.body.street,
      city: req.body.city,
      location: {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude || -90.5069), parseFloat(req.body.latitude || 14.6349)]
      },
      isDefault: req.body.isDefault || false
    };

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { addresses: address } }
    );

    res.json({ message: 'Dirección agregada', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// UPDATE 
router.patch('/:id/addresses/remove', async (req, res, next) => {
  try {
    const db = getDB();
    const { label } = req.body;

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { addresses: { label } } }
    );

    res.json({ message: 'Dirección removida', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// UPDATE 
router.patch('/:id/dietary/add', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { dietaryPrefs: req.body.pref } }
    );
    res.json({ message: 'Preferencia agregada', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
