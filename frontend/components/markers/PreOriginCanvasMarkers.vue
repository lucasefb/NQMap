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
    shouldRender() {
      // Mostrar siempre que haya marcadores (clusters o individuales)
      return this.markers.length > 0;
    }
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
      console.log('[PreOriginCanvasMarkers] Received markers:', m ? m.length : 0, m);
      if (this.canvasLayer) {
        console.log('[PreOriginCanvasMarkers] Setting markers to canvas layer');
        this.canvasLayer.setOrigins(m);
      }
      // Si el filtro se desactiva (sin marcadores), cerrar popup y ocultar tooltip
      if (!m || m.length === 0) {
        this.hideTooltip();
        if (this.currentPopup) { try { this.currentPopup.remove(); } catch (_) {} this.currentPopup = null; }
        if (this.mapInstance) { try { this.mapInstance.closePopup(); } catch (_) {} }
        this.activePopupKey = null;
      }
    },
    // Los clusters se muestran en todos los zooms
    zoom(newZoom) {
      // Los clusters deben ser visibles en todos los zooms
    }
  },
  methods: {
    buildOriginKey(marker) {
      if (marker.isCluster) {
        return `cluster_${marker.cluster_id}_${marker.tipo}_${marker.count}`;
      }
      return [marker.tipo, marker.sitio, marker.lat, marker.lng, marker.fecha].join('|');
    },
    buildOriginHtml(marker) {
      if (marker.isCluster) {
        if (marker.count === 1) {
          // Para clusters de 1 elemento, mostrar información del elemento
          const item = marker.childItems && marker.childItems[0];
          return `
            <div class="preorigin-tooltip-inner">
              <div><b>Tipo:</b> ${marker.tipo || 'Pre-Origin'}</div>
              <div><b>Sitio:</b> ${item?.sitio || ''}</div>
              <div><b>Latitud:</b> ${marker.lat || ''}</div>
              <div><b>Longitud:</b> ${marker.lng || ''}</div>
              <div><b>Descripción:</b> ${item?.descripcion || ''}</div>
              <div><small>Haz click para hacer zoom</small></div>
            </div>`;
        } else {
          return `
            <div class="preorigin-tooltip-inner">
              <div><b>Cluster de Pre-Origin</b></div>
              <div><b>Tipo:</b> ${marker.tipo || 'Pre-Origin'}</div>
              <div><b>Cantidad:</b> ${marker.count || 1} elementos</div>
              <div><small>Haz click para hacer zoom</small></div>
            </div>`;
        }
      } else {
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
      }
    },
    showTooltip(origin, ev) {
      const key = this.buildOriginKey(origin);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildOriginHtml(origin);
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForOrigin(origin) {
      if (!this.mapInstance) return;
      
      // Si es un cluster, hacer zoom para expandir
      if (origin.isCluster) {
        const newZoom = Math.min(this.zoom + 2, 18);
        this.mapInstance.setView([origin.lat, origin.lng], newZoom);
        return;
      }
      
      // Si es un elemento individual, mostrar popup
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
