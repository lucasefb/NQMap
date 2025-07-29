import Supercluster from 'supercluster';
import RBush from 'rbush';

export function generateAllCellsArray(cachedData) {
  return [
    ...cachedData.cells2G.banda850,
    ...cachedData.cells2G.banda1900,
    ...cachedData.cells3G.banda850,
    ...cachedData.cells3G.banda1900,
    ...cachedData.cells4G.banda700,
    ...cachedData.cells4G.banda1900,
    ...cachedData.cells4G.banda2100,
    ...cachedData.cells4G.banda2600,
    ...cachedData.cells5G.banda3500,
    ...cachedData.cells5G.bandaN257,
    ...cachedData.BDACells.bdas,
    ...cachedData.BDACells.quatra,
  ];
}

export function applyLoadToCells(cells4G, loadData, bandasMap) {
  loadData.forEach(([cellName, banda, load, desbalanceo, prb]) => {
    const bandaKey = bandasMap[String(banda).trim()];
    const targetBandArray = cells4G[bandaKey];

    if (targetBandArray) {
      const cellEntry = targetBandArray.find(entry => entry[3] === cellName);
      if (cellEntry) {
        cellEntry[cellEntry.length - 3] = load;
        cellEntry[cellEntry.length - 2] = desbalanceo;
        cellEntry[cellEntry.length - 1] = prb;
      }
    }
  });
}

export function fillMissingInfo(cells4G, bandasMap) {
  Object.values(bandasMap).forEach(bandaKey => {
    const bandArray = cells4G[bandaKey];
    if (bandArray) {
      bandArray.forEach(row => {
        if (row[row.length - 1] === "0") {
          row[row.length - 1] = "Sin informacion";
          row[row.length - 2] = "Sin informacion";
          row[row.length - 3] = "Sin informacion";
        }
      });
    } else {
      console.error(`${bandaKey} no está definido en cells4G`);
    }
  });
}

export function buildCellsByNombre(allCellsAllInfo) {
  return Object.fromEntries(
    allCellsAllInfo
      .filter(cell => cell.nombre)
      .map(cell => [cell.nombre.trim().toUpperCase(), cell])
  );
}

export function buildSupercluster(allCellsAllInfo) {
  const solutionMap = {};
  const rtrees = {};

  allCellsAllInfo.forEach(cell => {
    const solution = cell.solution?.replace(/[\s-]/g, '_').toUpperCase();
    if (!solution) return;
    if (!solutionMap[solution]) {
      solutionMap[solution] = [];
      rtrees[solution] = new RBush();
    }

    const point = {
      minX: cell.lng,
      minY: cell.lat,
      maxX: cell.lng,
      maxY: cell.lat,
      nombre: cell.nombre,
      solution: cell.solution,
      lat: cell.lat,
      lng: cell.lng
    };

    solutionMap[solution].push(point);
    rtrees[solution].insert(point);
  });

  const clustersBySolution = {};

  Object.entries(solutionMap).forEach(([solution, features]) => {
    const supercluster = new Supercluster({ radius: 200, maxZoom: 13 });
    // Hasta zoom 13 se generan clusters, del 14 en adelante se muestran los puntos individuales
    const geojson = features.map(f => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
      properties: { cluster: false, nombre: f.nombre, solution: f.solution }
    }));
    supercluster.load(geojson);
    clustersBySolution[solution] = { supercluster, rtree: rtrees[solution] };
  });

  return clustersBySolution;
}

export function getCellsByBoundsAndBands({
  zoom,
  bounds,
  techFilters,
  bandasFilters = {},
  solutions = [],
  loadCellsWithBigPRB = false
}, cachedData) {
  if (zoom < 14) return [];

  const { neLat, neLng, swLat, swLng } = bounds;
  const techMap = {
    '2G': cachedData.cells2G,
    '3G': cachedData.cells3G,
    '4G': cachedData.cells4G,
    '5G': cachedData.cells5G
  };

  const result = [];
  const highLoadSet = new Set(); // para evitar duplicados

  for (const [tech, bandas] of Object.entries(techMap)) {
    if (!bandas) continue;

    for (const [bandaKey, cells] of Object.entries(bandas)) {
      const bandaLimpia = bandaKey.replace('banda', '');

      for (const cell of cells) {
        const lat = parseFloat(cell[1]);
        const lng = parseFloat(cell[2]);
        const nombre = cell[3];
        const azimuth = cell[4];
        const banda = cell[5];
        const tecnologia = cell[6];
        const solution = cell[7];
        const load = cell[8];
        const desbalanceo = cell[9] || 'N/A';
        const prb = cell[10] || 'N/A';

        const dentroDeLimites = !isNaN(lat) && !isNaN(lng) &&
          lat >= swLat && lat <= neLat &&
          lng >= swLng && lng <= neLng;

        const solucionValida = solutions.length === 0 || solutions.includes(solution);
        const bandaActiva = techFilters.includes(tech) && bandasFilters[tech]?.includes(bandaLimpia);

        const marker = {
          nombre,
          lat,
          lng,
          azimuth,
          banda,
          tecnologia,
          tipo: tech,
          solution,
          load: load || 'N/A',
          desbalanceo,
          prb
        };

        // Si cumple los filtros de banda, lo agregamos
        if (dentroDeLimites && solucionValida && bandaActiva) {
          result.push(marker);
          highLoadSet.add(nombre); // para evitar duplicados
        }

        // Si está marcado load === 1 y el flag está activo, lo agregamos aunque no pase los filtros
        if (loadCellsWithBigPRB && load === 1 && dentroDeLimites && solucionValida && !highLoadSet.has(nombre)) {
          result.push(marker);
          highLoadSet.add(nombre);
        }
      }
    }
  }

  return result;
}