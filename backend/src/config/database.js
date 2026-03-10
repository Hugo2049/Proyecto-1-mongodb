const { MongoClient, GridFSBucket } = require('mongodb');

let client;
let db;
let gridFSBucket;

async function connectDB() {
  try {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(process.env.DB_NAME);
    gridFSBucket = new GridFSBucket(db, { bucketName: 'uploads' });

    // Configurar para rechazar consultas sin índice (notablescan)
    // Nota: En Atlas Free/Shared esto puede no estar disponible,
    // se valida con explain() en su lugar
    try {
      await db.admin().command({ setParameter: 1, notablescan: 1 });
      console.log('notablescan habilitado: consultas sin índice serán rechazadas');
    } catch (err) {
      console.log('Nota: notablescan no disponible en este tier de Atlas. Se validará con explain().');
    }

    console.log('Conectado a MongoDB Atlas exitosamente');
    return db;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
}

function getDB() {
  if (!db) throw new Error('Base de datos no inicializada. Llama a connectDB() primero.');
  return db;
}

function getClient() {
  if (!client) throw new Error('Cliente no inicializado.');
  return client;
}

function getGridFSBucket() {
  if (!gridFSBucket) throw new Error('GridFS no inicializado.');
  return gridFSBucket;
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

module.exports = { connectDB, getDB, getClient, getGridFSBucket, closeDB };
