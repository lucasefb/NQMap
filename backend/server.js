import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cellRoutes from './routes/cellRoutes.js';
import { updateCache } from './services/cacheUpdater.js';

dotenv.config();
const env = process.env.APP_ENV;

const PORT = env === 'prod' ? process.env.PORT_PROD : process.env.PORT_LOCAL;
const FRONTEND_ORIGIN = env === 'prod' ? process.env.FRONTEND_ORIGIN_PROD : process.env.FRONTEND_ORIGIN_LOCAL;

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

const extractedPath = path.join(__dirname, 'extracted');
app.use('/extracted', express.static(extractedPath));

const ONE_DAY = 24 * 60 * 60 * 1000;
setInterval(updateCache, ONE_DAY);

updateCache().then(() => {
  console.log('✅ Cache inicial cargado');
}).catch(err => {
  console.error('❌ Error al cargar cache inicial:', err);
});

app.use('/api', cellRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT} [env: ${env}]`);
});