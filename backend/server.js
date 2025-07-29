import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cellRoutes from './routes/cellRoutes.js';
import { updateCache } from './services/cacheUpdater.js';
import { updateKmzCache, getKmzData } from './services/kmzService.js';

// Cargar .env
dotenv.config();

// Obtener entorno (local o prod)
const env = process.env.APP_ENV;

// Cargar variables de entorno según APP_ENV
const PORT = env === 'prod' ? process.env.PORT_PROD : process.env.PORT_LOCAL;
const FRONTEND_ORIGIN = env === 'prod' ? process.env.FRONTEND_ORIGIN_PROD : process.env.FRONTEND_ORIGIN_LOCAL;

const app = express();

// Resolver __dirname en ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware para JSON
app.use(express.json());

// CORS
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

// Ruta de archivos KMZ extraídos
const extractedPath = path.join(__dirname, 'extracted');
app.use('/extracted', express.static(extractedPath));

// Inicializar caché periódicamente (cada 24h)
const ONE_DAY = 24 * 60 * 60 * 1000;
setInterval(updateCache, ONE_DAY);
setInterval(() => updateKmzCache(extractedPath), ONE_DAY);

// Cargar caché al iniciar
updateCache().then(() => {
  console.log('✅ Cache inicial cargado');
}).catch(err => {
  console.error('❌ Error al cargar cache inicial:', err);
});

updateKmzCache(extractedPath).then(() => {
  console.log('✅ KMZ cache inicial cargado');
}).catch(err => {
  console.error('❌ Error al cargar KMZ cache inicial:', err);
});

// Rutas principales
app.use('/api', cellRoutes);

// Endpoint para obtener contenido KMZ procesado
app.get('/api/get-kmz/:filename', (req, res) => {
  const filename = req.params.filename;
  const kmzEntry = getKmzData(filename);
  if (!kmzEntry) {
    console.warn(`⚠️ KMZ "${filename}" no encontrado en memoria.`);
    return res.status(404).json({ error: 'KMZ no encontrado' });
  }
  res.json({ kml: kmzEntry.kmzJson });
});

// Levantar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT} [env: ${env}]`);
});
