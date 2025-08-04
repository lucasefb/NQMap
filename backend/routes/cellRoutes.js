import express from 'express';
import fs from 'fs';
import path from 'path';
import { updateCache, cachedData } from '../services/cacheUpdater.js';
import { getCellsByBoundsAndBands } from '../services/cacheUtils.js';

const router = express.Router();

const ensureCache = async (req, res, next) => {
  if (!cachedData.lastUpdated) {
    await updateCache();
  }
  next();
};

router.get('/coordinatesOfOneCell', ensureCache, async (req, res) => {
  try {
    const query = req.query.query?.toString().trim().toUpperCase();

    if (!query) { return res.status(400).json({ error: 'Falta el parámetro "query"' }); }
    if (!cachedData.cellsByNombre) {
      return res.status(503).json({ error: 'Cache no listo, intente nuevamente.' });
    }
    const cell = cachedData.cellsByNombre[query];

    if (!cell) {
      console.log('No se encontró el sitio:', query);
      return res.json([]);
    }

    return res.json([{ LATITUD: cell.lat, LONGITUD: cell.lng }]);
  } catch (error) {
    console.error('Error al obtener coordenadas:', error);
    return res.status(500).json({ error: 'Error al obtener coordenadas' });
  }
});

router.get('/cellsByBounds', ensureCache, (req, res) => {
  try {
    const { neLat, neLng, swLat, swLng, zoom, solutions } = req.query;
    const tiposSolucion = (solutions || '').split(',').map(s => s.trim().toUpperCase());

    let allClusters = [];

    tiposSolucion.forEach(tipo => {
      const solutionEntry = cachedData.superCluster[tipo];
      if (!solutionEntry) return;

      const { supercluster, rtree } = solutionEntry;
      const parsedZoom = parseInt(zoom);

      if (parsedZoom >= 14) {
        // Nivel alto de zoom: devolver puntos individuales con R-tree
        const bbox = {
          minX: parseFloat(swLng),
          minY: parseFloat(swLat),
          maxX: parseFloat(neLng),
          maxY: parseFloat(neLat),
        };

        const points = rtree.search(bbox).map(p => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.lng, p.lat],
          },
          properties: {
            cluster: false,
            nombre: p.nombre,
            solution: p.solution,
          },
        }));

        allClusters = allClusters.concat(points);
      } else {
        // Zoom bajo o medio: devolver clusters con Supercluster
        const clusters = supercluster.getClusters([
          parseFloat(swLng),
          parseFloat(swLat),
          parseFloat(neLng),
          parseFloat(neLat),
        ], parsedZoom).map(cluster => {
          if (cluster.properties.cluster) {
            cluster.properties.solution = tipo;
            return cluster;
          } else {
            // Clúster artificial de 1 punto
            return {
              type: 'Feature',
              geometry: cluster.geometry,
              properties: {
                cluster: true,
                cluster_id: `single-${cluster.geometry.coordinates[0]}-${cluster.geometry.coordinates[1]}`,
                point_count: 1,
                nombre: cluster.properties.nombre,
                solution: tipo,
                isArtificial: true
              },
            };
          }
        });
        allClusters = allClusters.concat(clusters);
      }
    });


    // Forzar estructura GeoJSON para todos los elementos
    const geojsonFeatures = allClusters.map(item => {
      if (item && item.type === 'Feature' && item.geometry && item.properties) return item;
      if (item && item.lat !== undefined && item.lng !== undefined) {
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
          properties: { ...item }
        };
      }
      return item;
    });
    res.json(geojsonFeatures);
  } catch (err) {
    console.error('Error in /cellsByBounds:', err);
    res.status(500).json({ error: 'Error processing clusters' });
  }
});

