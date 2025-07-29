export default {
  async fetchMarkers() {
    if (!this.mapInstance) {
      console.log('fetchMarkers evitado por falta de mapInstance');
      return;
    }

    this.zoom = this.mapInstance.getZoom();
    const bounds = this.mapInstance.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const activeSolutions = Object.entries(this.filterForSolution)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(',');
    try {
      const response = await this.$axios.$get('/api/cellsByBounds', {
        params: {
          neLat: ne.lat,
          neLng: ne.lng,
          swLat: sw.lat,
          swLng: sw.lng,
          zoom: this.zoom,
          solutions: activeSolutions,
        }
      });

      this.markersForAllCells = response.map(item => {
        if (!item?.geometry?.coordinates || !item?.properties) return null;

        const [lng, lat] = item.geometry.coordinates;

        if (item.properties.cluster) {
          return {
            isCluster: true,
            cluster_id: item.properties.cluster_id,
            nombre: item.properties.nombre,
            lat,
            lng,
            count: item.properties.point_count,
            solution: item.properties.solution,
          };
        } else {
          return {
            isCluster: false,
            nombre: item.properties.nombre,
            lat,
            lng,
            solution: item.properties.solution,
          };
        }
      }).filter(Boolean);

    } catch (error) {
      console.error('Error fetching clustered markers:', error);
    }
  },

  async fetchBandsMarkers() {
    if (!this.mapInstance || this.zoom < 14) return;
    const bounds = this.mapInstance.getBounds();
    const techFilters = [];
    const bandasFilters = {};

    for (const tech of ['2G', '3G', '4G', '5G']) {
      const filterKey = `filter${tech}`;
      const bandasObj = this.filterForTechnology[filterKey];
      if (!bandasObj) continue;

      const bandasActivas = Object.entries(bandasObj)
        .filter(([_, checked]) => checked)
        .map(([band]) => band.replace('banda', ''));

      if (bandasActivas.length > 0) {
        techFilters.push(tech);
        bandasFilters[tech] = bandasActivas;
      }
    }

    const activeSolutions = Object.entries(this.filterForSolution)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    const noBandasActivas = techFilters.length === 0;
    const noSolutionsActivas = activeSolutions.length === 0;

    // ⚠️ Solo cancelar si no hay soluciones Y NO estamos mostrando por carga alta
    if ((noBandasActivas && !this.loadCellsWithBigPRB) || noSolutionsActivas) {
      this.bandsMarkers = [];
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/bandsByBounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoom: this.zoom,
          bounds: {
            neLat: bounds.getNorthEast().lat,
            neLng: bounds.getNorthEast().lng,
            swLat: bounds.getSouthWest().lat,
            swLng: bounds.getSouthWest().lng
          },
          techFilters,
          bandasFilters,
          solutions: activeSolutions,
          loadCellsWithBigPRB: this.loadCellsWithBigPRB
        })
      });

      const data = await response.json();

      this.bandsMarkers = data;

    } catch (error) {
      console.error('Error fetching bands markers:', error);
    }
  },

  async fetchPreOriginMarkers() {
    if (!this.mapInstance || this.zoom < 12) {
      console.log('fetchPreOriginMarkers evitado (sin mapa o zoom bajo)');
      return;
    }

    const activeTypes = Object.entries(this.filterForPreOrigin)
      .filter(([_, isActive]) => isActive)
      .map(([key]) => key);

    if (activeTypes.length === 0) {
      console.log('fetchPreOriginMarkers: sin filtros activos');
      this.preOriginMarkers = [];
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/preorigin');
      const rawData = await response.json();

      // 👇 Mapeo explícito de filtro frontend → clave backend
      const mapping = {
        Nuevo_Sitio: 'nuevoSitio',
        Nuevo_Anillo: 'nuevoAnillo',
        Expansion_LTE: 'expansionLTE',
        Expansion_NR: 'expansionNR',
        Nuevo_Sector: 'nuevoSector',
        Expansion_Multiplexacion: 'expansionMultiplexacion',
        Punto_de_Interes_Indoor: 'puntoDeInteresIndoor',
      };

      const normalized = [];

      for (const typeKey of activeTypes) {
        const apiKey = mapping[typeKey];
        if (!apiKey || !Array.isArray(rawData[apiKey])) continue;

        rawData[apiKey].forEach(([_, lat, lng, sitio, fecha, descripcion]) => {
          normalized.push({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            tipo: typeKey, // ← mantiene el mismo nombre que los filtros
            sitio,
            fecha,
            descripcion,
          });
        });
      }

      console.log('[PREORIGIN FILTERS]', this.filterForPreOrigin);
      console.log('[PREORIGIN DATA]', normalized.slice(0, 5));

      this.preOriginMarkers = normalized;
    } catch (error) {
      console.error('Error en fetchPreOriginMarkers:', error);
    }
  },

async fetchRFPlansMarkers(filtrosPlanes = []) {
    console.log('[RF PLANS] Ejecutando fetchRFPlansMarkers...');
    console.log('[RF PLANS] Filtros activos:', filtrosPlanes);

    try {
      let url = 'http://localhost:3000/api/planesrf';
      if (filtrosPlanes.length) {
        url += '?planes=' + filtrosPlanes.join(',');
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al obtener planes RF');

      const rawData = await res.json();
      console.log('[RF PLANS] Respuesta cruda:', rawData.slice(0, 5));

      const normalized = [];

      for (const arr of rawData) {
        if (!Array.isArray(arr) || arr.length < 3) continue;

        const [_, lat, lng, nombre, fecha, descripcion] = arr;

        if (!lat || !lng) continue;

        normalized.push({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          nombre,
          fecha,
          descripcion
        });
      }

      console.log('[RF PLANS] Datos normalizados:', normalized.slice(0, 5));
      console.log('[RF PLANS] Total de markers RF:', normalized.length);

      return normalized;
    } catch (err) {
      console.error('❌ Error en fetchRFPlansMarkers:', err);
      return [];
    }
  }

};

