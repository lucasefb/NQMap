<template>
  <div>
    <RFPlansTooltip ref="tooltipRef" />
  </div>
</template>

<script>
import RFPlansTooltip from './RFPlansTooltip.vue';

export default {
  name: 'RFPlansCanvasMarkers',
  components: {
    RFPlansTooltip,
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
    mapInstance: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      canvasLayer: null,
      isInitialized: false,
    };
  },
  computed: {
    shouldRender() {
      return this.zoom >= 12 && this.markers.length > 0;
    },
  },
  watch: {
    shouldRender(newVal) {
      if (newVal && this.mapInstance && !this.isInitialized) {
        this.initialize();
      } else if (!newVal && this.canvasLayer) {
        this.removeLayer();
      }
    },
    markers(newMarkers) {
      if (this.canvasLayer && newMarkers) {
        this.canvasLayer.setRFPlans(newMarkers);
      }
    }
  },
  methods: {
    async initialize() {
      if (this.isInitialized || !process.client) return;

      if (!window.L || !this.mapInstance) {
        setTimeout(() => this.initialize(), 100);
        return;
      }
      try {
        const { createRFPlansCanvasLayer } = await import('../methods/RFPlansCanvasLayer.js');
        const RFPlansCanvasLayerClass = createRFPlansCanvasLayer();
        if (!RFPlansCanvasLayerClass) return;
        this.canvasLayer = new RFPlansCanvasLayerClass();

        this.canvasLayer.on('planover', (e) => {
          this.$refs.tooltipRef?.showTooltip(e.plan);
        });
        this.canvasLayer.on('planout', () => {
          this.$refs.tooltipRef?.hideTooltip();
        });

        this.mapInstance.addLayer(this.canvasLayer);
        this.canvasLayer.setRFPlans(this.markers);
        this.isInitialized = true;
      } catch (err) {
        console.error('[RFPlansCanvasMarkers] init error', err);
      }
    },
    removeLayer() {
      if (this.canvasLayer && this.mapInstance && this.mapInstance.hasLayer(this.canvasLayer)) {
        this.mapInstance.removeLayer(this.canvasLayer);
      }
      this.canvasLayer = null;
      this.isInitialized = false;
    }
  },
  beforeDestroy() {
    this.removeLayer();
  }
};
</script>
