<template>
  <div>
    <Tooltip ref="tooltipRef" extraClass="preorigin-tooltip" />
  </div>
</template>

<script>
import Tooltip from '~/components/Tooltip.vue';

export default {
  name: 'PreOriginCanvasMarkers',
  components: { Tooltip },
  props: {
    markers: { type: Array, default: () => [] },
    zoom: { type: Number, required: true },
    mapInstance: { type: Object, default: null }
  },
  data() {
    return {
      canvasLayer: null,
      isInitialized: false,
      activePopupKey: null
    };
  },
  computed: {
    shouldRender() { return this.zoom >= 12 && this.markers.length > 0; }
  },
  watch: {
    shouldRender(val) {
      if (val && this.mapInstance && !this.isInitialized) this.initialize();
      else if (!val && this.canvasLayer) this.removeLayer();
    },
    markers(m) { if (this.canvasLayer) this.canvasLayer.setOrigins(m); }
  },
  methods: {
    buildOriginKey(marker) {
      return [marker.tipo, marker.sitio, marker.lat, marker.lng, marker.fecha].join('|');
    },
    buildOriginHtml(marker) {
      return `
        <div class="preorigin-tooltip-inner">
          <div><b>Tipo:</b> ${marker.tipo || ''}</div>
          <div><b>Sitio:</b> ${marker.sitio || ''}</div>
          <div><b>Latitud:</b> ${marker.lat || ''}</div>
          <div><b>Longitud:</b> ${marker.lng || ''}</div>
          <div><b>Descripción:</b> ${marker.descripcion || ''}</div>
          <div><b>Fecha:</b> ${(() => {
            const f = marker.fecha ? marker.fecha.slice(0,10) : '';
            if (!f) return '';
            const [y,m,d] = f.split('-');
            return `${d}/${m}/${y}`;
          })()}</div>
        </div>`;
    },
    showTooltip(origin, ev) {
      const key = this.buildOriginKey(origin);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildOriginHtml(origin);
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForOrigin(origin) {
      if (!this.mapInstance) return;
      const html = this.buildOriginHtml(origin);
      this.activePopupKey = this.buildOriginKey(origin);
      this.$refs.tooltipRef?.openPopupAt([origin.lat, origin.lng], this.mapInstance, html);
      this.mapInstance.once('popupclose', () => {
        this.activePopupKey = null;
      });
    },
    hideTooltip() {
      // Siempre ocultar el tooltip al salir, incluso si hay un popup activo
      this.$refs.tooltipRef?.hide();
    },
    async initialize() {
      if (this.isInitialized || !process.client) return;
      if (!window.L || !this.mapInstance) { setTimeout(this.initialize, 100); return; }
      try {
        const { createPreOriginCanvasLayer } = await import('../methods/PreOriginCanvasLayer.js');
        const Cls = createPreOriginCanvasLayer();
        if (!Cls) return;
        this.canvasLayer = new Cls();
        this.canvasLayer.on('originover', e => this.showTooltip(e.origin, e.event));
        this.canvasLayer.on('originout', () => this.hideTooltip());
        this.canvasLayer.on('originclick', e => this.openPopupForOrigin(e.origin));
        this.mapInstance.addLayer(this.canvasLayer);
        this.canvasLayer.setOrigins(this.markers);
        this.isInitialized = true;
      } catch (err) { console.error('[PreOriginCanvasMarkers] init err', err); }
    },
    removeLayer() {
      if (this.canvasLayer && this.mapInstance?.hasLayer(this.canvasLayer)) this.mapInstance.removeLayer(this.canvasLayer);
      this.canvasLayer = null; this.isInitialized = false;
    }
  },
  beforeDestroy() { this.removeLayer(); }
};
</script>
