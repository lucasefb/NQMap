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
      activePopupKey: null,
      currentPopup: null,
      _onZoomEnd: null
    };
  },
  computed: {
    shouldRender() { return this.zoom >= 12 && this.markers.length > 0; }
  },
  watch: {
    shouldRender(val) {
      if (val && this.mapInstance && !this.isInitialized) {
        this.initialize();
      } else if (!val && this.canvasLayer) {
        this.removeLayer();
      }
      // Si dejamos de renderizar, ocultar tooltip y cerrar popup
      if (!val) {
        this.hideTooltip();
        if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
        if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
        this.activePopupKey = null;
      }
    },
    markers(m) {
      if (this.canvasLayer) this.canvasLayer.setOrigins(m);
      // Si el filtro se desactiva (sin marcadores), cerrar popup y ocultar tooltip
      if (!m || m.length === 0) {
        this.hideTooltip();
        if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
        if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
        this.activePopupKey = null;
      }
    },
    // Si cambia el zoom por debajo del umbral, ocultar tooltip
    zoom(newZoom) {
      if (newZoom < 12) {
        this.hideTooltip();
        // Cerrar cualquier popup abierto al alejar demasiado
        if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
        if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
        this.activePopupKey = null;
      }
    }
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
      // No mostrar si estamos por debajo del umbral de zoom
      if (this.zoom < 12) { this.$refs.tooltipRef?.hide(); return; }
      const key = this.buildOriginKey(origin);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildOriginHtml(origin);
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForOrigin(origin) {
      if (!this.mapInstance) return;
      const html = this.buildOriginHtml(origin);
      this.activePopupKey = this.buildOriginKey(origin);
      const popup = this.$refs.tooltipRef?.openPopupAt([origin.lat, origin.lng], this.mapInstance, html);
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
        // Listener para cerrar tooltip/popup al alejar por debajo del umbral
        this._onZoomEnd = () => {
          const z = (this.mapInstance && this.mapInstance.getZoom) ? this.mapInstance.getZoom() : this.zoom;
          if (z < 12) {
            this.hideTooltip();
            if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
            if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
            this.activePopupKey = null;
          }
        };
        if (this.mapInstance && this.mapInstance.on) {
          this.mapInstance.on('zoomend', this._onZoomEnd);
        }
        this.isInitialized = true;
      } catch (err) { console.error('[PreOriginCanvasMarkers] init err', err); }
    },
    removeLayer() {
      if (this.canvasLayer && this.mapInstance?.hasLayer(this.canvasLayer)) this.mapInstance.removeLayer(this.canvasLayer);
      // Ocultar tooltip y cerrar popup si existieran
      this.hideTooltip();
      if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
      if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
      this.activePopupKey = null;
      // Remover listener de zoom
      if (this._onZoomEnd && this.mapInstance?.off) {
        try { this.mapInstance.off('zoomend', this._onZoomEnd); } catch (_) {}
      }
      this._onZoomEnd = null;
      this.canvasLayer = null; this.isInitialized = false;
    }
  },
  beforeDestroy() { this.removeLayer(); }
};
</script>
