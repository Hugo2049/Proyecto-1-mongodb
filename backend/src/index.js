require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Importar rutas
const restaurantRoutes = require('./routes/restaurants');
const userRoutes = require('./routes/users');
const menuItemRoutes = require('./routes/menuItems');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const analyticsRoutes = require('./routes/analytics');
const fileRoutes = require('./routes/files');
const bulkRoutes = require('./routes/bulk');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rutas
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/bulk', bulkRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Iniciar servidor
async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`API disponible en http://localhost:${PORT}/api`);
  });
}

start();
