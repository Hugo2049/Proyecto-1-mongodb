function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  if (err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Documento duplicado',
        details: err.keyValue
      });
    }
  }

  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
}

module.exports = errorHandler;
