const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { upload, uploadToGridFS, downloadFromGridFS, deleteFromGridFS } = require('../utils/gridfs');

const router = Router();

// Subir archivo genérico a GridFS
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

    const fileId = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.body.metadata ? JSON.parse(req.body.metadata) : {}
    );

    res.status(201).json({
      message: 'Archivo subido',
      fileId: fileId.toString(),
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    next(error);
  }
});

// Descargar archivo
router.get('/:fileId', async (req, res, next) => {
  try {
    const { stream, file } = await downloadFromGridFS(req.params.fileId);

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);
    res.set('Content-Length', file.length);

    stream.pipe(res);
  } catch (error) {
    if (error.message === 'Archivo no encontrado') {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    next(error);
  }
});

// Listar archivos en GridFS
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const files = await db.collection('uploads.files')
      .find({})
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('uploads.files').countDocuments();

    res.json({
      data: files.map(f => ({
        _id: f._id,
        filename: f.filename,
        contentType: f.contentType,
        length: f.length,
        uploadDate: f.uploadDate,
        metadata: f.metadata
      })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Eliminar archivo
router.delete('/:fileId', async (req, res, next) => {
  try {
    await deleteFromGridFS(req.params.fileId);
    res.json({ message: 'Archivo eliminado' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
