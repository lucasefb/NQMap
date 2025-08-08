<template>
  <div>
    <Tooltip ref="tooltipRef" extraClass="bands-tooltip" />
  </div>
</template>

<script>
import Tooltip from '~/components/Tooltip.vue';

// Versión simplificada que evita problemas de timing
export default {
  name: 'BandsSimpleCanvas',
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
    loadCellsWithBigPRB: {
      type: Boolean,
      default: false
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
      _onZoomEnd: null
    };
  },
  
  computed: {
    shouldRender() {
      return this.zoom >= 14 && this.markers.length > 0;
    }
  },
  
  watch: {
    // Observamos todos los cambios relevantes
    shouldRender(newVal) {
      if (newVal && this.mapInstance && !this.isInitialized) {
        this.initialize();
      } else if (!newVal && this.canvasLayer) {
        this.removeLayer();
      }
      // Si el filtro está activo y el zoom es < 14, cerrar el tooltip
      if (!newVal && this.$refs.tooltipRef && this.loadCellsWithBigPRB) {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] shouldRender=false -> hide tooltip (filter active)'); } catch (_) {}
        }
        this.hideTooltip();
      }
    },
    // Si cambia el zoom y el filtro está activo y baja de 14, cerrar tooltip
    zoom(newZoom) {
      if (this.loadCellsWithBigPRB && newZoom < 14 && this.$refs.tooltipRef) {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] zoom<14 with filter -> hide tooltip'); } catch (_) {}
        }
        this.hideTooltip();
      }
    },
    
    markers(newMarkers) {
      if (this.canvasLayer && newMarkers) {
        this.canvasLayer.setBands(newMarkers);
      }
    },
    
    loadCellsWithBigPRB(newValue) {
      if (this.canvasLayer) {
        this.canvasLayer.options.loadCellsWithBigPRB = newValue;
        this.canvasLayer._redraw();
      }
      // Si el filtro se desactiva con el popup activo, cerrar el popup
      if (this.currentPopup && newValue === false) {
        try { this.currentPopup.remove(); } catch (_) {}
        this.currentPopup = null;
        this.activePopupKey = null;
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] filter deactivated -> currentPopup removed'); } catch (_) {}
        }
      } else if (newValue === false && this.mapInstance) {
        // Cerrar cualquier popup abierto en el mapa si no tenemos referencia
        try { this.mapInstance.closePopup(); } catch (_) {}
        this.activePopupKey = null;
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] filter deactivated -> mapInstance.closePopup()'); } catch (_) {}
        }
      }
      // Siempre ocultar tooltip al desactivar el filtro
      if (newValue === false && this.$refs.tooltipRef) {
        this.hideTooltip();
      }
      // Si el filtro se activa y el zoom es < 14, cerrar el tooltip inmediatamente
      if (newValue === true && this.zoom < 14 && this.$refs.tooltipRef) {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] filter activated with zoom<14 -> hide tooltip'); } catch (_) {}
        }
        this.hideTooltip();
      }
    }
  },
  
  methods: {
    buildBandKey(marker) {
      return [marker.nombre, marker.lat, marker.lng, marker.azimuth, marker.tecnologia, marker.banda].join('|');
    },
    mapTechLabel(tec) {
      const t = (tec || '').trim();
      if (t === 'G') return '2G';
      if (t === 'U') return '3G';
      if (t === 'L') return '4G';
      if (t === 'NR') return '5G';
      return t || tec;
    },
    buildBandHtml(marker) {
      return `
        <div>
          <ul style=list-style-type:none>
            <li><strong>Celda:</strong> ${marker.nombre.replace(/_/g, ' ')}</li>
            <li><strong>Latitud:</strong> ${marker.lat}</li>
            <li><strong>Longitud:</strong> ${marker.lng}</li>
            <li><strong>Banda:</strong> ${marker.banda.replace(/_/g, ' ')}</li>
            <li><strong>Tecnología:</strong> ${this.mapTechLabel(marker.tecnologia)}</li>
            <li><strong>Azimut:</strong> ${marker.azimuth}</li>
            <li><strong>Solución:</strong> ${marker.solution.replace(/_/g, ' ')}</li>
            <li><strong>LOAD:</strong> ${marker.load}</li>
            <li><strong>Desbalanceo:</strong> ${marker.desbalanceo}</li>
            <li><strong>PRB:</strong> ${typeof marker.prb === 'number' ? marker.prb.toFixed(3) : (marker.prb ?? 'N/A')}</li>
          </ul>
        </div>`;
    },
    showTooltip(marker, ev) {
      // No mostrar tooltip si filtro activo y zoom < 14
      if (this.loadCellsWithBigPRB && this.zoom < 14) {
        this.$refs.tooltipRef?.hide();
        return;
      }
      // No mostrar tooltip si el popup de este mismo elemento está activo
      const key = this.buildBandKey(marker);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildBandHtml(marker);
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
        try { console.debug('[BandsCanvasMarkers] showTooltip for', marker.nombre || marker); } catch (_) {}
      }
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForBand(marker) {
      if (!this.mapInstance) return;
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
        try { console.debug('[BandsCanvasMarkers] openPopupForBand for', marker.nombre || marker); } catch (_) {}
      }
      const html = this.buildBandHtml(marker);
      // Guardar clave del elemento cuyo popup está activo
      this.activePopupKey = this.buildBandKey(marker);
      const popup = this.$refs.tooltipRef?.openPopupAt([marker.lat, marker.lng], this.mapInstance, html);
      this.currentPopup = popup || null;
      // Limpiar clave sólo cuando este popup específico se cierra
      if (popup && popup.once) {
        popup.once('remove', () => {
          this.activePopupKey = null;
          this.currentPopup = null;
        });
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] popup opened'); } catch (_) {}
        }
      } else {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          try { console.debug('[BandsCanvasMarkers] popup NOT created'); } catch (_) {}
        }
      }
    },
    hideTooltip() {
      // Siempre ocultar el tooltip al salir, incluso si hay un popup activo
      this.$refs.tooltipRef?.hide();
    },
    async initialize() {
      // Solo inicializamos una vez
      if (this.isInitialized || (typeof process !== 'undefined' && !process.client)) return;
      
      // Verificamos que tengamos todo lo necesario
      if (!window.L || !this.mapInstance) {
        setTimeout(() => this.initialize(), 100);
        return;
      }
      
      try {    
        // Importamos y creamos la capa
        const { createBandsCanvasLayer } = await import('../methods/BandsCanvasLayer.js');
        const BandsCanvasLayerClass = createBandsCanvasLayer();
        
        if (!BandsCanvasLayerClass) {
          console.error('[SimpleCanvas] Error creando la clase');
          return;
        }
        
        // Creamos la instancia
        this.canvasLayer = new BandsCanvasLayerClass({
          loadCellsWithBigPRB: this.loadCellsWithBigPRB
        });
        
        // Eventos
        this.canvasLayer.on('bandover', (e) => {
          if (this.$refs.tooltipRef) {
            this.showTooltip(e.band, e.originalEvent);
          }
        });
        this.canvasLayer.on('bandclick', (e) => {
          this.openPopupForBand(e.band);
        });
        
        this.canvasLayer.on('bandout', () => {
          if (this.$refs.tooltipRef) {
            this.hideTooltip();
          }
        });
        
        // Agregamos al mapa
        this.mapInstance.addLayer(this.canvasLayer);
        
        // Establecemos los marcadores iniciales
        if (this.markers.length > 0) {
          this.canvasLayer.setBands(this.markers);
        }
        
        this.isInitialized = true;
        // Listener: si filtro activo y zoom < 14, ocultar tooltip
        this._onZoomEnd = () => {
          if (this.loadCellsWithBigPRB && this.$refs.tooltipRef) {
            const z = (this.mapInstance && this.mapInstance.getZoom) ? this.mapInstance.getZoom() : this.zoom;
            if (z < 14) {
              if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
                try { console.debug('[BandsCanvasMarkers] zoomend listener -> hide tooltip (filter active, z<14)'); } catch (_) {}
              }
              this.hideTooltip();
            }
          }
        };
        if (this.mapInstance && this.mapInstance.on) {
          this.mapInstance.on('zoomend', this._onZoomEnd);
        }
        
      } catch (error) {
        console.error('[SimpleCanvas] Error:', error);
      }
    },
    
    removeLayer() {
      // Elimina la capa y reinicia flags para permitir futura re-creación
      if (this.canvasLayer && this.mapInstance && this.mapInstance.hasLayer(this.canvasLayer)) {
        this.mapInstance.removeLayer(this.canvasLayer);
      }
      // Limpieza de referencias y flags
      this.canvasLayer = null;
      this.isInitialized = false;
      // Ocultar tooltip si estaba visible
      if (this.$refs.tooltipRef) {
        this.hideTooltip();
      }
      // Cerrar popup si estuviera abierto
      if (this.currentPopup) {
        try { this.currentPopup.remove(); } catch (_) {}
        this.currentPopup = null;
      }
      // Remover listener de zoom
      if (this._onZoomEnd && this.mapInstance && this.mapInstance.off) {
        try { this.mapInstance.off('zoomend', this._onZoomEnd); } catch (_) {}
      }
      this._onZoomEnd = null;
    }
  },
  
  beforeDestroy() {
    this.removeLayer();
    this.canvasLayer = null;
  }
};
</script>