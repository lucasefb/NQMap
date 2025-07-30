<template>
  <div>
    <BandsTooltip ref="tooltipRef" />
  </div>
</template>

<script>
import BandsTooltip from './BandsTooltip.vue';

// Versión simplificada que evita problemas de timing
export default {
  name: 'BandsSimpleCanvas',
  components: {
    BandsTooltip,
  },
  props: {
    markers: {
      type: Array,
      default: () => []
    },
    zoom: {
      type: Number,
      required: true
    },
    loadCellsWithBigPRB: {
      type: Boolean,
      default: false
    },
    mapInstance: {
      type: Object,
      default: null
    }
  },
  watch: {
    markers: {
      handler(newMarkers) {
        console.log('[BandsSimpleCanvas] markers changed:', newMarkers.length, newMarkers.slice(0, 2));
        if (this.canvasLayer && this.shouldRender) {
          this.canvasLayer.setBands(newMarkers);
          this.canvasLayer._redraw();
        }
      }
    }
  },
  data() {
    return {
      canvasLayer: null,
      isInitialized: false
    };
  },
  computed: {
    shouldRender() {
      console.log('[BandsSimpleCanvas] shouldRender changed:', this.zoom >= 14 && this.markers.length > 0, 'zoom:', this.zoom, 'markers:', this.markers.length);
      return this.zoom >= 14 && this.markers.length > 0;
    }
  },
  mounted() {
    console.log('[BandsSimpleCanvas] mounted, props:', {
      markers: this.markers,
      zoom: this.zoom,
      mapInstance: !!this.mapInstance
    });
  },
  watch: {
    shouldRender(newVal) {
      console.log('[BandsSimpleCanvas] shouldRender changed:', newVal, 'zoom:', this.zoom, 'markers:', this.markers.length);
      if (newVal && this.mapInstance) {
        if (this.isInitialized && this.canvasLayer) {
          this.canvasLayer.setBands(this.markers);
          this.canvasLayer.options.loadCellsWithBigPRB = this.loadCellsWithBigPRB;
          this.canvasLayer._redraw();
        } else {
          console.log('[BandsSimpleCanvas] Initializing canvas layer with markers:', this.markers.length, this.markers.slice(0,2));
          this.initialize();
        }
      } else if (!newVal && this.canvasLayer) {
        this.removeLayer();
        this.isInitialized = false;
      }
    },
    markers(newMarkers) {
      if (this.canvasLayer && newMarkers) {
        this.canvasLayer.setBands(newMarkers);
      }
    },
    loadCellsWithBigPRB(newValue) {
      if (this.canvasLayer && this.shouldRender) {
        this.canvasLayer.options.loadCellsWithBigPRB = newValue;
        this.canvasLayer._redraw();
      }
    }
  },
  methods: {
    async initialize() {
  console.log('[BandsSimpleCanvas] initialize() called');
      if (this.isInitialized || !process.client) return;
      if (!window.L || !this.mapInstance) {
        setTimeout(() => this.initialize(), 100);
        return;
      }
      try {
        const { createBandsCanvasLayer } = await import('../methods/BandsCanvasLayer.js');
        const BandsCanvasLayerClass = createBandsCanvasLayer();
        if (!BandsCanvasLayerClass) return;
        this.canvasLayer = new BandsCanvasLayerClass({
          loadCellsWithBigPRB: this.loadCellsWithBigPRB
        });
        this.canvasLayer.on('bandover', (e) => {
          if (this.$refs.tooltipRef) {
            this.$refs.tooltipRef.showTooltip(e.band);
          }
        });
        this.canvasLayer.on('bandout', () => {
          if (this.$refs.tooltipRef) {
            this.$refs.tooltipRef.hideTooltip();
          }
        });
        this.mapInstance.addLayer(this.canvasLayer);
        if (this.markers.length > 0) {
          this.canvasLayer.setBands(this.markers);
        }
        this.isInitialized = true;
      } catch (error) {
        // Silenciar error
      }
    },
    removeLayer() {
      if (this.canvasLayer && this.mapInstance && this.mapInstance.hasLayer(this.canvasLayer)) {
        this.mapInstance.removeLayer(this.canvasLayer);
      }
    }
  },
  beforeDestroy() {
    this.removeLayer();
    this.canvasLayer = null;
  }
};
</script>
