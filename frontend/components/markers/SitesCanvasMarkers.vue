<template>
  <div>
    <!-- optional tooltip can be added here -->
  </div>
</template>

<script>
export default {
  name: 'SitesCanvasMarkers',
  props: {
    markersForAllCells: { type: Array, default: () => [] },
    zoom: { type: Number, required: true },
    mapInstance: { type: Object, required: true }
  },
  data() {
    return { layer: null, ready: false };
  },
  watch: {
    markersForAllCells: {
      handler(val) { if (this.layer) this.layer.setSites(val); }, deep: true
    },
    zoom() { /* canvas redraw handled internally */ }
  },
  mounted() { this.init(); },
  beforeDestroy() { this.cleanup(); },
  methods: {
    async init() {
      if (!this.mapInstance || !process.client) return;
      const { createSitesCanvasLayer } = await import('../methods/SitesCanvasLayer.js');
      const Cls = createSitesCanvasLayer();
      if (!Cls) return;
      this.layer = new Cls();
      this.layer.setSites(this.markersForAllCells);
      this.layer.on('siteclick', e => this.$emit('siteclick', e.site));
      this.layer.on('siteover', e => this.$emit('siteover', e.site));
      this.layer.on('siteout', e => this.$emit('siteout', e.site));
      this.mapInstance.addLayer(this.layer);
      this.ready = true;
    },
    cleanup() {
      if (this.layer && this.mapInstance?.hasLayer(this.layer)) this.mapInstance.removeLayer(this.layer);
      this.layer = null;
    }
  }
};
</script>
