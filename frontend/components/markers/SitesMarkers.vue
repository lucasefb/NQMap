<template>
  <div>
    <l-marker v-for="marker in markersForAllCells"
      :key="marker.isCluster ? `cluster_${marker.cluster_id}_${marker.solution}` : `site_${marker.nombre}_${marker.lat}_${marker.lng}_${marker.solution}`"
      :lat-lng="[marker.lat, marker.lng]" :icon="cellidIcon(marker)" @click="handleClick(marker)">
      <l-popup v-if="!marker.isCluster">
        <div class="tooltip-content">{{ marker.nombre }}</div>
      </l-popup>
    </l-marker>
  </div>
</template>

<script>
const iconCache = {};

export default {
  props: {
    markersForAllCells: {
      type: Array,
      required: true,
    },
    mapInstance: {
      type: Object,
      required: true,
    },
    zoom: {
      type: Number,
      required: true,
    },
  },
  methods: {
    getClusterKey(marker) {
      if (marker.isCluster) {
        // Validar propiedades requeridas y loggear si falta alguna
        let missingProps = [];
        if (marker.cluster_id === undefined) missingProps.push('cluster_id');
        if (marker.lat === undefined) missingProps.push('lat');
        if (marker.lng === undefined) missingProps.push('lng');
        if (marker.count === undefined) missingProps.push('count');
        // childMarkerIds es opcional pero mejora unicidad
        if (missingProps.length > 0) {
          console.error('[KEY-DEBUG] Cluster marker missing properties:', missingProps, marker);
        }
        // Serializar filtros activos
        const filters = JSON.stringify(this.$parent && this.$parent.filterForSolution ? this.$parent.filterForSolution : {});
        const clusterId = marker.cluster_id !== undefined ? marker.cluster_id : 'single';
        const lng = marker.lng !== undefined ? marker.lng : '-';
        const lat = marker.lat !== undefined ? marker.lat : '-';
        const zoom = this.zoom !== undefined ? this.zoom : '-';
        const count = marker.count !== undefined ? marker.count : '-';
        // Crear hash simple de IDs hijos si existen
        let idsHash = '';
        if (Array.isArray(marker.childMarkerIds) && marker.childMarkerIds.length > 0) {
          idsHash = marker.childMarkerIds.sort().join('-');
        }
        const key = ['cluster', clusterId, lng, lat, zoom, filters, count, idsHash].join('_');
        // Guardar historial de claves para detectar duplicados
        if (!this._generatedClusterKeys) this._generatedClusterKeys = new Set();
        if (this._generatedClusterKeys.has(key)) {
          console.warn('[KEY-DEBUG] Duplicate cluster key detected:', key, marker);
        } else {
          this._generatedClusterKeys.add(key);
        }
        console.log('[KEY-DEBUG] cluster key:', key, marker);
        return key;
      } else {
        // Para sitios individuales usar nombre o lat_lng
        return marker.nombre || `${marker.lat}_${marker.lng}`;
      }
    },

    cellidIcon(marker) {
      if (marker.isCluster) {
        return this.clusterIcon(marker.count || 1, marker.solution);
      }
      const cacheKey = marker.nombre;
      if (!iconCache[cacheKey]) {
        iconCache[cacheKey] = this.iconForSitesNames(marker.nombre);
      }
      return iconCache[cacheKey];
    },
    clusterIcon(count, solution) {
      let size = 45;
      if (count >= 100) {
        size = 65;
      } else if (count >= 50) {
        size = 55;
      } else if (count === 1) {
        size = 35;
      }

      const colorMap = {
        'MACRO': 'rgba(25, 118, 210, 0.8)',
        'SUBTE': '#D32F2F',
        'SITIO_MICRO': '#D32F2F',
        'ESTADIOS': '#388E3C',
        'QUATRA': '#F57C00',
        'NBIOT': '#7B1FA2',
        'WICAP': '#0097A7',
        'AIRSCALE INDOOR': '#FBC02D',
        'COW': '#5D4037',
        'BDA': '#0288D1',
        'FEMTO': '#C2185B',
        'DEFAULT': '#9E9E9E',
      };

      const upperSolution = solution?.toUpperCase() || 'DEFAULT';
      const bgColor = colorMap[upperSolution] || colorMap['DEFAULT'];
      const ringColor = bgColor.replace(')', ', 0.3)').replace('rgb', 'rgba');

      return L.divIcon({
        html: `
      <div style="
        width: ${size * 0.77}px;
        height: ${size * 0.77}px;
        border-radius: 50%;
        background: ${ringColor};
        display: flex;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          width: ${size * 0.65}px;
          height: ${size * 0.65}px;
          border-radius: 50%;
          background: ${bgColor};
          color: white;
          font-weight: bold;
          font-size: ${Math.floor(size / 4)}px;
          display: flex;
          justify-content: center;
          align-items: center;
        ">
          ${count}
        </div>
      </div>
    `,
        className: '',
        iconSize: [size, size],
      });
    },
    iconForSitesNames(name) {
        if (L) {
            return L.divIcon({
                html: `<div style="background-color: yellow; width: 50px; height: 15px; display: flex; align-items: center; justify-content: center; color: black; text-align: center; font-size: 12px;">${name}</div>`,
                iconSize: [40, 40],
                className: 'custom-icon-class'
            });
        } else {
            console.error('Leaflet is not available!');
            return null;
        }
    },
    handleClick(marker) {
      if (marker.isCluster && this.mapInstance) {
        const newZoom = Math.min(this.zoom + 2, 18);
        this.mapInstance.setView([marker.lat, marker.lng], newZoom);
      }
    },
  },
};
</script>

<style scoped>
.cluster-icon-visual {
  color: rgba(25, 118, 210, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s ease;
}

.cluster-icon-visual:hover {
  transform: scale(1.1);
  cursor: pointer;
}
</style>