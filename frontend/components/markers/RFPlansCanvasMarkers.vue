<template>
  <div>
    <Tooltip ref="tooltipRef" extraClass="rfplans-tooltip" />
  </div>
</template>

<script>
import Tooltip from '~/components/Tooltip.vue';

export default {
  name: 'RFPlansCanvasMarkers',
  components: {
    Tooltip,
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
      activePopupKey: null,
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
    buildPlanKey(marker) {
      return [marker.nombre, marker.lat, marker.lng, marker.fecha].join('|');
    },
    buildPlanHtml(marker) {
      return `
        <div class="rfplans-tooltip-inner">
          <div><b>Tipo:</b> ${marker.nombre || ''}</div>
          <div><b>Latitud:</b> ${marker.lat || ''}</div>
          <div><b>Longitud:</b> ${marker.lng || ''}</div>
          <div><b>Estado del Plan:</b> ${marker.fecha || ''}</div>
        </div>`;
    },
    showTooltip(marker, ev) {
      const key = this.buildPlanKey(marker);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildPlanHtml(marker);
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForPlan(marker) {
      if (!this.mapInstance) return;
      const html = this.buildPlanHtml(marker);
      this.activePopupKey = this.buildPlanKey(marker);
      const popup = this.$refs.tooltipRef?.openPopupAt([marker.lat, marker.lng], this.mapInstance, html);
      if (popup && popup.once) {
        popup.once('remove', () => {
          this.activePopupKey = null;
        });
      }
    },
    hideTooltip() {
      // Siempre ocultar el tooltip al salir, incluso si hay un popup activo
      this.$refs.tooltipRef?.hide();
    },
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
          this.showTooltip(e.plan, e.event);
        });
        this.canvasLayer.on('planout', () => {
          this.hideTooltip();
        });
        this.canvasLayer.on('planclick', (e) => {
          this.openPopupForPlan(e.plan);
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
