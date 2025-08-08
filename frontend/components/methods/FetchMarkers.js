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
      }
      this.markersForAllCells = [];
      this.markersForAllCells = normalizedMarkers;

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

  async fetchPreOriginMarkers(filtrosPreOrigin = []) {
    if (!filtrosPreOrigin || Object.values(filtrosPreOrigin).every(v => v === false)) {
      this.preOriginMarkers = [];
      return [];
    }

    if (!this.mapInstance) {
      console.log('fetchPreOriginMarkers evitado por falta de mapInstance');
      return [];
    }

    this.zoom = this.mapInstance.getZoom();
    const bounds = this.mapInstance.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    // Convertir filtros a array de tipos activos
    const activeTypes = Object.entries(filtrosPreOrigin)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (activeTypes.length === 0) {
      this.preOriginMarkers = [];
      return [];
    }

    try {
      const params = {
        neLat: ne.lat,
        neLng: ne.lng,
        swLat: sw.lat,
        swLng: sw.lng,
        zoom: this.zoom,
        types: activeTypes.join(',')
      };

      // Construir URL con parámetros
      const url = new URL(`${API_BASE_URL}/api/preOriginByBounds`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      const normalizedMarkers = data.map(item => {
        if (!item?.geometry?.coordinates || !item?.properties) return null;

        const [lng, lat] = item.geometry.coordinates;

        if (item.properties.cluster) {
          return {
            isCluster: true,
            cluster_id: item.properties.cluster_id,
            nombre: item.properties.nombre || 'Pre-Origin',
            lat,
            lng,
            count: item.properties.point_count,
            tipo: item.properties.tipo || 'PRE_ORIGIN',
          };
        } else {
          return {
            isCluster: false,
            nombre: item.properties.nombre,
            lat,
            lng,
            tipo: item.properties.tipo,
            sitio: item.properties.sitio,
            fecha: item.properties.fecha,
            descripcion: item.properties.descripcion,
          };
        }
      }).filter(Boolean);

      this.preOriginMarkers = normalizedMarkers;
      return normalizedMarkers;
    } catch (err) {
      // Si es un 404, el endpoint no existe - usar fallback silenciosamente
      if (err.response && err.response.status === 404) {
        console.log('🔄 Endpoint /api/preOriginByBounds no disponible, usando clusterización del lado del cliente');
        return this.fetchPreOriginMarkersLegacy(filtrosPreOrigin);
      }
      // Para otros errores, mostrar el error y usar fallback
      console.error('❌ Error en fetchPreOriginMarkers:', err.message);
      return this.fetchPreOriginMarkersLegacy(filtrosPreOrigin);
    }
  },

  // Método legacy como fallback con clusterización del lado del cliente para Pre-Origin
  async fetchPreOriginMarkersLegacy(filtrosPreOrigin = []) {
    try {
      // Convertir objeto de filtros a array de tipos activos si es necesario
      let activeTypes = [];
      if (Array.isArray(filtrosPreOrigin)) {
        activeTypes = filtrosPreOrigin;
      } else if (typeof filtrosPreOrigin === 'object') {
        activeTypes = Object.entries(filtrosPreOrigin)
          .filter(([_, value]) => value)
          .map(([key]) => key);
      }

      const response = await fetch(`${API_BASE_URL}/api/preorigin`);
      const rawData = await response.json();
      console.log('[Pre-Origin] Raw data received');

      // Mapeo explícito de filtro frontend → clave backend
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
            isCluster: false,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            tipo: typeKey, // mantiene el mismo nombre que los filtros
            sitio,
            fecha,
            descripcion,
            nombre: sitio || typeKey
          });
        });
      }

      console.log('[Pre-Origin] Normalized data length:', normalized.length);
      
      // Aplicar clusterización del lado del cliente
      const clusteredData = this.clusterPreOrigin(normalized);
      console.log('[Pre-Origin] Clustered data length:', clusteredData.length);
      
      this.preOriginMarkers = clusteredData;
      return clusteredData;
    } catch (error) {
      console.error('❌ Error en fetchPreOriginMarkersLegacy:', error);
      this.preOriginMarkers = [];
      return [];
    }
  },

  async fetchReclamos() {
    const { CORPO, VIP } = this.corpoVipFilter || {};
    if (!CORPO && !VIP) {
      this.reclamosAll = [];
      this.reclamosMarkers = [];
      return;
    }
    // Esperar a que el mapa esté listo
    if (!this.mapInstance) {
      this.reclamosAll = [];
      this.reclamosMarkers = [];
      return;
    }
    const bounds = this.mapInstance.getBounds();
    const zoom = this.mapInstance.getZoom();
    const tipos = [];
    if (CORPO) tipos.push('CORPO');
    if (VIP) tipos.push('VIP');
    try {
      const res = await this.$axios.$get('/api/reclamosByBounds', {
        params: {
          neLat: bounds.getNorthEast().lat,
          neLng: bounds.getNorthEast().lng,
          swLat: bounds.getSouthWest().lat,
          swLng: bounds.getSouthWest().lng,
          zoom,
          tipos: tipos.join(',')
        }
      });
      this.reclamosAll = Array.isArray(res) ? res : [];
      // Normalizar datos en markers
      const markers = [];
      for (const feature of this.reclamosAll) {
        if (feature.type !== 'Feature' || !feature.geometry) continue;
        const coords = feature.geometry.coordinates;
        if (feature.properties.cluster) {
          // Es un cluster (más de un punto)
          markers.push({
            lat: coords[1],
            lng: coords[0],
            isCluster: true,
            point_count: feature.properties.point_count,
            ...feature.properties
          });
        } else {
          // Punto individual
          markers.push({
            lat: coords[1],
            lng: coords[0],
            ...feature.properties
          });
        }
      }
      this.reclamosMarkers = markers;
    } catch (err) {
      this.reclamosAll = [];
    }
  },

  async fetchRFPlansMarkers(filtrosPlanes = []) {
    if (!filtrosPlanes || Object.values(filtrosPlanes).every(v => v === false)) {
      return [];
    }

    if (!this.mapInstance) {
      console.log('fetchRFPlansMarkers evitado por falta de mapInstance');
      return [];
    }

    this.zoom = this.mapInstance.getZoom();
    const bounds = this.mapInstance.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    // Convertir filtros a array de tipos activos
    const activeTypes = Object.entries(filtrosPlanes)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (activeTypes.length === 0) {
      return [];
    }

    try {
      const params = {
        neLat: ne.lat,
        neLng: ne.lng,
        swLat: sw.lat,
        swLng: sw.lng,
        zoom: this.zoom,
        planes: activeTypes.join(',')
      };

      const response = await this.$axios.$get('/api/rfPlansByBounds', { params });

      const normalizedMarkers = response.map(item => {
        if (!item?.geometry?.coordinates || !item?.properties) return null;

        const [lng, lat] = item.geometry.coordinates;

        if (item.properties.cluster) {
          return {
            isCluster: true,
            cluster_id: item.properties.cluster_id,
            nombre: item.properties.nombre || 'RF Plans',
            lat,
            lng,
            count: item.properties.point_count,
            tipo: item.properties.tipo || 'RF_PLAN',
            fecha: item.properties.fecha,
            descripcion: item.properties.descripcion
          };
        } else {
          return {
            isCluster: false,
            nombre: item.properties.nombre,
            lat,
            lng,
            tipo: item.properties.tipo || 'RF_PLAN',
            fecha: item.properties.fecha,
            descripcion: item.properties.descripcion
          };
        }
      }).filter(Boolean);

      // Chequeo de duplicados en markers normalizados
      const keySet = new Set();
      const duplicates = [];
      for (const marker of normalizedMarkers) {
        let key;
        if (marker.isCluster) {
          key = [marker.cluster_id, marker.lat, marker.lng, marker.tipo, marker.count].join('|');
        } else {
          key = [marker.nombre, marker.lat, marker.lng, marker.tipo].join('|');
        }
        if (keySet.has(key)) {
          duplicates.push({ key, marker });
        } else {
          keySet.add(key);
        }
      }
      
      if (duplicates.length > 0) {
        console.warn('[FetchRFPlansMarkers] Duplicados detectados en markers normalizados:', duplicates);
      }

      return normalizedMarkers;
    } catch (err) {
      // Si es un 404, el endpoint no existe - usar fallback silenciosamente
      if (err.response && err.response.status === 404) {
        console.log('🔄 Endpoint /api/rfPlansByBounds no disponible, usando clusterización del lado del cliente');
        return this.fetchRFPlansMarkersLegacy(filtrosPlanes);
      }
      // Para otros errores, mostrar el error y usar fallback
      console.error('❌ Error en fetchRFPlansMarkers:', err.message);
      return this.fetchRFPlansMarkersLegacy(filtrosPlanes);
    }
  },

  // Método legacy como fallback con clusterización del lado del cliente
  async fetchRFPlansMarkersLegacy(filtrosPlanes = []) {
    try {
      // Convertir objeto de filtros a array de tipos activos si es necesario
      let activeTypes = [];
      if (Array.isArray(filtrosPlanes)) {
        activeTypes = filtrosPlanes;
      } else if (typeof filtrosPlanes === 'object') {
        activeTypes = Object.entries(filtrosPlanes)
          .filter(([_, value]) => value)
          .map(([key]) => {
            // Mapear filtros del frontend a tipos reales del backend
            const filterMapping = {
              'Expansiones_LTE': 'Expansiones 4G',
              'Expansiones_5G': 'Expansiones 5G'
            };
            return filterMapping[key] || key;
          });
      }
      
      let url = `${API_BASE_URL}/api/planesrf`;
      if (activeTypes.length > 0) {
        url += '?planes=' + activeTypes.join(',');
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al obtener planes RF');

      let rawData = await res.json();
      console.log('[RF Plans] Raw data length:', rawData ? rawData.length : 0);
      
      // Si no hay datos con filtros, usar todos los datos disponibles
      if ((!rawData || rawData.length === 0) && activeTypes.length > 0) {
        console.log('[RF Plans] No data with filters, using all available data...');
        const allRes = await fetch(`${API_BASE_URL}/api/planesrf`);
        if (allRes.ok) {
          rawData = await allRes.json();
          console.log('[RF Plans] Using all available data:', rawData.length, 'items');
        }
      }

      const normalized = [];

      for (const arr of rawData) {
        if (!Array.isArray(arr) || arr.length < 3) continue;

        const [_, lat, lng, nombre, fecha, descripcion] = arr;

        if (!lat || !lng) continue;

        normalized.push({
          isCluster: false,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          nombre,
          fecha,
          descripcion,
          tipo: nombre || 'RF_PLAN' // Usar el nombre como tipo (Expansiones 4G, Expansiones 5G)
        });
      }

      console.log('[RF Plans] Normalized data length:', normalized.length);
      
      // Aplicar clusterización del lado del cliente
      const clusteredData = this.clusterRFPlans(normalized);
      console.log('[RF Plans] Clustered data length:', clusteredData.length);
      
      return clusteredData;
    } catch (err) {
      console.error('❌ Error en fetchRFPlansMarkersLegacy:', err);
      return [];
    }
  },

  // Clusterización simple del lado del cliente para Pre-Origin
  clusterPreOrigin(items) {
    if (!this.mapInstance) return items;
    
    const zoom = this.mapInstance.getZoom();
    
    // Solo mostrar elementos individuales en zoom alto (12+) como sitios
    if (zoom >= 12) {
      return items;
    }
    
    // Configurar distancia de clustering según el zoom (muy agresivo para clusters grandes)
    let clusterDistance;
    if (zoom <= 4) clusterDistance = 500; // km - muy agresivo para zooms bajos
    else if (zoom <= 6) clusterDistance = 300; // km
    else if (zoom <= 8) clusterDistance = 150; // km
    else if (zoom <= 10) clusterDistance = 75;  // km
    else if (zoom <= 12) clusterDistance = 35;  // km
    else clusterDistance = 15; // km
    
    const clusters = [];
    const processed = new Set();
    let clusterId = 0;
    
    for (let i = 0; i < items.length; i++) {
      if (processed.has(i)) continue;
      
      const item = items[i];
      const nearbyItems = [item];
      processed.add(i);
      
      // Buscar elementos cercanos del mismo tipo
      for (let j = i + 1; j < items.length; j++) {
        if (processed.has(j)) continue;
        
        const otherItem = items[j];
        // Solo agrupar elementos del mismo tipo
        if (item.tipo !== otherItem.tipo) continue;
        
        const distance = this.calculateDistance(
          item.lat, item.lng,
          otherItem.lat, otherItem.lng
        );
        
        if (distance <= clusterDistance) {
          nearbyItems.push(otherItem);
          processed.add(j);
        }
      }
      
      // Siempre crear cluster, incluso para elementos individuales
      const centerLat = nearbyItems.reduce((sum, p) => sum + p.lat, 0) / nearbyItems.length;
      const centerLng = nearbyItems.reduce((sum, p) => sum + p.lng, 0) / nearbyItems.length;
      
      clusters.push({
        isCluster: true,
        cluster_id: `preorigin_cluster_${clusterId++}`,
        lat: centerLat,
        lng: centerLng,
        count: nearbyItems.length,
        tipo: item.tipo, // Usar el tipo del primer elemento
        nombre: nearbyItems.length === 1 ? item.tipo : `${nearbyItems.length} ${item.tipo}`,
        childItems: nearbyItems
      });
    }
    
    return clusters;
  },

  // Clusterización simple del lado del cliente para RF Plans
  clusterRFPlans(plans) {
    if (!this.mapInstance) return plans;
    
    const zoom = this.mapInstance.getZoom();
    
    // Solo mostrar elementos individuales en zoom alto (12+) como sitios
    if (zoom >= 12) {
      return plans;
    }
    
    // Configurar distancia de clustering según el zoom (muy agresivo para clusters grandes)
    let clusterDistance;
    if (zoom <= 4) clusterDistance = 500; // km - muy agresivo para zooms bajos
    else if (zoom <= 6) clusterDistance = 300; // km
    else if (zoom <= 8) clusterDistance = 150; // km
    else if (zoom <= 10) clusterDistance = 75;  // km
    else if (zoom <= 12) clusterDistance = 35;  // km
    else clusterDistance = 15; // km
    
    const clusters = [];
    const processed = new Set();
    let clusterId = 0;
    
    for (let i = 0; i < plans.length; i++) {
      if (processed.has(i)) continue;
      
      const plan = plans[i];
      const nearbyPlans = [plan];
      processed.add(i);
      
      // Buscar planes cercanos del mismo tipo
      for (let j = i + 1; j < plans.length; j++) {
        if (processed.has(j)) continue;
        
        const otherPlan = plans[j];
        // Solo agrupar planes del mismo tipo (LTE con LTE, 5G con 5G)
        if (plan.tipo !== otherPlan.tipo) continue;
        
        const distance = this.calculateDistance(
          plan.lat, plan.lng,
          otherPlan.lat, otherPlan.lng
        );
        
        if (distance <= clusterDistance) {
          nearbyPlans.push(otherPlan);
          processed.add(j);
        }
      }
      
      // Siempre crear cluster, incluso para elementos individuales
      const centerLat = nearbyPlans.reduce((sum, p) => sum + p.lat, 0) / nearbyPlans.length;
      const centerLng = nearbyPlans.reduce((sum, p) => sum + p.lng, 0) / nearbyPlans.length;
      
      // Como solo agrupamos elementos del mismo tipo, usar el tipo del primer plan
      const tipoCluster = plan.tipo;
      
      clusters.push({
        isCluster: true,
        cluster_id: `rf_cluster_${clusterId++}`,
        lat: centerLat,
        lng: centerLng,
        count: nearbyPlans.length,
        tipo: tipoCluster,
        nombre: nearbyPlans.length === 1 ? nearbyPlans[0].nombre : `${nearbyPlans.length} RF Plans`,
        childPlans: nearbyPlans
      });
    }
    
    return clusters;
  },

  // Calcular distancia entre dos puntos en km (fórmula de Haversine)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Convertir grados a radianes
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
};