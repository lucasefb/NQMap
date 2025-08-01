<template>
  <div>
    <PreOriginTooltip ref="tooltipRef" />
  </div>
</template>

<script>
import PreOriginTooltip from './PreOriginTooltip.vue';

export default {
  name: 'PreOriginCanvasMarkers',
  components: { PreOriginTooltip },
  props: {
    markers: { type: Array, default: () => [] },
    zoom: { type: Number, required: true },
    mapInstance: { type: Object, default: null }
  },
  data() {
    return {
      canvasLayer: null,
      isInitialized: false
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
    async initialize() {
      if (this.isInitialized || !process.client) return;
      if (!window.L || !this.mapInstance) { setTimeout(this.initialize, 100); return; }
      try {
        const { createPreOriginCanvasLayer } = await import('../methods/PreOriginCanvasLayer.js');
        const Cls = createPreOriginCanvasLayer();
        if (!Cls) return;
        this.canvasLayer = new Cls();
        this.canvasLayer.on('originover', e => this.$refs.tooltipRef?.showTooltip(e.origin));
        this.canvasLayer.on('originout', () => this.$refs.tooltipRef?.hideTooltip());
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
