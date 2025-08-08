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
      currentPopup: null,
      _onZoomEnd: null,
    };
  },
  computed: {
    shouldRender() {
      // Mostrar siempre que haya marcadores (clusters o individuales)
      return this.markers.length > 0;
    },
  },
  watch: {
    shouldRender(newVal) {
      if (newVal && this.mapInstance && !this.isInitialized) {
        this.initialize();
      } else if (!newVal && this.canvasLayer) {
        this.removeLayer();
      }
      // Si dejamos de renderizar, ocultar tooltip y cerrar cualquier popup
      if (!newVal) {
        this.hideTooltip();
        if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
        if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
        this.activePopupKey = null;
      }
    },
    markers(newMarkers) {
      console.log('[RFPlansCanvasMarkers] Received markers:', newMarkers ? newMarkers.length : 0, newMarkers);
      if (this.canvasLayer && newMarkers) {
        console.log('[RFPlansCanvasMarkers] Setting markers to canvas layer');
        this.canvasLayer.setRFPlans(newMarkers);
      }
      // Si se limpiaron los marcadores, cerrar popup y ocultar tooltip
      if (!newMarkers || newMarkers.length === 0) {
        this.hideTooltip();
        if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
        if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
        this.activePopupKey = null;
      }
    },
    // Los clusters se muestran en todos los zooms, solo cerrar popups si es necesario
    zoom(newZoom) {
      // Solo cerrar popups para planes individuales en zooms muy bajos si es necesario
      // Los clusters deben ser visibles en todos los zooms
    }
  },
  methods: {
    buildPlanKey(marker) {
      return [marker.nombre, marker.lat, marker.lng, marker.fecha].join('|');
    },
    buildPlanHtml(marker) {
      if (marker.isCluster) {
        if (marker.count === 1) {
          // Para clusters de 1 elemento, mostrar información del elemento
          const item = marker.childPlans && marker.childPlans[0];
          return `
            <div class="rfplans-tooltip-inner">
              <div><b>Tipo:</b> ${marker.tipo || 'RF Plan'}</div>
              <div><b>Nombre:</b> ${item?.nombre || ''}</div>
              <div><b>Latitud:</b> ${marker.lat || ''}</div>
              <div><b>Longitud:</b> ${marker.lng || ''}</div>
              <div><b>Fecha:</b> ${item?.fecha || ''}</div>
              <div><small>Haz click para hacer zoom</small></div>
            </div>`;
        } else {
          return `
            <div class="rfplans-tooltip-inner">
              <div><b>Cluster de RF Plans</b></div>
              <div><b>Cantidad:</b> ${marker.count || 1} planes</div>
              <div><b>Tipo:</b> ${marker.tipo || 'RF Plans'}</div>
              <div><small>Haz click para hacer zoom</small></div>
            </div>`;
        }
      } else {
        return `
          <div class="rfplans-tooltip-inner">
            <div><b>Tipo:</b> ${marker.nombre || ''}</div>
            <div><b>Latitud:</b> ${marker.lat || ''}</div>
            <div><b>Longitud:</b> ${marker.lng || ''}</div>
            <div><b>Estado del Plan:</b> ${marker.fecha || ''}</div>
          </div>`;
      }
    },
    showTooltip(marker, ev) {
      const key = this.buildPlanKey(marker);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildPlanHtml(marker);
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForPlan(marker) {
      if (!this.mapInstance) return;
      
      // Si es un cluster, hacer zoom para expandir
      if (marker.isCluster) {
        const newZoom = Math.min(this.zoom + 2, 18);
        this.mapInstance.setView([marker.lat, marker.lng], newZoom);
        return;
      }
      
      // Si es un plan individual, mostrar popup
      const html = this.buildPlanHtml(marker);
      this.activePopupKey = this.buildPlanKey(marker);
      const popup = this.$refs.tooltipRef?.openPopupAt([marker.lat, marker.lng], this.mapInstance, html);
      this.currentPopup = popup || null;
      if (popup && popup.once) {
        popup.once('remove', () => {
          this.activePopupKey = null;
          this.currentPopup = null;
        });
      } else if (this.mapInstance?.once) {
        this.mapInstance.once('popupclose', () => { this.activePopupKey = null; this.currentPopup = null; });
      }
    },
    hideTooltip() {
      // Siempre ocultar el tooltip al salir, incluso si hay un popup activo
      this.$refs.tooltipRef?.hide();
    },
    async initialize() {
      if (this.isInitialized || (typeof process !== 'undefined' && !process.client)) return;

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
        // Listener: manejar cambios de zoom (clusters visibles en todos los zooms)
        this._onZoomEnd = () => {
          // Los clusters son visibles en todos los zooms, no necesitamos cerrar nada
          // Solo actualizar si es necesario
        };
        if (this.mapInstance && this.mapInstance.on) {
          this.mapInstance.on('zoomend', this._onZoomEnd);
        }
      } catch (err) {
        console.error('[RFPlansCanvasMarkers] init error', err);
      }
    },
    removeLayer() {
      if (this.canvasLayer && this.mapInstance && this.mapInstance.hasLayer(this.canvasLayer)) {
        this.mapInstance.removeLayer(this.canvasLayer);
      }
      // Ocultar tooltip y cerrar popup si existieran
      this.hideTooltip();
      if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
      if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
      this.activePopupKey = null;
      // Remover listener de zoom
      if (this._onZoomEnd && this.mapInstance && this.mapInstance.off) {
        try { this.mapInstance.off('zoomend', this._onZoomEnd); } catch (_) {}
      }
      this._onZoomEnd = null;
      this.canvasLayer = null;
      this.isInitialized = false;
    }
  },
  beforeDestroy() {
    this.removeLayer();
  }
};
</script>
