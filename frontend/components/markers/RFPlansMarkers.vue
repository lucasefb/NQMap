<template>
  <div>
    <l-marker v-for="marker in filteredMarkers"
      :key="marker.isCluster ? `cluster_${marker.cluster_id}_${marker.tipo}` : `rfplan_${marker.nombre}_${marker.lat}_${marker.lng}_${marker.tipo}`"
      :lat-lng="[marker.lat, marker.lng]" 
      :icon="rfPlanIcon(marker)" 
      @click="handleClick(marker)"
      @l-mouseover="showTooltip(marker)"
      @l-mouseout="hideTooltip"
      @l-mousedown="hideTooltip"
    >
      <l-popup v-if="!marker.isCluster">
        <div class="tooltip-content">
          <strong>{{ marker.nombre || 'Sin nombre' }}</strong><br />
          <template v-if="marker.descripcion">
            {{ marker.descripcion }}<br />
          </template>
          <small>{{ (marker.fecha || '').slice(0,10) || 'Sin fecha' }}</small>
        </div>
      </l-popup>
      <Tooltip ref="rfTooltipRef" extraClass="rfplans-tooltip" />
    </l-marker>
  </div>
</template>

<script>
import Tooltip from '~/components/Tooltip.vue';

export default {
  components: {
    Tooltip
  },
  watch: {
    markers(newVal) {
      // Limpieza manual de layers si markers queda vacío y existen refs
      if (Array.isArray(newVal) && newVal.length === 0 && this.$refs && this.$refs.markerRefs) {
        this.$refs.markerRefs.forEach(marker => {
          if (marker && marker.mapObject) {
            marker.mapObject.remove();
          }
        });
      }
    }
  },
  mounted() {
  },
  props: {
    markers: {
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
        let missingProps = [];
        if (marker.cluster_id === undefined) missingProps.push('cluster_id');
        if (marker.lat === undefined) missingProps.push('lat');
        if (marker.lng === undefined) missingProps.push('lng');
        if (marker.count === undefined) missingProps.push('count');
        
        if (missingProps.length > 0) {
          console.error('[RF-KEY-DEBUG] Cluster marker missing properties:', missingProps, marker);
        }
        
        const filters = JSON.stringify(this.$parent && this.$parent.filterForRFPlans ? this.$parent.filterForRFPlans : {});
        const clusterId = marker.cluster_id !== undefined ? marker.cluster_id : 'single';
        const lng = marker.lng !== undefined ? marker.lng : '-';
        const lat = marker.lat !== undefined ? marker.lat : '-';
        const zoom = this.zoom !== undefined ? this.zoom : '-';
        const count = marker.count !== undefined ? marker.count : '-';
        
        const key = ['rfcluster', clusterId, lng, lat, zoom, filters, count].join('_');
        return key;
      } else {
        return marker.nombre || `${marker.lat}_${marker.lng}`;
      }
    },

    rfPlanIcon(marker) {
      if (marker.isCluster) {
        return this.clusterIcon(marker.count || 1, marker.tipo);
      }
      return this.iconForRF();
    },

    clusterIcon(count, tipo) {
      let size = 45;
      if (count >= 100) {
        size = 65;
      } else if (count >= 50) {
        size = 55;
      } else if (count === 1) {
        size = 35;
      }

      const colorMap = {
        // RF Plans específicos
        'Expansiones 4G': '#FF9800', // Naranja para 4G/LTE
        'Expansiones 5G': '#9C27B0', // Morado para 5G
        // Pre-Origin (para futura implementación)
        'Nuevo_Sitio': '#2196F3',
        'Nuevo_Anillo': '#4CAF50', 
        'Expansion_LTE': '#FF9800',
        'Expansion_NR': '#9C27B0',
        'Nuevo_Sector': '#F44336',
        'Expansion_Multiplexacion': '#00BCD4',
        'Punto_de_Interes_Indoor': '#FFC107',
        // Fallbacks
        'RF_PLAN': '#E91E63',
        'DEFAULT': '#9E9E9E',
      };

      const upperTipo = tipo?.toUpperCase() || 'DEFAULT';
      const bgColor = colorMap[tipo] || colorMap['DEFAULT'];
      const ringColor = bgColor + '4D'; // Agregar transparencia

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

    iconForRF() {
      const scaleFactor = (zoom) => {
        const minZoom = 12;
        const maxZoom = 18;
        const minSize = 0.1;
        const maxSize = 2;
        return Math.max(minSize, Math.min(maxSize, (zoom - minZoom) / (maxZoom - minZoom) * (maxSize - minSize) + minSize));
      };
      const scaledSize = 75 * scaleFactor(this.zoom);
      const scaledBorder = 7 * scaleFactor(this.zoom);

      return L.divIcon({
        html: `<div style="
          width: ${scaledSize}px;
          height: ${scaledSize}px;
          opacity: 0.8;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 128, 255, 1) 30%, rgba(0, 128, 255, 0) 100%);
          border: ${scaledBorder}px solid rgba(255, 0, 0, 0.8);
        "></div>`,
        iconAnchor: [scaledSize / 2, scaledSize / 2],
        className: 'custom-icon-class',
      });
    },

    handleClick(marker) {
      if (marker.isCluster && this.mapInstance) {
        const newZoom = Math.min(this.zoom + 2, 18);
        this.mapInstance.setView([marker.lat, marker.lng], newZoom);
      }
    },
    showTooltip(marker, ev) {
      let html;
      if (marker.isCluster) {
        html = `
          <div class="rfplans-tooltip-inner">
            <div><b>Cluster de RF Plans</b></div>
            <div><b>Cantidad:</b> ${marker.count || 1} planes</div>
            <div><b>Tipo:</b> ${marker.tipo || 'RF Plans'}</div>
            <div><small>Haz click para hacer zoom</small></div>
          </div>`;
      } else {
        html = `
          <div class="rfplans-tooltip-inner">
            <div><b>Tipo:</b> ${marker.nombre || ''}</div>
            <div><b>Latitud:</b> ${marker.lat || ''}</div>
            <div><b>Longitud:</b> ${marker.lng || ''}</div>
            <div><b>Estado del Plan:</b> ${marker.fecha || ''}</div>
          </div>`;
      }
      this.$refs.rfTooltipRef?.show(html, ev);
    },
    hideTooltip() {
      if (!this.$refs.rfTooltipRef?.pinned) {
        this.$refs.rfTooltipRef?.hide();
      }
    },
  },
  computed: {
    filteredMarkers() {
      // Mostrar todos los marcadores válidos (clusters e individuales)
      return this.markers.filter(
        m =>
          typeof m.lat === 'number' &&
          typeof m.lng === 'number' &&
          (m.nombre || m.isCluster)
      );
    },
  },
};
</script>

<style scoped>
.leaflet-tooltip {
  max-width: 300px !important;
  white-space: normal;
}

.cluster-icon-visual {
  color: rgba(233, 30, 99, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s ease;
}

.cluster-icon-visual:hover {
  transform: scale(1.1);
  cursor: pointer;
}

.tooltip-content {
  font-size: 14px;
  line-height: 1.4;
}

.rfplans-tooltip-inner {
  font-size: 13px;
  line-height: 1.3;
}

.rfplans-tooltip-inner small {
  color: #666;
  font-style: italic;
}
</style>
