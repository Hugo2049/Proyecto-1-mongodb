const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB, getClient } = require('../config/database');

const router = Router();

// ============================================================
// CREATE - Crear orden con TRANSACCIÓN
// Rúbrica: Creación embebida (items, statusHistory, deliveryAddress)
// Rúbrica: Transacción multi-documento
// ============================================================
router.post('/', async (req, res, next) => {
  const client = getClient();
  let session;

  try {
    const db = getDB();
    const { userId, customerName, restaurantId, items, deliveryAddress, paymentMethod, notes } = req.body;

    if (!userId && !customerName) {
      return res.status(400).json({ error: 'Se requiere userId o customerName' });
    }
    if (!restaurantId || !items || items.length === 0) {
      return res.status(400).json({ error: 'restaurantId y al menos un item son requeridos' });
    }

    let user = null;
    if (userId) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const restaurant = await db.collection('restaurants').findOne({ _id: new ObjectId(restaurantId) });
    if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const menuItemIds = items.map(i => new ObjectId(i.menuItemId));
    const menuItems = await db.collection('menuItems').find({
      _id: { $in: menuItemIds }
    }).toArray();

    const orderItems = items.map(item => {
      const menuItem = menuItems.find(m => m._id.toString() === item.menuItemId);
      if (!menuItem) throw new Error(`MenuItem ${item.menuItemId} no encontrado`);
      return {
        menuItemId: new ObjectId(item.menuItemId),
        name: menuItem.name,
        price: menuItem.price,
        quantity: parseInt(item.quantity),
        subtotal: menuItem.price * parseInt(item.quantity),
        notes: item.notes || ''
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryFee = user ? 15 : 0;
    const tax = Math.round(subtotal * 0.12 * 100) / 100;
    const total = subtotal + deliveryFee + tax;

    const order = {
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      restaurantId: new ObjectId(restaurantId),
      items: orderItems,
      status: 'pendiente',
      statusHistory: [
        { status: 'pendiente', timestamp: new Date(), note: 'Orden creada' }
      ],
      pricing: { subtotal, deliveryFee, tax, total },
      paymentMethod: paymentMethod || 'efectivo',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (user) {
      order.userId = new ObjectId(userId);
      order.deliveryAddress = deliveryAddress || {
        street: user.addresses?.[0]?.street || 'Sin dirección',
        city: user.addresses?.[0]?.city || 'Guatemala',
        location: user.addresses?.[0]?.location || { type: 'Point', coordinates: [-90.5069, 14.6349] }
      };
    } else {
      order.customerName = customerName.trim();
      order.deliveryAddress = deliveryAddress || {
        street: restaurant.address?.street || 'En restaurante',
        city: restaurant.address?.city || 'Guatemala'
      };
    }

    session = client.startSession();
    let insertedOrder;
    await session.withTransaction(async () => {
      const result = await db.collection('orders').insertOne(order, { session });
      order._id = result.insertedId;

      for (const item of orderItems) {
        await db.collection('menuItems').updateOne(
          { _id: item.menuItemId },
          { $inc: { soldCount: item.quantity } },
          { session }
        );
      }

      if (user) {
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          { $inc: { totalOrders: 1, totalSpent: total } },
          { session }
        );
      }

      insertedOrder = order;
    });
    session.endSession();
    session = null;

    await db.collection('eventLogs').insertOne({
      eventType: 'create_order',
      userId: user ? new ObjectId(userId) : null,
      restaurantId: new ObjectId(restaurantId),
      payload: { orderId: order._id, total, customerName: order.customerName || null },
      timestamp: new Date(),
      sessionId: `session-${Date.now()}`
    });

    res.status(201).json({ message: 'Orden creada exitosamente', data: insertedOrder });
  } catch (error) {
    next(error);
  } finally {
    if (session) session.endSession();
  }
});

// ============================================================
// READ - Consultas con filtros, proyecciones, sort, skip, limit, lookup
// Rúbrica: Lectura y consulta de documentos (15 pts)
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const {
      userId, restaurantId, status, orderNumber,
      minTotal, maxTotal, startDate, endDate,
      sortBy = 'createdAt', order = 'desc',
      page = 1, limit = 10, fields
    } = req.query;

    const filter = {};
    if (userId) filter.userId = new ObjectId(userId);
    if (restaurantId) filter.restaurantId = new ObjectId(restaurantId);
    if (status) filter.status = status;
    if (orderNumber) filter.orderNumber = orderNumber;
    if (minTotal || maxTotal) {
      filter['pricing.total'] = {};
      if (minTotal) filter['pricing.total'].$gte = parseFloat(minTotal);
      if (maxTotal) filter['pricing.total'].$lte = parseFloat(maxTotal);
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let projection = {};
    if (fields) fields.split(',').forEach(f => { projection[f.trim()] = 1; });

    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      db.collection('orders').find(filter).project(projection)
        .sort(sort).skip(skip).limit(parseInt(limit)).toArray(),
      db.collection('orders').countDocuments(filter)
    ]);

    res.json({
      data: orders,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
});

// READ - Orden con lookup a usuario y restaurante
// Rúbrica: Consultas multi-colección (lookups)
router.get('/:id/detail', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('orders').aggregate([
      { $match: { _id: new ObjectId(req.params.id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
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
        $lookup: {
          from: 'reviews',
          let: { orderId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$targetId', '$$orderId'] },
              { $eq: ['$targetType', 'order'] }
            ]}}}
          ],
          as: 'reviews'
        }
      },
      {
        $project: {
          orderNumber: 1, items: 1, status: 1, statusHistory: 1,
          deliveryAddress: 1, pricing: 1, paymentMethod: 1,
          notes: 1, createdAt: 1,
          'user.name': 1, 'user.email': 1, 'user.phone': 1,
          'restaurant.name': 1, 'restaurant.address': 1, 'restaurant.phone': 1,
          reviews: 1
        }
      }
    ]).toArray();

    if (result.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ data: result[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ data: order });
  } catch (error) {
    next(error);
  }
});

