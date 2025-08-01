import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';
dotenv.config();

let cachedKmzData = {};
let cachedOverlays = [];

export async function updateKmzCache(extractedBasePath) {
  // Detect environment (local or prod) and build KMZ list accordingly
  const APP_ENV = process.env.APP_ENV;

  // List with every available KMZ file
  const allKmzFiles = [
    'LTE RSRP AMBA.kmz',
    'LTE RSRP BLAP.kmz',
    'LTE RSRP CUYO.kmz',
    'LTE RSRP LINO.kmz',
    'LTE RSRP LISU.kmz',
    'LTE RSRP MEDI.kmz',
    'LTE RSRP NOA.kmz',
    'LTE RSRP PAT1.kmz',
    'LTE RSRP PAT2.kmz',
    'LTE RSRP PY.kmz',
    'LTE RSRP UY.kmz',
    'LTE RSRQ AMBA.kmz',
    'LTE RSRQ BLAP.kmz',
    'LTE RSRQ CUYO.kmz',
    'LTE RSRQ LINO.kmz',
    'LTE RSRQ LISU.kmz',
    'LTE RSRQ MEDI.kmz',
    'LTE RSRQ NOA.kmz',
    'LTE RSRQ PAT1.kmz',
    'LTE RSRQ PAT2.kmz',
    'LTE RSRQ PY.kmz',
    'LTE RSRQ UY.kmz',
    'LTE  Avg_TH_DL AMBA.kmz',
    'LTE  Avg_TH_DL BLAP.kmz',
    'LTE  Avg_TH_DL CUYO.kmz',
    'LTE  Avg_TH_DL LINO.kmz',
    'LTE  Avg_TH_DL LISU.kmz',
    'LTE  Avg_TH_DL MEDI.kmz',
    'LTE  Avg_TH_DL NOA.kmz',
    'LTE  Avg_TH_DL PAT1.kmz',
    'LTE  Avg_TH_DL PAT2.kmz',
    'LTE  Avg_TH_DL Uy.kmz',
    'LTE  Avg_TH_DL Py.kmz'
  ];

  // In local mode keep only AMBA and MEDI regions
  const kmzFiles = APP_ENV === 'local'
    ? allKmzFiles.filter(name => /(AMBA|MEDI)\.kmz$/i.test(name))
    : allKmzFiles;

  // Resolve BASE_DIR according to APP_ENV (expects BASE_DIR_LOCAL / BASE_DIR_PROD in .env)
  const baseDirKey = `BASE_DIR_${APP_ENV ? APP_ENV.toUpperCase() : 'PROD'}`;
  const baseDir = process.env[baseDirKey];
  console.log('APP_ENV:', APP_ENV);
  console.log('BASE_DIR usado:', baseDir);
  if (!baseDir) {
    throw new Error(`BASE_DIR no definido para la clave ${baseDirKey} en .env`);
  }
  console.log(`🔍 Buscando archivos KMZ en: ${baseDir}`);

  for (const kmzFile of kmzFiles) {
    try {
      const filePath = path.join(baseDir, kmzFile);
      console.log(`\n📁 Procesando archivo: ${kmzFile}`);

      if (!fs.existsSync(filePath)) {
        console.warn(`❌ No existe el archivo: ${filePath}`);
        continue;
      }

      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        console.warn(`⚠️ No es un archivo válido (posiblemente carpeta): ${filePath}`);
        continue;
      }

      console.log(`📦 Abriendo KMZ (ZIP): ${filePath}`);
      const zip = new AdmZip(filePath);

      const kmzExtractPath = path.join(extractedBasePath, path.basename(kmzFile, '.kmz'));
      if (fs.existsSync(kmzExtractPath)) {
        console.log(`🧹 Borrando carpeta anterior: ${kmzExtractPath}`);
        fs.rmSync(kmzExtractPath, { recursive: true });
      }

      console.log(`📂 Creando carpeta: ${kmzExtractPath}`);
      fs.mkdirSync(kmzExtractPath);

      console.log(`📤 Extrayendo KMZ...`);
      zip.extractAllTo(kmzExtractPath, true);

      const kmlFile = path.join(kmzExtractPath, 'doc.kml');
      console.log(`🔎 Buscando archivo KML: ${kmlFile}`);
      if (!fs.existsSync(kmlFile)) {
        console.warn(`❌ No se encontró doc.kml dentro de ${kmzExtractPath}`);
        continue;
      }

      console.log(`📖 Leyendo contenido de doc.kml`);
      let content = fs.readFileSync(kmlFile, 'utf-8');

      console.log(`✏️ Corrigiendo rutas relativas en <href>`);
      content = content.replace(/<href>(.*?)<\/href>/g, (_, href) => {
        const defaultLocal = process.env.API_BASE_URL_LOCAL || 'http://localhost:3000';
        const baseUrl = process.env.APP_ENV === 'prod' ? (process.env.API_BASE_URL_PROD || '') : defaultLocal;
        const prefix = baseUrl;
        return `<href>${prefix}/extracted/${path.basename(kmzExtractPath)}/${href}</href>`;
      });

      // Parse KML to extract overlays (GroundOverlay)
      let overlays = [];
      try {
        const kmlObj = await parseStringPromise(content, { explicitArray: false });
        // Find all GroundOverlay elements (can be nested)
        const findGroundOverlays = (node) => {
          if (!node || typeof node !== 'object') return [];
          let list = [];
          if (node.GroundOverlay) {
            list = list.concat(Array.isArray(node.GroundOverlay) ? node.GroundOverlay : [node.GroundOverlay]);
          }
          for (const key of Object.keys(node)) {
            list = list.concat(findGroundOverlays(node[key]));
          }
          return list;
        };
        const groundOverlays = findGroundOverlays(kmlObj);
        overlays = groundOverlays.map(go => {
          const href = go.Icon?.href || go.Icon?.[0]?.href;
          const box = go.LatLonBox || go.latLonBox;
          if (!href || !box) return null;
          const south = parseFloat(box.south || box.South || (box[0]?.south));
          const west = parseFloat(box.west || box.West || (box[0]?.west));
          const north = parseFloat(box.north || box.North || (box[0]?.north));
          const east = parseFloat(box.east || box.East || (box[0]?.east));
          return {
            key: kmzFile,
            imageUrl: href,
            bounds: [south, west, north, east]
          };
        }).filter(Boolean);
      } catch(err) {
        console.error('Error parsing KML for overlays', err);
      }

      cachedKmzData[kmzFile] = {
        kmzJson: content,
        overlays,
        lastUpdated: new Date()
      };
      cachedOverlays = cachedOverlays.concat(overlays);
      // Log primeras 3 imágenes para depuración
      overlays.slice(0,3).forEach(o=>console.log('↪ img', o.imageUrl));

      console.log(`✅ KMZ cargado exitosamente: ${kmzFile}`);
    } catch (err) {
      console.error(`🔥 Error cargando ${kmzFile}:`, err);
    }
  }

  console.log('\n📊 Resultado final del cache KMZ:');
  console.log(Object.keys(cachedKmzData));
}

export function getAllOverlays() {
  return cachedOverlays;
}

export function getKmzData(filename) {
  return cachedKmzData[filename];
}