router.post('/bandsByBounds', ensureCache, (req, res) => {
  const { zoom, bounds, techFilters, bandasFilters, solutions, loadCellsWithBigPRB } = req.body;

  try {
    const markers = getCellsByBoundsAndBands({
      zoom,
      bounds,
      techFilters,
      bandasFilters,
      solutions,
      loadCellsWithBigPRB
    }, cachedData);

    res.json(markers);
  } catch (err) {
    console.error('Error al obtener bandas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/preorigin', ensureCache, (req, res) => {
  try {
    const tiposQuery = req.query.tipos;
    if (!tiposQuery) {
      return res.json(cachedData.preOrigin);
    }

    const tiposSolicitados = tiposQuery.split(',').map(t => t.trim());
    const result = {};

    tiposSolicitados.forEach(tipo => {
      if (cachedData.preOrigin[tipo]) {
        result[tipo] = cachedData.preOrigin[tipo];
      }
    });

    res.json(result);
  } catch (err) {
    console.error('Error en /preorigin con filtro:', err);
    res.status(500).json({ error: 'Error al obtener datos filtrados de Pre-Origin' });
  }
});

router.get('/reclamos', ensureCache, (req, res) => {
  try {
    res.json({ reclamos: cachedData.reclamosNormalizados || [] });
  } catch (err) {
    console.error('Error en /reclamos:', err);
    res.status(500).json({ error: 'Error al obtener reclamos' });
  }
});

router.get('/planesrf', ensureCache, (req, res) => {
  try {
    const planesFilter = req.query.planes;

    if (!planesFilter) {
      return res.json(cachedData.planesRF);
    }

    const planesSolicitados = planesFilter.split(',').map(p => p.trim().toLowerCase());
    const filteredPlanes = cachedData.planesRF.filter(row => {
      const planGeneral = row[3]?.toString().toLowerCase() || ''; 
      return planesSolicitados.includes(planGeneral);
    });

    res.json(filteredPlanes);
  } catch (err) {
    console.error('Error en /planesrf con filtro:', err);
    res.status(500).json({ error: 'Error al obtener datos filtrados de Planes RF' });
  }
});

router.get('/reclamosByBounds', async (req, res) => {
  try {
    const { neLat, neLng, swLat, swLng, tipos } = req.query;
    // Usar reclamosCalidad crudos, no normalizados
    let reclamos = cachedData.reclamosCalidad || [];
    // Filtrar por bounds
    const reclamosFiltrados = reclamos.filter(r => {
      const lat = parseFloat((r[3] || '').toString().replace(',', '.'));
      const lng = parseFloat((r[4] || '').toString().replace(',', '.'));
      return (
        !isNaN(lat) && !isNaN(lng) &&
        lat >= parseFloat(swLat) && lat <= parseFloat(neLat) &&
        lng >= parseFloat(swLng) && lng <= parseFloat(neLng)
      );
    });
    // Filtrar por tipo si corresponde
    let tiposArr = [];
    if (tipos) {
      tiposArr = tipos.split(',').map(t => t.trim().toUpperCase());
    }
    const reclamosTipo = tiposArr.length > 0
      ? reclamosFiltrados.filter(r => tiposArr.includes((r[8] || '').toUpperCase()))
      : reclamosFiltrados;
    // Devolver como features GeoJSON
    // Armar mapa de acciones por ID para lookup rápido
    const accionesRaw = cachedData.reclamosAcciones || [];
    const accionesPorReclamo = {};
    for (const row of accionesRaw) {
      const id = String(row[0]).trim();
      if (!accionesPorReclamo[id]) accionesPorReclamo[id] = [];
      accionesPorReclamo[id].push({
        tipo_tarea: row[4],
        estado: row[3],
        descripcion: row[7]
      });
    }

    const features = reclamosTipo.map(r => {
      const lat = parseFloat((r[3] || '').toString().replace(',', '.'));
      const lng = parseFloat((r[4] || '').toString().replace(',', '.'));
      const idStr = String(r[0]).trim();
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          ID: r[0],
          ESTADO: r[1],
          RECLAMANTE: r[2],
          LATITUD: lat,
          LONGITUD: lng,
          FECHA_CREACION: r[5],
          FECHA_RECLAMO: r[6],
          NOMBRE_REFERENCIAL: r[7],
          TIPO_RECLAMO: r[8],
          DESCRIPCION: r[9],
          tipo_reclamo: r[8],
          acciones: accionesPorReclamo[idStr] || []
        }
      };
    });
    res.json(features);
  } catch (err) {
    console.error('Error en /reclamosByBounds:', err);
    res.status(500).json({ error: 'Error obteniendo reclamos por bounds' });
  }
});

router.get('/coverage4g-python', (req, res) => {
  try {
    
    // Ruta al archivo JSON generado por el script de Python
    const overlaysFilePath = path.join(process.cwd(), 'extracted', 'coverage_overlays.json');
    
    if (!fs.existsSync(overlaysFilePath)) {
      console.warn('Archivo de overlays no encontrado:', overlaysFilePath);
      return res.json([]);
    }
    
    const overlaysData = JSON.parse(fs.readFileSync(overlaysFilePath, 'utf-8'));
    
    // Ajustar URLs según el entorno
    const APP_ENV = process.env.APP_ENV;
    const defaultLocal = process.env.API_BASE_URL_LOCAL || 'http://localhost:3000';
    const baseUrl = APP_ENV === 'prod' ? (process.env.API_BASE_URL_PROD || '') : defaultLocal;
    
    // Actualizar URLs de imágenes con la URL base correcta
    const adjustedOverlays = overlaysData.map(overlay => ({
      ...overlay,
      imageUrl: overlay.imageUrl.replace('http://localhost:3000', baseUrl)
    }));
    
    console.log(`Sirviendo ${adjustedOverlays.length} overlays procesados por Python`);
    res.json(adjustedOverlays);
    
  } catch (error) {
    console.error('Error sirviendo overlays procesados por Python:', error);
    res.status(500).json({ error: 'Error cargando overlays procesados' });
  }
});

export default router;