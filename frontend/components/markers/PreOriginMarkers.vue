<template>
  <div v-if="zoom >= 12">
   <l-marker
      v-for="(marker, index) in markers"
      :key="index"
      :lat-lng="[marker.lat, marker.lng]"
      :icon="iconForOrigin(marker)"
      ref="markerRefs"
      ref-in-for
      @l-mouseover="showTooltip(marker)"
      @l-mouseout="hideTooltip"
      @l-mousedown="hideTooltip"
    >
      <l-tooltip>
        <div>
          <strong>{{ marker.sitio || 'Sin nombre' }}</strong><br />
          {{ marker.descripcion || 'Sin descripción' }}<br />
          <small>{{ (marker.fecha || '').slice(0,10) || 'Sin fecha' }}</small>
        </div>
      </l-tooltip>
      <PreOriginTooltip ref="LTooltipRef" />
    </l-marker>
  </div>
</template>

<script>
import PreOriginTooltip from './PreOriginTooltip.vue';

export default {
  components: {
    PreOriginTooltip
  },
  props: {
    markers: Array,
    zoom: Number
  },
  methods: {
    iconForOrigin() {
      const scaleFactor = (zoom) => {
        const minZoom = 12;
        const maxZoom = 18;
        const minSize = 0.1;
        const maxSize = 2;
        return Math.max(minSize, Math.min(maxSize, (zoom - minZoom) / (maxZoom - minZoom) * (maxSize - minSize) + minSize));
      };

      const createIcon = () => {
        const scaledSize = 150 * scaleFactor(this.zoom);

        if (L) {
          return L.divIcon({
            html: `<div style="
              width: ${scaledSize}px; 
              height: ${scaledSize}px;
              opacity: 0.4;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255,165,0,1) 30%, rgba(255,165,0,0) 100%);
              display: flex; 
              align-items: center; 
              justify-content: center;
              text-align: center;
            "></div>`,
            iconAnchor: [scaledSize / 2, scaledSize / 2],
            className: 'custom-icon-class'
          });
        } else {
          console.error('Leaflet is not available!');
          return null;
        }
      };

      return createIcon();
    },
    showTooltip(marker) {
      this.$refs.LTooltipRef?.showTooltip(marker);
    },
    hideTooltip() {
      this.$refs.LTooltipRef?.hideTooltip();
    }
  }
};
</script>

