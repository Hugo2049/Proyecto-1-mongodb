const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB, getClient } = require('../config/database');

const router = Router();

// ============================================================
// CREATE - Crear reseña con TRANSACCIÓN (actualiza rating)
// ============================================================
router.post('/', async (req, res, next) => {
  const client = getClient();
  let session;

  try {
    const db = getDB();
    const { userId, targetType, targetId, rating, title, comment, tags } = req.body;

    if (!userId || !targetId) {
      return res.status(400).json({ error: 'userId y targetId son requeridos' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }
    if (!['restaurant', 'order'].includes(targetType)) {
      return res.status(400).json({ error: 'targetType debe ser "restaurant" o "order"' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });
    }

    const review = {
      userId: new ObjectId(userId),
      targetType,
      targetId: new ObjectId(targetId),
      rating: parseFloat(rating),
      title: title || '',
      comment: comment.trim(),
      tags: tags || [],
      helpful: [],
      response: null,
      isVerified: false,
      createdAt: new Date()
    };

    // ===== TRANSACCIÓN =====
    session = client.startSession();
    await session.withTransaction(async () => {
      const result = await db.collection('reviews').insertOne(review, { session });
      review._id = result.insertedId;

      if (targetType === 'restaurant') {
        const stats = await db.collection('reviews').aggregate([
          { $match: { targetType: 'restaurant', targetId: new ObjectId(targetId) } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ], { session }).toArray();

        if (stats.length > 0) {
          await db.collection('restaurants').updateOne(
            { _id: new ObjectId(targetId) },
            {
              $set: {
                'rating.average': Math.round(stats[0].avg * 10) / 10,
                'rating.count': stats[0].count,
                updatedAt: new Date()
              }
            },
            { session }
          );
        }
      }
    });
    session.endSession();
    session = null;
    // ===== FIN TRANSACCIÓN =====

    // Log del evento
    await db.collection('eventLogs').insertOne({
      eventType: 'post_review',
      userId: new ObjectId(userId),
      restaurantId: targetType === 'restaurant' ? new ObjectId(targetId) : null,
      payload: { reviewId: review._id, rating, targetType },
      timestamp: new Date(),
      sessionId: `session-${Date.now()}`
    });

    res.status(201).json({ message: 'Reseña publicada', data: review });
  } catch (error) {
    next(error);
  } finally {
    if (session) session.endSession();
  }
});

// READ - Con filtros, sort, proyección
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const {
      targetType, targetId, userId, minRating, maxRating,
      tag, search,
      sortBy = 'createdAt', order = 'desc',
      page = 1, limit = 10
    } = req.query;

    const filter = {};
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = new ObjectId(targetId);
    if (userId) filter.userId = new ObjectId(userId);
    if (tag) filter.tags = tag;
    if (search) filter.$text = { $search: search };
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = parseFloat(minRating);
      if (maxRating) filter.rating.$lte = parseFloat(maxRating);
    }

    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      db.collection('reviews').find(filter).sort(sort).skip(skip).limit(parseInt(limit)).toArray(),
      db.collection('reviews').countDocuments(filter)
    ]);

    res.json({
      data: reviews,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
});

// READ - Reseñas de un restaurante con lookup al usuario
router.get('/restaurant/:restaurantId', async (req, res, next) => {
  try {
    const db = getDB();
    const reviews = await db.collection('reviews').aggregate([
      {
        $match: {
          targetType: 'restaurant',
          targetId: new ObjectId(req.params.restaurantId)
        }
      },
      { $sort: { createdAt: -1 } },
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
        $project: {
          rating: 1, title: 1, comment: 1, tags: 1,
          helpful: 1, response: 1, isVerified: 1, createdAt: 1,
          'user.name': 1, 'user.email': 1
        }
      }
    ]).toArray();

    res.json({ data: reviews });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const review = await db.collection('reviews').findOne({ _id: new ObjectId(req.params.id) });
    if (!review) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ data: review });
  } catch (error) {
    next(error);
  }
});

// UPDATE
router.put('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const { rating, title, comment, tags } = req.body;
    const result = await db.collection('reviews').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { rating, title, comment, tags, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ message: 'Reseña actualizada' });
  } catch (error) {
    next(error);
  }
});

// UPDATE - Agregar respuesta del restaurante (embedded)
// Rúbrica: Manejo de documentos embebidos
router.patch('/:id/response', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('reviews').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          response: {
            text: req.body.text,
            respondedAt: new Date()
          }
        }
      }
    );
    res.json({ message: 'Respuesta agregada', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// Marcar reseña como útil ($addToSet en helpful)
router.patch('/:id/helpful', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('reviews').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { helpful: new ObjectId(req.body.userId) } }
    );
    res.json({ message: 'Marcada como útil', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// Desmarcar helpful ($pull)
router.patch('/:id/unhelpful', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('reviews').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { helpful: new ObjectId(req.body.userId) } }
    );
    res.json({ message: 'Desmarcada como útil', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('reviews').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ message: 'Reseña eliminada' });
  } catch (error) {
    next(error);
  }
});

// DELETE muchas
router.delete('/batch/delete', async (req, res, next) => {
  try {
    const db = getDB();
    const { filter } = req.body;
    if (filter.targetId) filter.targetId = new ObjectId(filter.targetId);
    if (filter.userId) filter.userId = new ObjectId(filter.userId);
    const result = await db.collection('reviews').deleteMany(filter);
    res.json({ message: `${result.deletedCount} reseñas eliminadas` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
