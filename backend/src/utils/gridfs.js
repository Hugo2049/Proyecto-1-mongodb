const multer = require('multer');
const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const { getGridFSBucket, getDB } = require('../config/database');

// Multer en memoria para luego subir a GridFS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Usa: jpg, png, gif, webp, pdf'));
    }
  }
});

// Subir buffer a GridFS
async function uploadToGridFS(buffer, filename, mimetype, metadata = {}) {
  const bucket = getGridFSBucket();

  return new Promise((resolve, reject) => {
    const readStream = new Readable();
    readStream.push(buffer);
    readStream.push(null);

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata
    });

    readStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        resolve(uploadStream.id);
      });
  });
}

// Descargar archivo de GridFS
async function downloadFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  const _id = new ObjectId(fileId);

  // Verificar que el archivo existe
  const files = await getDB().collection('uploads.files').findOne({ _id });
  if (!files) throw new Error('Archivo no encontrado');

  return {
    stream: bucket.openDownloadStream(_id),
    file: files
  };
}

// Eliminar archivo de GridFS
async function deleteFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  await bucket.delete(new ObjectId(fileId));
}

module.exports = { upload, uploadToGridFS, downloadFromGridFS, deleteFromGridFS };
