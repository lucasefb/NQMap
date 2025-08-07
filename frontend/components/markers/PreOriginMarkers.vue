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
      <Tooltip ref="LTooltipRef" extraClass="preorigin-tooltip" />
    </l-marker>
  </div>
</template>

<script>
import Tooltip from '~/components/Tooltip.vue';

export default {
  components: {
    Tooltip
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
    showTooltip(marker, ev) {
      const html = `
        <div class="preorigin-tooltip-inner">
          <div><b>Tipo:</b> ${marker.tipo || ''}</div>
          <div><b>Sitio:</b> ${marker.sitio || ''}</div>
          <div><b>Latitud:</b> ${marker.lat || ''}</div>
          <div><b>Longitud:</b> ${marker.lng || ''}</div>
          <div><b>Descripción:</b> ${marker.descripcion || ''}</div>
          <div><b>Fecha:</b> ${(() => {
            const f = marker.fecha ? marker.fecha.slice(0,10) : '';
            if (!f) return '';
            const [y, m, d] = f.split('-');
            return `${d}/${m}/${y}`;
          })()}</div>
        </div>`;
      this.$refs.LTooltipRef?.show(html, ev);
      this.$refs.LTooltipRef?.pin();
    },
    hideTooltip() {
      if (!this.$refs.LTooltipRef?.pinned) {
        this.$refs.LTooltipRef?.hide();
      }
    }
  }
};
</script>

