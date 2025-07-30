const API_BASE_URL = process.env.API_BASE_URL;
 
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
      const params = {
        neLat: ne.lat,
        neLng: ne.lng,
        swLat: sw.lat,
        swLng: sw.lng,
        zoom: this.zoom,
        solutions: activeSolutions,
      };
      const response = await this.$axios.$get('/api/cellsByBounds', { params });


      const normalizedMarkers = response.map(item => {
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
      console.log('[CLUSTER-DEBUG] Markers normalizados:', normalizedMarkers.slice(0,5));

      // --- Chequeo de duplicados en markers normalizados ---
      const keySet = new Set();
      const duplicates = [];
      for (const marker of normalizedMarkers) {
        // Clave simplificada: cluster_id|lat|lng|solution|count (si aplica)
        let key;
        if (marker.isCluster) {
          key = [marker.cluster_id, marker.lat, marker.lng, marker.solution, marker.count].join('|');
        } else {
          key = [marker.nombre, marker.lat, marker.lng, marker.solution].join('|');
        }
        if (keySet.has(key)) {
          duplicates.push({ key, marker });
        } else {
          keySet.add(key);
        }
      }
      if (duplicates.length > 0) {
        console.warn('[FetchMarkers] Duplicados detectados en markers normalizados:', duplicates);
        // Log detallado de los objetos duplicados
        duplicates.forEach(dup => {
          const dups = normalizedMarkers.filter(m => (m.isCluster ? `cluster_${m.cluster_id}_${m.solution}` : `site_${m.nombre}_${m.lat}_${m.lng}_${m.solution}`) === dup.key);
          console.warn(`[FetchMarkers] Objetos duplicados para key '${dup.key}':`, dups);
        });
      } else {
        console.log('[CLUSTER-DEBUG] No se detectaron claves duplicadas en markers normalizados.');
      }
      this.markersForAllCells = [];
      this.markersForAllCells = normalizedMarkers;
      console.log('[CLUSTER-DEBUG] markersForAllCells FINAL:', this.markersForAllCells.length);

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
      const response = await fetch(`${API_BASE_URL}/api/bandsByBounds`, {
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
    const activeTypes = Object.entries(this.filterForPreOrigin)
      .filter(([_, isActive]) => isActive)
      .map(([key]) => key);

    try {
      const response = await fetch(`${API_BASE_URL}/api/preorigin`);
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
  if (!filtrosPlanes || Object.values(filtrosPlanes).every(v => v === false)) {
    return [];
  }

    try {
      let url = `${API_BASE_URL}/api/planesrf`;
      if (filtrosPlanes.length) {
        url += '?planes=' + filtrosPlanes.join(',');
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al obtener planes RF');

      const rawData = await res.json();

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

      return normalized;
    } catch (err) {
      console.error('❌ Error en fetchRFPlansMarkers:', err);
      return [];
    }
  }

};

