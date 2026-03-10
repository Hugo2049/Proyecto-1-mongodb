const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const router = Router();

// ============================================================
// AGREGACIONES SIMPLES
// Rúbrica: Simples (count, distinct, etc.) - 5 pts
// ============================================================

// Count - Contar órdenes por estado de un restaurante
router.get('/orders/count', async (req, res, next) => {
  try {
    const db = getDB();
    const { restaurantId, status } = req.query;

    const filter = {};
    if (restaurantId) filter.restaurantId = new ObjectId(restaurantId);
    if (status) filter.status = status;

    const count = await db.collection('orders').countDocuments(filter);
    res.json({ count, filter: req.query });
  } catch (error) {
    next(error);
  }
});

// Distinct - Categorías únicas de un restaurante
router.get('/restaurants/:id/categories', async (req, res, next) => {
  try {
    const db = getDB();
    const categories = await db.collection('menuItems').distinct(
      'category',
      { restaurantId: new ObjectId(req.params.id) }
    );
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

// Distinct - Todos los alérgenos disponibles
router.get('/allergens', async (req, res, next) => {
  try {
    const db = getDB();
    const allergens = await db.collection('menuItems').distinct('allergens');
    res.json({ data: allergens });
  } catch (error) {
    next(error);
  }
});

// Distinct - Ciudades con restaurantes
router.get('/cities', async (req, res, next) => {
  try {
    const db = getDB();
    const cities = await db.collection('restaurants').distinct('address.city');
    res.json({ data: cities });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// AGREGACIONES COMPLEJAS
// Rúbrica: Complejas (pipelines de agregación complejas) - 10 pts
// ============================================================

// Top 10 restaurantes mejor calificados
router.get('/top-restaurants', async (req, res, next) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.collection('reviews').aggregate([
      { $match: { targetType: 'restaurant' } },
      {
        $group: {
          _id: '$targetId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      },
      { $match: { totalReviews: { $gte: 1 } } },
      { $sort: { avgRating: -1, totalReviews: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          name: '$restaurant.name',
          city: '$restaurant.address.city',
          categories: '$restaurant.categories',
          avgRating: { $round: ['$avgRating', 1] },
          totalReviews: 1
        }
      }
    ]).toArray();

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// Platillos más vendidos por restaurante
router.get('/top-items', async (req, res, next) => {
  try {
    const db = getDB();
    const restaurantId = req.query.restaurantId;
    const topN = parseInt(req.query.top) || 5;

    const matchStage = { $match: { status: 'entregado' } };
    if (restaurantId) matchStage.$match.restaurantId = new ObjectId(restaurantId);

    const result = await db.collection('orders').aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $group: {
          _id: { restaurant: '$restaurantId', item: '$items.menuItemId' },
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalSold: -1 } },
      {
        $group: {
          _id: '$_id.restaurant',
          topItems: {
            $push: {
              name: '$name',
              sold: '$totalSold',
              revenue: { $round: ['$totalRevenue', 2] }
            }
          }
        }
      },
      { $project: { topItems: { $slice: ['$topItems', topN] } } },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          restaurantName: '$restaurant.name',
          topItems: 1
        }
      }
    ]).toArray();

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// Ingresos por restaurante por mes
router.get('/revenue-by-month', async (req, res, next) => {
  try {
    const db = getDB();
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const restaurantId = req.query.restaurantId;
    const matchFilter = {
      status: 'entregado',
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`)
      }
    };
    if (restaurantId) matchFilter.restaurantId = new ObjectId(restaurantId);

    const result = await db.collection('orders').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            restaurantId: '$restaurantId',
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 },
          avgTicket: { $avg: '$pricing.total' }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id.restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          restaurantName: '$restaurant.name',
          year: '$_id.year',
          month: '$_id.month',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
          avgTicket: { $round: ['$avgTicket', 2] }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, totalRevenue: -1 } }
    ]).toArray();

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// $facet - Búsqueda paginada con facetas
router.get('/menu-facets', async (req, res, next) => {
  try {
    const db = getDB();
    const restaurantId = req.query.restaurantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const matchStage = restaurantId
      ? { $match: { restaurantId: new ObjectId(restaurantId), isAvailable: true } }
      : { $match: { isAvailable: true } };

    const result = await db.collection('menuItems').aggregate([
      matchStage,
      {
        $facet: {
          // Resultados paginados
          items: [
            { $sort: { soldCount: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { name: 1, price: 1, category: 1, soldCount: 1, rating: 1 } }
          ],
          // Faceta por categoría
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
            { $sort: { count: -1 } }
          ],
          // Faceta por rango de precio
          byPriceRange: [
            {
              $bucket: {
                groupBy: '$price',
                boundaries: [0, 25, 50, 100, 200, 500],
                default: '500+',
                output: { count: { $sum: 1 }, items: { $push: '$name' } }
              }
            }
          ],
          // Total
          totalCount: [{ $count: 'total' }]
        }
      }
    ]).toArray();

    res.json({ data: result[0] });
  } catch (error) {
    next(error);
  }
});

// $bucket - Distribución de calificaciones
router.get('/rating-distribution/:restaurantId', async (req, res, next) => {
  try {
    const db = getDB();

    const result = await db.collection('reviews').aggregate([
      {
        $match: {
          targetType: 'restaurant',
          targetId: new ObjectId(req.params.restaurantId)
        }
      },
      {
        $bucket: {
          groupBy: '$rating',
          boundaries: [1, 2, 3, 4, 5, 6],
          default: 'other',
          output: {
            count: { $sum: 1 },
            reviews: { $push: { title: '$title', rating: '$rating' } }
          }
        }
      }
    ]).toArray();

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// Resumen general del sistema (o de un restaurante específico)
router.get('/dashboard', async (req, res, next) => {
  try {
    const db = getDB();
    const { restaurantId } = req.query;

    if (restaurantId) {
      const rid = new ObjectId(restaurantId);
      const [
        restaurant,
        totalOrders,
        totalReviews,
        totalMenuItems,
        revenueStats,
        ordersByStatus
      ] = await Promise.all([
        db.collection('restaurants').findOne({ _id: rid }),
        db.collection('orders').countDocuments({ restaurantId: rid }),
        db.collection('reviews').countDocuments({ targetType: 'restaurant', targetId: rid }),
        db.collection('menuItems').countDocuments({ restaurantId: rid }),
        db.collection('orders').aggregate([
          { $match: { status: 'entregado', restaurantId: rid } },
          { $group: { _id: null, total: { $sum: '$pricing.total' }, avg: { $avg: '$pricing.total' } } }
        ]).toArray(),
        db.collection('orders').aggregate([
          { $match: { restaurantId: rid } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()
      ]);

      return res.json({
        data: {
          restaurantName: restaurant?.name,
          totalOrders,
          totalReviews,
          totalMenuItems,
          revenue: revenueStats[0] || { total: 0, avg: 0 },
          ordersByStatus
        }
      });
    }

    const [
      totalRestaurants,
      totalUsers,
      totalOrders,
      totalReviews,
      totalMenuItems,
      totalEventLogs,
      revenueStats,
      ordersByStatus
    ] = await Promise.all([
      db.collection('restaurants').countDocuments({ isActive: true }),
      db.collection('users').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('reviews').countDocuments(),
      db.collection('menuItems').countDocuments(),
      db.collection('eventLogs').estimatedDocumentCount(),
      db.collection('orders').aggregate([
        { $match: { status: 'entregado' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' }, avg: { $avg: '$pricing.total' } } }
      ]).toArray(),
      db.collection('orders').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray()
    ]);

    res.json({
      data: {
        totalRestaurants,
        totalUsers,
        totalOrders,
        totalReviews,
        totalMenuItems,
        totalEventLogs,
        revenue: revenueStats[0] || { total: 0, avg: 0 },
        ordersByStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

// Explain - Para validar uso de índices
router.post('/explain', async (req, res, next) => {
  try {
    const db = getDB();
    const { collection, filter, sort } = req.body;

    const cursor = db.collection(collection).find(filter || {});
    if (sort) cursor.sort(sort);

    const explanation = await cursor.explain('executionStats');

    res.json({
      data: {
        queryPlanner: explanation.queryPlanner,
        executionStats: {
          executionSuccess: explanation.executionStats.executionSuccess,
          nReturned: explanation.executionStats.nReturned,
          executionTimeMillis: explanation.executionStats.executionTimeMillis,
          totalKeysExamined: explanation.executionStats.totalKeysExamined,
          totalDocsExamined: explanation.executionStats.totalDocsExamined,
          stage: explanation.executionStats.executionStages?.stage || explanation.queryPlanner?.winningPlan?.stage
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
