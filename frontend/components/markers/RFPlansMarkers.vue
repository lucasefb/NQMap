<template>
  <div v-if="zoom >= 12">
    <p style="color: white">Markers RF visibles: {{ filteredMarkers.length }}</p>
    <p style="color: white">Zoom actual: {{ zoom }}</p>

    <!-- Marcadores reales -->
    <l-marker
      v-for="(marker, index) in filteredMarkers"
      :key="index"
      :lat-lng="[marker.lat, marker.lng]"
      :icon="iconForRF()"
      ref="markerRefs"
      ref-in-for
    >
      <l-tooltip>
        <div>
          <strong>{{ marker.nombre || 'Sin nombre' }}</strong><br />
          {{ marker.descripcion || 'Sin descripción' }}<br />
          <small>{{ marker.fecha || 'Sin fecha' }}</small>
        </div>
      </l-tooltip>
    </l-marker>
  </div>
</template>

<script>
export default {
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
  props: {
    markers: Array,
    zoom: Number,
    filters: Object,
  },
  methods: {
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
  },
  computed: {
    filteredMarkers() {
      // Mostrar solo los válidos
      return this.markers.filter(
        m =>
          typeof m.lat === 'number' &&
          typeof m.lng === 'number' &&
          m.nombre
      );
    },
  },
};
</script>
