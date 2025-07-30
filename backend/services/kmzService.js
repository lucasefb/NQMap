import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';
dotenv.config();

let cachedKmzData = {};
// Lista global de overlays de cobertura 4G simplificados
let coverageOverlays = [];

export async function updateKmzCache(extractedBasePath) {
  // Reiniciar lista de overlays cada vez que se regenere
  coverageOverlays = [];
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
        return `<href>/extracted/${path.basename(kmzExtractPath)}/${href}</href>`;
      });

      // Guardar KML corregido en cache
      cachedKmzData[kmzFile] = {
        kmzJson: content,
        lastUpdated: new Date()
      };

      // ---- Extraer overlays para render Canvas ----
      try {
        const parsed = await parseStringPromise(content);
        // Buscar GroundOverlay en cualquier nivel del KML
        const groundOverlays = [];
        (function recurse(node) {
          if (!node || typeof node !== 'object') return;
          if (node.GroundOverlay) {
            groundOverlays.push(...node.GroundOverlay);
          }
          for (const key of Object.keys(node)) {
            const child = node[key];
            if (Array.isArray(child)) {
              child.forEach(recurse);
            } else {
              recurse(child);
            }
          }
        })(parsed);
        console.log(`[KMZ] ${kmzFile} -> GroundOverlay encontrados: ${groundOverlays.length}`);
        console.log(`[KMZ] ${kmzFile} -> GroundOverlay encontrados: ${groundOverlays.length}`);
        for (const go of groundOverlays) {
          const hrefFixed = go.Icon?.[0]?.href?.[0]; // ya incluye /extracted/<carpeta>
          const latLonBox = go.LatLonBox?.[0] || {};
          if (!hrefFixed || !latLonBox.north) continue;
          const defaultLocal = 'http://localhost:3000';
          const baseUrl = process.env.APP_ENV === 'prod' ? process.env.API_BASE_URL_PROD : (process.env.API_BASE_URL_LOCAL || defaultLocal);
          const imageUrl = `${baseUrl}${hrefFixed}`;
          
          coverageOverlays.push({
            key: kmzFile,
            imageUrl,
            bounds: [
              parseFloat(latLonBox.south?.[0]),
              parseFloat(latLonBox.west?.[0]),
              parseFloat(latLonBox.north?.[0]),
              parseFloat(latLonBox.east?.[0])
            ]
          });
        }
      } catch (xmlErr) {
        console.warn(`⚠️ No se pudieron extraer overlays de ${kmzFile}:`, xmlErr?.message);
      }

      console.log(`✅ KMZ cargado exitosamente: ${kmzFile}`);
    } catch (err) {
      console.error(`🔥 Error cargando ${kmzFile}:`, err);
    }
  }

  console.log(`[KMZ] TOTAL overlays cargados: ${coverageOverlays.length}`);
  console.log('\n📊 Resultado final del cache KMZ:');
  console.log(Object.keys(cachedKmzData));
}

export function getKmzData(filename) {
  return cachedKmzData[filename];
}

export function getCoverageOverlays() {
  return coverageOverlays;
}