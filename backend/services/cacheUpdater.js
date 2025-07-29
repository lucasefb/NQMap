import oracledb from 'oracledb';
import { queries } from './queries.js';
import { dbTableau, dbRemedy, dbUCALSERV, dbReportesSm3 } from '../config/dbConfig.js';
import { applyLoadToCells, fillMissingInfo, generateAllCellsArray, buildCellsByNombre, buildSupercluster } from './cacheUtils.js';

let cachedData = {
  allCellsAllInfo: null,
  preOrigin: {
    nuevoSector: null,
    nuevoSitio: null,
    nuevoAnillo: null,
    expansionLTE: null,
    expansionNR: null,
    expansionMultiplexacion: null,
    puntoDeInteresIndoor: null,
  },
  planesRF: null,
  sitios: {
    allSites: null,
    gsm: {
      banda850: null,
      banda1900: null,
    },
    umts: {
      banda850: null,
      banda1900: null,
    },
    lte: {
      banda700: null,
      banda1900: null,
      banda2600: null,
      banda2100: null,
    },
    nr: {
      banda3500: null,
      bandaN257: null,
    },
    bda: {
      bdas: null,
      quatra: null,
    },
  },
  loadLTE: null,
  lastUpdated: null
};

async function updateCache() {

  let connectionAllCells;
  let connectionRemedy;
  let connectionUCALSERV;
  let connectionReportesSm3;

  try {
    connectionAllCells = await oracledb.getConnection(dbTableau);           // Sitios y celdas
    connectionRemedy = await oracledb.getConnection(dbRemedy);              // Pre Origin
    connectionUCALSERV = await oracledb.getConnection(dbUCALSERV);          // Planes RF
    connectionReportesSm3 = await oracledb.getConnection(dbReportesSm3);    // LOAD LTE

    const planesRFPromise = connectionUCALSERV.execute(queries.planesRF);

    const loadLTEPromise = connectionReportesSm3.execute(queries.loadLTE);

    const preOriginPromises = Object.entries(queries.preOrigin).map(([key, query]) =>
      connectionRemedy.execute(query).then(res => [key, res.rows]));

    const bdaPromises = Object.entries(queries.sitios.bda).map(([tipo, query]) =>
      connectionAllCells.execute(query).then(res => [tipo, res.rows]));

    const sitiosPromises = [];
    for (const [tech, bandas] of Object.entries({
      cells2G: queries.sitios.gsm,
      cells3G: queries.sitios.umts,
      cells4G: queries.sitios.lte,
      cells5G: queries.sitios.nr
    })) {
      for (const [banda, query] of Object.entries(bandas)) {
        sitiosPromises.push(
          connectionAllCells.execute(query).then(res => {
            const data = tech === 'cells4G' ? res.rows.map(row => [...row, "0", "0", "0"]) : res.rows;
            return [tech, banda, data];
          })
        );
      }
    }

    const [
      planesRFResult,
      loadLTEResult,
      preOriginResults,
      bdaResults,
      sitiosResults,
    ] = await Promise.all([
      planesRFPromise,
      loadLTEPromise,
      Promise.all(preOriginPromises),
      Promise.all(bdaPromises),
      Promise.all(sitiosPromises),
    ]);

    cachedData.planesRF = planesRFResult.rows;
    cachedData.loadLTE = loadLTEResult.rows;
    cachedData.preOrigin = Object.fromEntries(preOriginResults);
    cachedData.BDACells = Object.fromEntries(bdaResults);

    for (const [tech, banda, rows] of sitiosResults) {
      if (!cachedData[tech]) cachedData[tech] = {};
      cachedData[tech][banda] = rows;
    }

    const bandasMap = {
      '700': 'banda700',
      '1900': 'banda1900',
      '2100': 'banda2100',
      '2600': 'banda2600',
    };

    cachedData.allCellsAllInfo = (await connectionAllCells.execute(queries.sitios.allSites)).rows.map(row => {
      const siteName = row[0]?.trim().toUpperCase() || '';
      return {
        nombre: siteName,
        lat: isNaN(parseFloat(row[1])) ? null : parseFloat(row[1]),
        lng: isNaN(parseFloat(row[2])) ? null : parseFloat(row[2]),
        solution: row[3],
      };
    });

    cachedData.allCellsArrays = generateAllCellsArray(cachedData);
    applyLoadToCells(cachedData.cells4G, cachedData.loadLTE, bandasMap);
    fillMissingInfo(cachedData.cells4G, bandasMap);
    cachedData.cellsByNombre = buildCellsByNombre(cachedData.allCellsAllInfo);
    cachedData.superCluster = buildSupercluster(cachedData.allCellsAllInfo);

    cachedData.lastUpdated = new Date();
    console.log('🔄 Cache actualizado correctamente');
  } catch (err) {
    console.error('Error al actualizar el cache:', err);
  } finally {
    for (const conn of [
      { name: 'Tableau SMART 2', ref: connectionAllCells },
      { name: 'Remedy', ref: connectionRemedy },
      { name: 'UCALSERV', ref: connectionUCALSERV },
      { name: 'Reportes SMART 3', ref: connectionReportesSm3 }
    ]) {
      if (conn.ref) {
        try {
          await conn.ref.close();
        } catch (err) {
          console.error(`Error closing connection (${conn.name}):`, err);
        }
      }
    }
  }
}

export { updateCache, cachedData };