const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const router = Router();

// ============================================================
// OPERACIONES BULK (bulkWrite)
// Rúbrica: Extra - hasta 5 puntos
// ============================================================

// BulkWrite genérico en una colección
router.post('/:collection', async (req, res, next) => {
  try {
    const db = getDB();
    const { collection } = req.params;
    const { operations } = req.body;

    const allowedCollections = ['restaurants', 'users', 'menuItems', 'orders', 'reviews', 'eventLogs'];
    if (!allowedCollections.includes(collection)) {
      return res.status(400).json({ error: `Colección no permitida. Usar: ${allowedCollections.join(', ')}` });
    }

    // Transformar ObjectIds en los filtros
    const transformedOps = operations.map(op => {
      const transformed = { ...op };
      // Convertir _id strings a ObjectId
      if (transformed.insertOne?.document?._id) {
        transformed.insertOne.document._id = new ObjectId(transformed.insertOne.document._id);
      }
      return transformed;
    });

    const result = await db.collection(collection).bulkWrite(transformedOps, { ordered: false });

    res.json({
      message: 'Operaciones bulk completadas',
      result: {
        insertedCount: result.insertedCount,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
        upsertedCount: result.upsertedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// Ejemplo: Bulk update de precios de menú
router.post('/menu-items/price-update', async (req, res, next) => {
  try {
    const db = getDB();
    const { restaurantId, percentage } = req.body;
    // Incrementar precios de todos los items de un restaurante por un porcentaje

    const items = await db.collection('menuItems').find({
      restaurantId: new ObjectId(restaurantId)
    }).toArray();

    const operations = items.map(item => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            price: Math.round(item.price * (1 + percentage / 100) * 100) / 100,
            updatedAt: new Date()
          }
        }
      }
    }));

    const result = await db.collection('menuItems').bulkWrite(operations);

    res.json({
      message: `Precios actualizados ${percentage > 0 ? '+' : ''}${percentage}%`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
