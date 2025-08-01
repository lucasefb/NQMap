import oracledb from 'oracledb';
import { queries } from './queries.js';
import {
  dbTableau,
  dbRemedy,
  dbUCALSERV,
  dbReportesSm3,
} from '../config/dbConfig.js';

import {
  applyLoadToCells,
  fillMissingInfo,
  generateAllCellsArray,
  buildCellsByNombre,
  buildSupercluster,
  buildReclamosSupercluster,
} from './cacheUtils.js';

export const cachedData = {
  // Flags de readiness
  sitesReady: false,
  preOriginReady: false,
  planesRFReady: false,
  loadLTEReady: false,
  reclamosReady: false,

  // Datos core
  allCellsAllInfo: null,
  allCellsArrays: null,
  superCluster: null,
  cellsByNombre: null,

  // Sitios y celdas (según tecnología)
  sitios: {
    allSites: null,
    gsm: { banda850: null, banda1900: null },
    umts: { banda850: null, banda1900: null },
    lte: { banda700: null, banda1900: null, banda2100: null, banda2600: null },
    nr: { banda3500: null, bandaN257: null },
    bda: { bdas: null, quatra: null },
  },
  BDACells: null,
  loadLTE: null,
  planesRF: null,
  preOrigin: {
    nuevoSector: null,
    nuevoSitio: null,
    nuevoAnillo: null,
    expansionLTE: null,
    expansionNR: null,
    expansionMultiplexacion: null,
    puntoDeInteresIndoor: null,
  },

  // Reclamos
  reclamosCalidad: null,
  reclamosAcciones: null,
  reclamosNormalizados: null,
  reclamosSuperCluster: null,

  lastUpdated: null,
};

/**
 * Actualiza el cache principal (datos de sitios, celdas, load LTE, etc.).
 * No bloquea la carga de reclamos; estos se disparan de forma asíncrona al final.
 */
export async function updateCache() {
  let connAllCells, connRemedy, connUCAL, connReportes;
  try {
    // 1. Conexiones
    connAllCells = await oracledb.getConnection(dbTableau);
    connRemedy   = await oracledb.getConnection(dbRemedy);
    connUCAL     = await oracledb.getConnection(dbUCALSERV);
    connReportes = await oracledb.getConnection(dbReportesSm3);

    // 2. Promesas paralelas
    const planesRFPromise = connUCAL.execute(queries.planesRF);
    const loadLTEPromise  = connReportes.execute(queries.loadLTE);

    const preOriginPromises = Object.entries(queries.preOrigin).map(([k, q]) =>
      connRemedy.execute(q).then(r => [k, r.rows]),
    );

    const bdaPromises = Object.entries(queries.sitios.bda).map(([k, q]) =>
      connAllCells.execute(q).then(r => [k, r.rows]),
    );

    const sitiosPromises = [];
    for (const [tech, bandas] of Object.entries({
      cells2G: queries.sitios.gsm,
      cells3G: queries.sitios.umts,
      cells4G: queries.sitios.lte,
      cells5G: queries.sitios.nr,
    })) {
      for (const [banda, q] of Object.entries(bandas)) {
        sitiosPromises.push(
          connAllCells.execute(q).then(r => {
            // Para 4G agregamos columnas dummy para load
            const data = tech === 'cells4G' ? r.rows.map(row => [...row, '0', '0', '0']) : r.rows;
            return [tech, banda, data];
          }),
        );
      }
    }

    // 3. Esperar todo
    const [planesRFRes, loadLTERes, preOriginRes, bdaRes, sitiosRes] = await Promise.all([
      planesRFPromise,
      loadLTEPromise,
      Promise.all(preOriginPromises),
      Promise.all(bdaPromises),
      Promise.all(sitiosPromises),
    ]);

    // 4. Poblar cache
    cachedData.planesRF   = planesRFRes.rows;
    cachedData.loadLTE    = loadLTERes.rows;
    cachedData.preOrigin  = Object.fromEntries(preOriginRes);
    cachedData.BDACells   = Object.fromEntries(bdaRes);

    for (const [tech, banda, rows] of sitiosRes) {
      if (!cachedData[tech]) cachedData[tech] = {};
      cachedData[tech][banda] = rows;
    }

    // 5. Post-procesamiento
    const bandasMap = { '700': 'banda700', '1900': 'banda1900', '2100': 'banda2100', '2600': 'banda2600' };

    cachedData.allCellsAllInfo = (await connAllCells.execute(queries.sitios.allSites)).rows.map(r => ({
      nombre: (r[0] || '').trim().toUpperCase(),
      lat: parseFloat(r[1]),
      lng: parseFloat(r[2]),
      solution: r[3],
    }));

    cachedData.allCellsArrays = generateAllCellsArray(cachedData);
    applyLoadToCells(cachedData.cells4G, cachedData.loadLTE, bandasMap);
    fillMissingInfo(cachedData.cells4G, bandasMap);
    cachedData.cellsByNombre = buildCellsByNombre(cachedData.allCellsAllInfo);
    cachedData.superCluster  = buildSupercluster(cachedData.allCellsAllInfo);

    // Flags & timestamp
    cachedData.sitesReady      = true;
    cachedData.preOriginReady  = true;
    cachedData.planesRFReady   = true;
    cachedData.loadLTEReady    = true;
    cachedData.lastUpdated     = new Date();

    
  } catch (e) {
    console.error('❌ Error en updateCache:', e);
  } finally {
    for (const c of [connAllCells, connRemedy, connUCAL, connReportes]) {
      if (c) try { await c.close(); } catch (_) {}
    }
  }

  // Disparar carga de reclamos en segundo plano
  loadReclamos();
}

/**
 * Carga y normaliza reclamos + acciones, luego genera supercluster.
 * Se ejecuta de forma desacoplada para no demorar la carga principal.
 */
async function loadReclamos() {
  let conn;
  try {
    conn = await oracledb.getConnection(dbRemedy);
    const [reclamosRes, accionesRes] = await Promise.all([
      conn.execute(queries.loadReclamosCalidad),
      conn.execute(queries.loadReclamosAcciones),
    ]);

    cachedData.reclamosCalidad   = reclamosRes.rows;
    cachedData.reclamosAcciones  = accionesRes.rows;

    // Acciones por reclamo
    const accionesPorId = {};
    for (const row of accionesRes.rows) {
      const id = String(row[0]).trim();
      (accionesPorId[id] ||= []).push({
        estado: row[3] || 'SIN DATO',
        tipo_tarea: row[4] || 'SIN DATO',
      });
    }

    // Normalizar reclamos
    const reclamosNorm = reclamosRes.rows
      .map(r => {
        const lat = parseFloat(String(r[3]).replace(',', '.'));
        const lng = parseFloat(String(r[4]).replace(',', '.'));
        if (isNaN(lat) || isNaN(lng)) return null;
        const id = String(r[0]).trim();
        return {
          lat,
          lng,
          tipo: (r[8] || '').toUpperCase(),
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
          acciones: accionesPorId[id] || [],
        };
      })
      .filter(Boolean);

    cachedData.reclamosNormalizados = reclamosNorm;
    cachedData.reclamosSuperCluster = buildReclamosSupercluster(reclamosNorm);
    cachedData.reclamosReady = true;

    
  } catch (e) {
    console.error('❌ Error cargando reclamos:', e);
  } finally {
    if (conn) try { await conn.close(); } catch (_) {}
  }
}

// Export default (compatibilidad)
export default { updateCache, cachedData };