// Órdenes con $elemMatch - buscar donde algún item tenga cierta condición
router.get('/search/by-item', async (req, res, next) => {
  try {
    const db = getDB();
    const { minQuantity = 2, itemName } = req.query;

    const filter = {
      items: {
        $elemMatch: {
          ...(itemName && { name: { $regex: itemName, $options: 'i' } }),
          quantity: { $gte: parseInt(minQuantity) }
        }
      }
    };

    const orders = await db.collection('orders').find(filter)
      .sort({ createdAt: -1 }).limit(20).toArray();

    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// UPDATE - Actualizar estado con $push al historial
// Rúbrica: Manejo de Arrays ($push)
// ============================================================
router.patch('/:id/status', async (req, res, next) => {
  try {
    const db = getDB();
    const { status, note } = req.body;
    const validStatuses = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Usar: ${validStatuses.join(', ')}` });
    }

    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: { status, updatedAt: new Date() },
        $push: {
          statusHistory: {
            status,
            timestamp: new Date(),
            note: note || `Estado cambiado a ${status}`
          }
        }
      }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ message: `Estado actualizado a: ${status}` });
  } catch (error) {
    next(error);
  }
});

// UPDATE - Actualizar un documento
router.put('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id;

    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ message: 'Orden actualizada', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// UPDATE - Actualizar varios (ej: cancelar todas las pendientes de un restaurante)
router.patch('/batch/update', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter, update } = req.body;
    if (filter.restaurantId) filter.restaurantId = new ObjectId(filter.restaurantId);
    if (filter.userId) filter.userId = new ObjectId(filter.userId);

    const result = await db.collection('orders').updateMany(
      filter,
      { $set: { ...update, updatedAt: new Date() } }
    );
    res.json({ message: `${result.modifiedCount} órdenes actualizadas` });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE
// ============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    // Solo se pueden eliminar órdenes canceladas
    const order = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'cancelado') {
      return res.status(400).json({ error: 'Solo se pueden eliminar órdenes canceladas' });
    }

    await db.collection('orders').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Orden eliminada' });
  } catch (error) {
    next(error);
  }
});

// DELETE varios
router.delete('/batch/delete', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter } = req.body;
    // Solo canceladas
    filter.status = 'cancelado';

    const result = await db.collection('orders').deleteMany(filter);
    res.json({ message: `${result.deletedCount} órdenes eliminadas` });
  } catch (error) {
    next(error);
  }
});

// $pop - Remover último estado del historial (corrección)
router.patch('/:id/status/pop', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pop: { statusHistory: 1 } } // 1 = último, -1 = primero
    );
    res.json({ message: 'Último estado removido del historial', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
